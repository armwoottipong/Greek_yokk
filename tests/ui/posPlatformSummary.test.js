import { it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import PosCatalog from '../../src/components/pos/PosCatalog.vue'
import Receipt from '../../src/components/modals/ReceiptModal.vue'

it('shows GP deductions and net revenue without expanding cost details and updates after switching',async()=>{
 const store=createTestStore();store.resetDemoData();store.executeAddToCart(store.menus[0],[],2)
 const w=mount(CartPanel,{props:{presentation:'panel'}})
 try{
  expect(w.get('[data-order-gp]').text()).toContain('0%')
  store.setPlatform('PLAT02');await flushPromises()
  expect(w.get('[data-order-gp]').text()).toContain('30%')
  expect(w.get('[data-order-gp]').text()).toContain('57.00')
  expect(w.get('[data-order-net]').text()).toContain('133.00')
 }finally{w.unmount()}
})

it('shows the saved fractional GP rate on a receipt even after settings change',async()=>{
 const store=createTestStore();store.resetDemoData()
 store.platforms.find(p=>p.id==='PLAT02').gpPercent=25.5
 store.setPlatform('PLAT02');store.executeAddToCart(store.menus[0],[],1)
 store.checkout({allowShortage:true})
 const w=mount(Receipt)
 try{
  expect(w.text()).toContain('GP (25.5%)')
  expect(w.text()).toContain('-฿24.23')
  store.platforms.find(p=>p.id==='PLAT02').gpPercent=30;await flushPromises()
  expect(w.text()).toContain('GP (25.5%)')
 }finally{w.unmount()}
})

it('supports keyboard channel tabs and skips inactive platforms',async()=>{
 const w=mount(PosCatalog,{props:{menus:[],platforms:[{id:'A',name:'หน้าร้าน'},{id:'H',name:'ซ่อน',isActive:false},{id:'B',name:'GrabFood'}],platformId:'A',search:'',priceFor:()=>0,unavailableFor:()=>false},attachTo:document.body})
 try{
  expect(w.findAll('[role="tab"]')).toHaveLength(2)
  await w.get('[role="tab"]').trigger('keydown',{key:'ArrowRight'})
  expect(w.emitted('platform').at(-1)).toEqual(['B'])
  expect(document.activeElement.textContent).toBe('GrabFood')
 }finally{w.unmount()}
})
