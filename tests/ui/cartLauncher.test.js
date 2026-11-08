import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore.js'
import Pos from '../../src/views/PosView.vue'
import CartLauncher from '../../src/components/pos/CartLauncher.vue'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'

it.each([false,true])('keeps the cart collapsed and opens the correct drawer (mobile=%s)',async mobile=>{
 vi.stubGlobal('matchMedia',()=>({matches:mobile,addEventListener(){},removeEventListener(){}}))
 const s=createTestStore();s.resetDemoData()
 const w=mount(Pos,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  expect(w.find('#pos-cart-review').exists()).toBe(false)
  s.executeAddToCart(s.menus[0],[],1);await flushPromises()
  expect(w.find('#pos-cart-review').exists()).toBe(false)
  expect(w.get('[data-cart-open]').attributes('aria-label')).toContain('1')
  await w.get('[data-cart-open]').trigger('click');await flushPromises()
  expect(w.get('#pos-cart-review').exists()).toBe(true)
  const frame=w.getComponent(CartPanel).getComponent(DialogFrame)
  expect(frame.props('presentation')).toBe(mobile?'drawer':'side-drawer')
  await w.get('#pos-cart-review [aria-label="ปิดหน้าต่าง"]').trigger('click');await flushPromises()
  expect(frame.props('open')).toBe(false)
  expect(w.get('[data-cart-open]').attributes('aria-expanded')).toBe('false')
  expect(s.cart).toHaveLength(1)
 }finally{w.unmount();vi.unstubAllGlobals()}
})
it('cleans up the flying card when leaving POS and respects reduced motion',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'animate'),cancel=vi.fn()
 Object.defineProperty(Element.prototype,'animate',{configurable:true,value:vi.fn(()=>({cancel,finished:new Promise(()=>{})}))})
 vi.stubGlobal('matchMedia',()=>({matches:false}))
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){return this.hasAttribute('data-pos-menu')?{x:20,y:30,left:20,top:30,right:220,bottom:270,width:200,height:240}:{x:300,y:700,left:300,top:700,right:360,bottom:760,width:60,height:60}})
 const source=document.createElement('button');source.dataset.posMenu='M';source.textContent='Menu';document.body.append(source)
 let w=mount(CartLauncher,{attachTo:document.body,props:{quantity:0}})
 try{
  w.vm.capture('M');await w.setProps({quantity:1});await flushPromises()
  expect(document.querySelector('[data-cart-flight]')).not.toBeNull()
  w.unmount();expect(document.querySelector('[data-cart-flight]')).toBeNull();expect(cancel).toHaveBeenCalled()
  vi.stubGlobal('matchMedia',()=>({matches:true}))
  w=mount(CartLauncher,{attachTo:document.body,props:{quantity:0}});w.vm.capture('M');await w.setProps({quantity:1});await flushPromises()
  expect(document.querySelector('[data-cart-flight]')).toBeNull()
 }finally{w.unmount();source.remove();if(descriptor)Object.defineProperty(Element.prototype,'animate',descriptor);else delete Element.prototype.animate;vi.restoreAllMocks();vi.unstubAllGlobals()}
})
