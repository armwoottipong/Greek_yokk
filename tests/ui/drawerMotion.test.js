import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import ActivityLogModal from '../../src/components/modals/ActivityLogModal.vue'
import {createTestStore} from '../helpers/createStore'

it.each(['dialog','panel','drawer','sheet'])('starts the %s entry transition when opening inserts the modal shell',async(presentation)=>{
 const w=mount(DialogFrame,{props:{open:false,id:'motion-drawer',title:'รายละเอียดสินค้า',presentation,teleport:false},global:{stubs:{transition:false}}})
 try{
  await w.setProps({open:true});await nextTick()
  const panel=w.get(`.dialog-frame-panel--${presentation}`)
  expect(panel.classes()).toContain('dialog-frame-enter-from')
  expect(panel.classes()).toContain('dialog-frame-enter-active')
 }finally{w.unmount()}
})

it('starts the mobile cart entry transition when its sheet is opened',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(CartPanel,{props:{presentation:'sheet',open:false},global:{stubs:{transition:false}}})
 try{
  await w.setProps({open:true});await nextTick()
  const panel=document.querySelector('#pos-cart-review .dialog-frame-panel--sheet')
  expect(panel.classList.contains('dialog-frame-enter-from')).toBe(true)
  expect(panel.classList.contains('dialog-frame-enter-active')).toBe(true)
 }finally{w.unmount()}
})

it('animates history in and keeps its overlay mounted through the exit transition',async()=>{
 const store=createTestStore();store.resetDemoData()
 store.modals.activityLog.isOpen=false
 const w=mount(ActivityLogModal,{global:{stubs:{transition:false}}})
 try{
  store.modals.activityLog.isOpen=true;await nextTick()
  expect(w.get('.history-modal').classes()).toContain('history-panel-enter-active')
  store.modals.activityLog.isOpen=false;await nextTick()
  expect(w.get('.history-modal').classes()).toContain('history-panel-leave-active')
  expect(w.get('.history-shell').attributes('role')).toBe('dialog')
 }finally{w.unmount()}
})
