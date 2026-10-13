import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import PaymentFooter from '../../src/components/pos/CartPaymentFooter.vue'
import AppChoiceGroup from '../../src/components/ui/AppChoiceGroup.vue'

it('selects exactly one payment method with the shared choice control without changing the total',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1)
 const subtotal=store.cartSummary.subtotal,w=mount(PaymentFooter)
 try{
  expect(w.getComponent(AppChoiceGroup).exists()).toBe(true)
  await w.get('input[value="เงินสด"]').setValue()
  expect(store.paymentMethod).toBe('เงินสด')
  expect(w.findAll('input:checked')).toHaveLength(1)
  expect(store.cartSummary.subtotal).toBe(subtotal)
  await w.get('input[value="Platform Delivery"]').setValue()
  expect(store.paymentMethod).toBe('Platform Delivery')
  expect(w.findAll('input:checked')).toHaveLength(1)
 }finally{w.unmount()}
})

it('locks all payment methods and checkout while payment is pending',()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1)
 const w=mount(PaymentFooter,{props:{busy:true}})
 try{expect(w.findAll('input')).toHaveLength(3);expect(w.findAll('input:disabled')).toHaveLength(3);expect(w.get('button').element.disabled).toBe(true)}finally{w.unmount()}
})
