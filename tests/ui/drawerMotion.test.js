import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'

it('starts the drawer entry transition when opening inserts the modal shell',async()=>{
 const w=mount(DialogFrame,{props:{open:false,id:'motion-drawer',title:'รายละเอียดสินค้า',presentation:'drawer',teleport:false},global:{stubs:{transition:false}}})
 try{
  await w.setProps({open:true});await nextTick()
  const panel=w.get('.dialog-frame-panel--drawer')
  expect(panel.classes()).toContain('dialog-frame-enter-from')
  expect(panel.classes()).toContain('dialog-frame-enter-active')
 }finally{w.unmount()}
})
