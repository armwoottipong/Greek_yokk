import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {defineComponent,ref} from 'vue'
import {createTestStore,material} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Stock from '../../src/views/StockView.vue'
import Confirm from '../../src/components/modals/ConfirmModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'
it('keeps inline menu selection across cached routes without inert or scroll leases',async()=>{
 const store=createTestStore();store.resetDemoData()
 const Host=defineComponent({components:{MenuPage:Menu,Stock},setup(){return {page:ref('MenuPage')}},template:'<div id="app"><KeepAlive><component :is="page" /></KeepAlive></div>'})
 const w=mount(Host,{attachTo:document.body})
 try{
  await w.getComponent(Menu).findAll('[data-menu-select]')[1].trigger('click');await flushPromises()
  expect(document.getElementById('app').hasAttribute('inert')).toBe(false)
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  w.vm.page='Stock';await flushPromises()
  expect(document.getElementById('app').hasAttribute('inert')).toBe(false);expect(document.body.style.overflow).not.toBe('hidden')
  w.vm.page='MenuPage';await flushPromises()
  expect(w.getComponent(Menu).get('[data-selected-menu-name]').text()).toContain(store.menus[1].name)
 }finally{w.unmount()}
})
it('offers edit and permanent-delete routes for archived materials without restoring',async()=>{
 const store=createTestStore();store.materials=[material('ARCHIVED',0,{isDeleted:true})]
 const w=mount(Stock,{attachTo:document.body})
 try{w.vm.showDeleted=true;w.vm.detailMaterialId='ARCHIVED';await flushPromises()
  const button=document.querySelector('[data-detail-delete]');expect(button).not.toBeNull();button.click();await flushPromises()
  expect(w.vm.materialToDelete.id).toBe('ARCHIVED');expect(store.materials[0].isDeleted).toBe(true)
  expect(document.querySelector('[data-detail-edit]')).not.toBeNull()
 }finally{w.unmount()}
})
it('shows a clear empty state when every platform price is missing or zero',async()=>{
 const store=createTestStore();store.resetDemoData();store.menus[0].prices={}
 const w=mount(Menu,{attachTo:document.body})
 try{
  await flushPromises()
  expect(w.findAll('[data-menu-platform]')).toHaveLength(0)
  expect(w.get('.overview-empty').text()).toContain('ยังไม่ได้ตั้งราคาขาย')
  expect(w.findAll('.platform-metrics')).toHaveLength(0)
  store.menus[0].prices.PLAT01=0;await flushPromises()
  expect(w.findAll('[data-menu-platform]')).toHaveLength(0)
  await w.findAll('button').find(button=>button.text()==='เส้น').trigger('click')
  expect(w.findAll('[data-line-platform]')).toHaveLength(0)
  expect(w.text()).not.toMatch(/NaN|Infinity/)
 }finally{w.unmount()}
})
it('uses a constrained confirmation frame for long messages with cancel-first focus',async()=>{
 const store=createTestStore();store.modals.confirm={isOpen:true,title:'Long',message:'ข้อมูลยาว '.repeat(500),onCancel:vi.fn()}
 const w=mount(Confirm,{attachTo:document.body})
 try{await flushPromises();expect(w.findComponent(Frame).exists()).toBe(true);expect(document.activeElement.hasAttribute('data-confirm-cancel')).toBe(true);expect(w.find('.dialog-frame-body').exists()).toBe(true)}finally{w.unmount()}
})
