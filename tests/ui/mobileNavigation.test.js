import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {defineComponent,ref,nextTick} from 'vue'
import {createTestStore} from '../helpers/createStore'
import Sidebar from '../../src/components/layout/Sidebar.vue'
import HeaderBar from '../../src/components/layout/HeaderBar.vue'

it('opens the mobile drawer, navigates, and closes with Escape or backdrop',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 createTestStore()
 const Shell=defineComponent({components:{Sidebar,HeaderBar},setup(){return {open:ref(false)}},template:'<Sidebar :mobile-open="open" @close="open=false"/><HeaderBar :mobile-menu-open="open" @toggle-menu="open=!open"/>'})
 const w=mount(Shell,{attachTo:document.body})
 try{
  const trigger=w.get('#mobile-menu-toggle')
  expect(trigger.attributes('aria-expanded')).toBe('false')
  await trigger.trigger('click');expect(w.get('aside').attributes('aria-modal')).toBe('true')
  const last=w.findAll('aside button').at(-1).element
  last.focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));expect(document.activeElement).toBe(trigger.element)
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}));expect(document.activeElement).toBe(last)
  await w.get('aside button').trigger('click');expect(trigger.attributes('aria-expanded')).toBe('false')
  await trigger.trigger('click');document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await nextTick()
  expect(trigger.attributes('aria-expanded')).toBe('false')
  await flushPromises();expect(document.activeElement).toBe(trigger.element)
  await trigger.trigger('click');await w.get('.mobile-menu-backdrop').trigger('click');expect(trigger.attributes('aria-expanded')).toBe('false')
 }finally{w.unmount();vi.unstubAllGlobals()}
})
