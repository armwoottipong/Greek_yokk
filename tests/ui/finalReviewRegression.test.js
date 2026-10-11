import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {defineComponent,ref} from 'vue'
import {createTestStore,material} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Stock from '../../src/views/StockView.vue'
import Confirm from '../../src/components/modals/ConfirmModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'
it('closes cached page overlays and releases inert/scroll leases on navigation',async()=>{
 const store=createTestStore();store.resetDemoData()
 const Host=defineComponent({components:{MenuPage:Menu,Stock},setup(){return {page:ref('MenuPage')}},template:'<div id="app"><KeepAlive><component :is="page" /></KeepAlive></div>'})
 const w=mount(Host,{attachTo:document.body})
 try{
  const page=w.getComponent(Menu);page.vm.openBomModal(store.menus[0]);await flushPromises()
  expect(document.getElementById('app').hasAttribute('inert')).toBe(true)
  w.vm.page='Stock';await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull();expect(document.getElementById('app').hasAttribute('inert')).toBe(false);expect(document.body.style.overflow).not.toBe('hidden')
  w.vm.page='MenuPage';await flushPromises();expect(w.getComponent(Menu).vm.isBomModalOpen).toBe(false)
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
it('distinguishes absent store price and an explicitly zero price in recipe summaries',async()=>{
 const store=createTestStore();store.resetDemoData();store.menus[0].prices={}
 const w=mount(Menu,{attachTo:document.body})
 try{w.vm.openBomModal(store.menus[0]);await flushPromises()
  expect(w.vm.selectedMenuStorePrice).toBeNull();expect(w.vm.selectedMenuGpPercent).toBeNull()
  expect(document.getElementById('menu-recipe').textContent).toContain('ยังคำนวณไม่ได้')
  store.menus[0].prices.PLAT01=0;await flushPromises();expect(w.vm.selectedMenuStorePrice).toBe(0);expect(w.vm.selectedMenuGpPercent).toBeNull()
 }finally{w.unmount()}
})
it('uses a constrained confirmation frame for long messages with cancel-first focus',async()=>{
 const store=createTestStore();store.modals.confirm={isOpen:true,title:'Long',message:'ข้อมูลยาว '.repeat(500),onCancel:vi.fn()}
 const w=mount(Confirm,{attachTo:document.body})
 try{await flushPromises();expect(w.findComponent(Frame).exists()).toBe(true);expect(document.activeElement.hasAttribute('data-confirm-cancel')).toBe(true);expect(w.find('.dialog-frame-body').exists()).toBe(true)}finally{w.unmount()}
})
