import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Stock from '../../src/views/StockView.vue'
import {createTestStore,material} from '../helpers/createStore'

it('retains the inventory columns with a separate date column and contextual lot actions',async()=>{
 const store=createTestStore()
 const mat=material('TABLE',100,{name:'Table milk',lastStockInDate:'2026-10-01',expiryDate:'2099-01-01',lots:[
  {id:'LOT-1',qty:60,initialQty:60,unitCost:1,isInUse:true,receiveDate:'2026-10-01',expiryDate:'2099-01-01'},
  {id:'LOT-2',qty:40,initialQty:40,unitCost:1,isInUse:false,receiveDate:'2026-10-02',expiryDate:'2099-01-02'}
 ]})
 store.materials=[mat];store.menus=[];store.addons=[]
 const wrapper=mount(Stock,{attachTo:document.body})
 try {
  expect(wrapper.findAll('.desktop-material-table thead th').map(th=>th.text())).toEqual(['วัตถุดิบ / สินค้า','วันที่','ประเภท','คงเหลือในคลัง','ต้นทุน/หน่วย','มูลค่าสต็อกคงเหลือ','สถานะ','การจัดการ'])
  const row=wrapper.get('.desktop-material-table>div>table>tbody>tr')
  expect(row.findAll('td')[0].findAll('time')).toHaveLength(0)
  expect(row.findAll('td')[1].findAll('time')).toHaveLength(2)
  const toggle=wrapper.get('[data-lot-expand="TABLE"]')
  await toggle.trigger('click');expect(toggle.attributes('aria-expanded')).toBe('true')
  expect(wrapper.get('#stock-lots-TABLE').classes()).toContain('is-expanded')
  await wrapper.get('[data-lot-more="LOT-2"]').trigger('click');await flushPromises()
  const dialog=document.querySelector('#stock-lot-actions-LOT-2')
  expect(dialog.textContent).toContain('ปรับยอดเฉพาะล็อตนี้')
  expect(dialog.textContent).toContain('สลับเป็นล็อตใช้งาน')
  expect(store.materials[0].stock).toBe(100)
 }finally{wrapper.unmount()}
})
