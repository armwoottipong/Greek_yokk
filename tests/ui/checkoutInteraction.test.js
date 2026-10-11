import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Pos from '../../src/views/PosView.vue'
import Warning from '../../src/components/modals/LowStockWarningModal.vue'
it('locks repeated checkout attempts while a shortage decision is pending',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],40,true)
 const checkout=vi.spyOn(store,'checkout')
 const w=mount(Pos),warning=mount(Warning)
 try{
  w.vm.handleCheckout();w.vm.handleCheckout()
  expect(checkout).toHaveBeenCalledTimes(1);expect(w.vm.checkoutPending).toBe(true)
  warning.vm.cancel();await flushPromises()
  expect(w.vm.checkoutPending).toBe(false);expect(store.cart[0].qty).toBe(40)
 }finally{warning.unmount();w.unmount()}
})
it('closes cart review only after a committed order and consumes the warning confirmation once',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],40,true)
 const before=store.orders.length,checkout=vi.spyOn(store,'checkout')
 const w=mount(Pos),warning=mount(Warning)
 try{
  w.vm.cartOpen=true;await flushPromises();w.vm.handleCheckout()
  expect(w.vm.cartOpen).toBe(true)
  warning.vm.confirm();warning.vm.confirm();await flushPromises()
  expect(store.orders.length).toBe(before+1);expect(checkout).toHaveBeenCalledTimes(2)
  expect(store.modals.receipt.isOpen).toBe(true);expect(w.vm.cartOpen).toBe(false);expect(w.vm.checkoutPending).toBe(false)
 }finally{warning.unmount();w.unmount()}
})
it('keeps the draft and enables retry when checkout throws before saving',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1);store.orderNote='หวานน้อย'
 vi.spyOn(store,'checkout').mockImplementation(()=>{throw new Error('storage unavailable')})
 const w=mount(Pos)
 try{
  expect(()=>w.vm.handleCheckout()).not.toThrow();await flushPromises()
  expect(store.cart).toHaveLength(1);expect(store.orderNote).toBe('หวานน้อย');expect(w.vm.checkoutPending).toBe(false)
  expect(store.toasts.at(-1).type).toBe('error');expect(store.toasts.at(-1).message).toContain('ลอง')
 }finally{w.unmount()}
})
