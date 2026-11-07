import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Pos from '../../src/views/PosView.vue'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'

it('opens a modal cart from the launcher while retaining the catalog',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Pos,{attachTo:document.body})
 try{
  await w.get('[data-cart-open]').trigger('click');await flushPromises()
  expect(document.getElementById('pos-cart-review').getAttribute('role')).toBe('dialog')
  expect(w.get('.pos-catalog').isVisible()).toBe(true)
  expect(w.getComponent(CartPanel).getComponent(DialogFrame).props('open')).toBe(true)
 }finally{w.unmount()}
})
it('does not discard an order draft until clearing is confirmed',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1,false,'แยกชาม')
 const w=mount(CartPanel,{props:{presentation:'panel'}})
 try{
  await w.findAll('button').find(b=>b.text()==='ล้างตะกร้า').trigger('click')
  expect(store.cart).toHaveLength(1);expect(store.modals.confirm.isOpen).toBe(true)
  store.modals.confirm.onCancel();await flushPromises();expect(store.cart[0].note).toBe('แยกชาม')
 }finally{w.unmount()}
})
it('retains one shared cart, note and payment when the drawer closes or rotates',async()=>{
 let update
 const media={matches:true,addEventListener:(_,cb)=>{update=cb},removeEventListener:vi.fn()}
 vi.stubGlobal('matchMedia',()=>media)
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],2,false,'แยกท็อปปิ้ง')
 store.paymentMethod='เงินสด'
 const w=mount(Pos,{attachTo:document.body})
 try{
  await flushPromises();await w.get('[data-cart-open]').trigger('click');await flushPromises()
  const cart=w.getComponent(CartPanel)
  expect(w.findAllComponents(CartPanel)).toHaveLength(1)
  expect(cart.props('presentation')).toBe('drawer')
  cart.vm.$emit('request-close');await flushPromises()
  expect(cart.props('open')).toBe(false)
  expect(store.cart[0].qty).toBe(2);expect(store.cart[0].note).toBe('แยกท็อปปิ้ง');expect(store.paymentMethod).toBe('เงินสด')
  media.matches=false;update();await flushPromises()
  await w.get('[data-cart-open]').trigger('click');await flushPromises()
  expect(cart.props('presentation')).toBe('side-drawer')
  expect(store.cart[0].qty).toBe(2)
 }finally{w.unmount();vi.unstubAllGlobals()}
})
it('shows quantity rather than row count and an empty review cannot checkout',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],2);store.addToCart(store.menus[1],[],3)
 const checkout=vi.spyOn(store,'checkout')
 const w=mount(Pos,{attachTo:document.body})
 try{
  await flushPromises();expect(w.get('[data-cart-open]').attributes('aria-label')).toContain('5 รายการ')
  store.clearCart();await flushPromises();await w.get('[data-cart-open]').trigger('click');await flushPromises()
  expect(document.getElementById('pos-cart-review').textContent).toContain('เลือกเมนู')
  expect(checkout).not.toHaveBeenCalled()
 }finally{w.unmount()}
})
it('opens package review from a compact summary without changing subtotal',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1)
 const subtotal=store.cartSummary.subtotal,w=mount(CartPanel,{props:{presentation:'panel'},attachTo:document.body})
 try{await flushPromises();const button=w.findAll('button').find(b=>b.text().includes('ตรวจ/ปรับ Package'));expect(button).toBeTruthy();await button.trigger('click');expect(store.modals.packageReview.isOpen).toBe(true);expect(store.cartSummary.subtotal).toBe(subtotal)}finally{w.unmount()}
})
it('keeps the mobile cart compact and opens order details above the drawer',async()=>{
 const store=createTestStore();store.resetDemoData();store.addToCart(store.menus[0],[],1,false,'แยกช้อน')
 store.cart[0].selectedAddons=[{id:'EXTRA',name:'น้ำผึ้งเพิ่ม',groupName:'ท็อปปิ้ง',selectionQty:2,prices:{[store.currentPlatformId]:5},recipe:[]}]
 const w=mount(CartPanel,{props:{presentation:'drawer',open:true},attachTo:document.body,global:{stubs:{transition:false}}})
 try{
  await flushPromises()
  const drawer=document.getElementById('pos-cart-review')
  expect(drawer.querySelector('[data-cart-line]').textContent).toContain('฿')
  expect(drawer.textContent).not.toContain('แยกช้อน')
  expect(drawer.textContent).not.toContain('น้ำผึ้งเพิ่ม')
  expect(drawer.textContent).not.toContain('ต้นทุนวัตถุดิบประมาณ')
  drawer.querySelector('[data-cart-line] button[aria-label^="เพิ่มจำนวน"]').click();await flushPromises()
  expect(drawer.querySelector('[data-cart-line] output').textContent).toBe('2')
  const info=drawer.querySelector('[data-cart-details]')
  info.focus();info.click();await flushPromises()
  const popup=document.getElementById('pos-cart-details')
  expect(popup.querySelector('.dialog-frame-panel--sheet')).toBeTruthy()
  expect(drawer.hasAttribute('inert')).toBe(true)
  expect(popup.textContent).toContain('แยกช้อน')
  expect(popup.textContent).toContain('น้ำผึ้งเพิ่ม ×2')
  expect(popup.textContent).toContain('+฿10')
  expect(popup.textContent).toContain('ต้นทุนวัตถุดิบประมาณ')
  expect(popup.textContent).toContain('ต้นทุนบรรจุภัณฑ์ประมาณ')
  popup.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))
  await vi.waitFor(()=>expect(document.getElementById('pos-cart-details')).toBeNull())
  expect(drawer.hasAttribute('inert')).toBe(false)
  expect(document.activeElement).toBe(info)
 }finally{w.unmount()}
})
it('opens package review for a package-free order and estimates adjusted fulfilled package cost',async()=>{
 const store=createTestStore();store.resetDemoData();const food=store.materials.find(x=>x.inventoryType==='ingredient');store.materials=[food];store.cart=[{menu:{id:'M',name:'เปล่า',prices:{PLAT01:10},recipe:[{materialId:food.id,qty:1}],hasPackage:false},selectedAddons:[],qty:1}]
 const w=mount(CartPanel,{props:{presentation:'panel'}})
 try{await flushPromises();const button=w.findAll('button').find(b=>b.text().includes('ตรวจ/ปรับ Package'));expect(button).toBeTruthy();await button.trigger('click');expect(store.modals.packageReview.isOpen).toBe(true)}finally{w.unmount()}
})
