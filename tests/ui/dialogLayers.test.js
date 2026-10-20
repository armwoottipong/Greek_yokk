import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {defineComponent,ref} from 'vue'
import ModalShell from '../../src/components/ui/ModalShell.vue'
import MenuView from '../../src/views/MenuView.vue'
import {createTestStore} from '../helpers/createStore'
it('focuses native disclosure controls and skips their closed fields',async()=>{
 const w=mount(ModalShell,{props:{open:true,label:'Details'},attachTo:document.body,slots:{default:'<details><summary>รายละเอียด</summary><input aria-label="ราคาที่ซ่อน"></details><button>ปิด</button>'}})
 try{await flushPromises();expect(document.activeElement.tagName).toBe('SUMMARY')}finally{w.unmount()}
})
it('keeps nested dialogs locked and permits only the top scrolling body',async()=>{
 const Shell=defineComponent({components:{ModalShell},setup(){return {a:ref(true),b:ref(false)}},template:'<ModalShell :open="a" label="Lower"><div><button>A</button><div data-scroll style="overflow-y:auto"><button>Inside</button></div></div></ModalShell><ModalShell :open="b" label="Upper"><button>B</button></ModalShell>'})
 const before=document.body.style.overflow
 const w=mount(Shell,{attachTo:document.body})
 try{
  await flushPromises();expect(document.body.style.overflow).toBe('hidden')
  const outside=new WheelEvent('wheel',{deltaY:50,bubbles:true,cancelable:true});document.body.dispatchEvent(outside);expect(outside.defaultPrevented).toBe(true)
  const scroll=w.get('[data-scroll]').element
  Object.defineProperty(scroll,'scrollHeight',{value:300});Object.defineProperty(scroll,'clientHeight',{value:100});scroll.scrollTop=10
  const inside=new WheelEvent('wheel',{deltaY:50,bubbles:true,cancelable:true});scroll.dispatchEvent(inside);expect(inside.defaultPrevented).toBe(false)
  w.vm.b=true;await flushPromises();expect(w.findAll('[role="dialog"]')[0].attributes('inert')).toBeDefined()
  w.vm.b=false;await flushPromises();expect(document.body.style.overflow).toBe('hidden');expect(w.get('[role="dialog"]').attributes('inert')).toBeUndefined()
  w.vm.a=false;await flushPromises();expect(document.body.style.overflow).toBe(before)
 }finally{w.unmount()}
})
it('shows recipe details inline without making the application inert or locking page scroll',async()=>{
 const store=createTestStore();store.resetDemoData()
 const before=document.body.style.overflow
 const w=mount(MenuView,{attachTo:document.body})
 try{
  await w.get(`[data-menu-select="${store.menus[0].id}"]`).trigger('click');await flushPromises()
  expect(document.querySelector('[role="dialog"]')).toBeNull()
  expect(w.get('[data-menu-recipe-panel]').text()).toContain('วัตถุดิบ')
  expect(w.element.closest('[inert]')).toBeNull()
  expect(document.body.style.overflow).toBe(before)
 }finally{w.unmount()}
})
