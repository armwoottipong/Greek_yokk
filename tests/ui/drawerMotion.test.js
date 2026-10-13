import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import {createTestStore} from '../helpers/createStore'

it('starts the drawer entry transition when opening inserts the modal shell',async()=>{
 const w=mount(DialogFrame,{props:{open:false,id:'motion-drawer',title:'รายละเอียดสินค้า',presentation:'drawer',teleport:false},global:{stubs:{transition:false}}})
 try{
  await w.setProps({open:true});await nextTick()
  const panel=w.get('.dialog-frame-panel--drawer')
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
