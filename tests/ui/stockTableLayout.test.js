import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Stock from '../../src/views/StockView.vue'
import ConfirmModal from '../../src/components/modals/ConfirmModal.vue'
import {createTestStore,material} from '../helpers/createStore'

it('retains the inventory columns with a separate date column and contextual lot actions',async()=>{
 const store=createTestStore()
 const mat=material('TABLE',100,{name:'Table milk',lastStockInDate:'2026-10-01',expiryDate:'2099-01-01',lots:[
  {id:'LOT-1',qty:60,initialQty:60,unitCost:1,isInUse:true,receiveDate:'2026-10-01',expiryDate:'2099-01-01'},
  {id:'LOT-2',qty:40,initialQty:40,unitCost:1,isInUse:false,receiveDate:'2026-10-02',expiryDate:'2099-01-02'}
 ]})
 store.materials=[mat];store.menus=[];store.addons=[]
 const wrapper=mount(Stock,{attachTo:document.body})
 const confirmation=mount(ConfirmModal,{attachTo:document.body})
 try {
  expect(wrapper.findAll('.desktop-material-table thead th').map(th=>th.attributes('aria-label')||th.text())).toEqual(['วัตถุดิบ / สินค้า','วันที่','ประเภท','คงเหลือในคลัง','ต้นทุน/หน่วย','สถานะ','การจัดการ'])
  const row=wrapper.get('.desktop-material-table>div>table>tbody>tr')
  expect(row.findAll('td')[0].findAll('time')).toHaveLength(0)
  expect(row.findAll('td')[1].findAll('time')).toHaveLength(2)
  expect(wrapper.get('.menu-directory-list .stock-row-mobile-summary').text()).toContain('คงเหลือ')
  expect(wrapper.get('.menu-directory-list .stock-row-mobile-summary').text()).toContain('ต้นทุน/หน่วย')
  expect(wrapper.get('.menu-directory-list .stock-row-mobile-summary').findAll(':scope > span')).toHaveLength(2)
  expect(wrapper.get('.menu-directory-list [aria-label="รับเข้า Table milk"]').exists()).toBe(true)
  await wrapper.get('.menu-directory-list [aria-label="งานเพิ่มเติม Table milk"]').trigger('click');await flushPromises()
  expect(document.querySelector('#stock-material-actions').textContent).toContain('รับเข้าสต็อก')
  document.querySelector('#stock-material-actions').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flushPromises()
  await wrapper.get('.menu-directory-list [data-material-details="TABLE"]').trigger('click');await flushPromises()
  expect(document.querySelector('#material-details .dialog-frame-panel--sheet')).not.toBeNull()
  expect(document.querySelector('#material-details').textContent).toContain('มูลค่าสต็อกคงเหลือ')
  const toggle=wrapper.get('[data-lot-expand="TABLE"]')
  await toggle.trigger('click');expect(toggle.attributes('aria-expanded')).toBe('true')
  expect(wrapper.get('#stock-lots-TABLE').classes()).toContain('is-expanded')
  await wrapper.get('[data-lot-more="LOT-2"]').trigger('click');await flushPromises()
  const dialog=document.querySelector('#stock-lot-actions-LOT-2')
  expect(dialog.textContent).toContain('ปรับยอดเฉพาะล็อตนี้')
  expect(dialog.textContent).toContain('สลับเป็นล็อตใช้งาน')
  expect(store.materials[0].stock).toBe(100)
  dialog.querySelector('[data-lot-remove="LOT-2"]').click()
  await flushPromises()
  expect(confirmation.text()).toContain('40 g')
  const submit=confirmation.get('[data-confirm-submit]')
  expect(submit.attributes('disabled')).toBeDefined()
  await confirmation.get('input').setValue('ยืนยัน')
  expect(submit.attributes('disabled')).toBeDefined()
  await confirmation.get('input').setValue('ลบล็อต')
  await submit.trigger('click')
  await flushPromises()
  expect(store.materials[0].stock).toBe(60)
  expect(store.stockDraftSnapshot[0].stock).toBe(100)
  expect(store.getMaterialLots(store.materials[0]).map(lot=>lot.id)).toEqual(['LOT-1'])
  expect(store.materials[0].lots.find(lot=>lot.id==='LOT-2').qty).toBe(0)
 }finally{confirmation.unmount();wrapper.unmount()}
})
