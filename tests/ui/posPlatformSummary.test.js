import { it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import PosCatalog from '../../src/components/pos/PosCatalog.vue'
import Receipt from '../../src/components/modals/ReceiptModal.vue'

it('shows GP deductions and net revenue in the details popup and updates after switching',async()=>{
 const store=createTestStore();store.resetDemoData();store.executeAddToCart(store.menus[0],[],2)
 const w=mount(CartPanel,{props:{presentation:'panel'},attachTo:document.body})
 try{
  expect(w.find('[data-order-gp]').exists()).toBe(false)
  await w.get('[data-cart-details]').trigger('click')
  const popup=document.getElementById('pos-cart-details')
  expect(popup.querySelector('[data-order-gp]').textContent).toContain('0%')
  store.setPlatform('PLAT02');await flushPromises()
  expect(popup.querySelector('[data-order-gp]').textContent).toContain('30%')
  expect(popup.querySelector('[data-order-gp]').textContent).toContain('57.00')
  expect(popup.querySelector('[data-order-net]').textContent).toContain('133.00')
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

it('supports the channel dropdown by keyboard and skips inactive platforms',async()=>{
 const w=mount(PosCatalog,{props:{menus:[],platforms:[{id:'A',name:'หน้าร้าน'},{id:'H',name:'ซ่อน',isActive:false},{id:'B',name:'GrabFood',gpPercent:25.5}],platformId:'A',search:'',priceFor:()=>0,unavailableFor:()=>false},attachTo:document.body})
 try{
  await flushPromises()
  const select=w.get('[data-pos-channel]')
  select.element.focus()
  await select.trigger('keydown',{key:'ArrowDown'})
  const options=document.getElementById(select.attributes('aria-controls')).querySelectorAll('[role="option"]')
  expect([...options].map(option=>option.textContent.trim())).toEqual(['หน้าร้าน · ไม่มี GP','GrabFood · GP 25.5%'])
  await select.trigger('keydown',{key:'ArrowDown'})
  await select.trigger('keydown',{key:'Enter'})
  expect(w.emitted('platform').at(-1)).toEqual(['B'])
  expect(document.activeElement).toBe(select.element)
 }finally{w.unmount()}
})
