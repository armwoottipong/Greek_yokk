import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Pos from '../../src/views/PosView.vue'
import Custom from '../../src/components/modals/CustomOrderModal.vue'
import Receipt from '../../src/components/modals/ReceiptModal.vue'

it('opens product details even without addons before adding anything',async()=>{
 const store=createTestStore();store.resetDemoData();const menu=store.menus[0];menu.hasAddons=false
 const w=mount(Pos)
 try{await w.get(`[data-pos-menu="${menu.id}"]`).trigger('click');expect(store.cart).toHaveLength(0);expect(store.modals.customOrder.menuId).toBe(menu.id)}finally{w.unmount()}
})

it('counts every cart line for the menu badge and removes it when the cart is cleared',async()=>{
 const store=createTestStore();store.resetDemoData();const menu=store.menus[0]
 store.executeAddToCart(menu,[],2,false,'แยกน้ำผึ้ง');store.executeAddToCart(menu,[store.addons[0]],3,false,'ไม่ใส่ช้อน')
 const w=mount(Pos)
 try{
  const card=w.get(`[data-pos-menu="${menu.id}"]`)
  expect(card.get('[data-menu-cart-count]').text()).toBe('5')
  store.updateCartQty(0,1);await flushPromises();expect(card.get('[data-menu-cart-count]').text()).toBe('4')
  store.clearCart();await flushPromises();expect(card.find('[data-menu-cart-count]').exists()).toBe(false)
 }finally{w.unmount()}
})

it('adds the drawer quantity and item note, then clears the next product draft',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Custom)
 try{
  store.modals.customOrder={isOpen:true,menuId:store.menus[0].id};await flushPromises()
  expect(w.get('.dialog-frame-panel--drawer').exists()).toBe(true)
  await w.get('[aria-label="หมายเหตุรายการนี้"]').setValue('แยกน้ำผึ้ง')
  await w.get('[aria-label="เพิ่มจำนวนชาม"]').trigger('click')
  await w.findAll('button').find(b=>b.text().includes('เพิ่มลงตะกร้า')).trigger('click')
  expect(store.cart[0]).toMatchObject({qty:2,note:'แยกน้ำผึ้ง'})
  store.modals.customOrder={isOpen:true,menuId:store.menus[1].id};await flushPromises()
  expect(w.get('[aria-label="หมายเหตุรายการนี้"]').element.value).toBe('');expect(w.vm.qty).toBe(1)
 }finally{w.unmount()}
})

it('keeps different notes separate and carries them through checkout and receipt',()=>{
 const store=createTestStore();store.resetDemoData();const menu=store.menus[0]
 store.addToCart(menu,[],1,false,'แยกน้ำผึ้ง');store.addToCart(menu,[],1,false,'ไม่ใส่น้ำผึ้ง');store.addToCart(menu,[],1,false,' แยกน้ำผึ้ง ')
 expect(store.cart.map(i=>({qty:i.qty,note:i.note}))).toEqual([{qty:2,note:'แยกน้ำผึ้ง'},{qty:1,note:'ไม่ใส่น้ำผึ้ง'}])
 const order=store.checkout();expect(order.items.map(i=>i.note)).toEqual(['แยกน้ำผึ้ง','ไม่ใส่น้ำผึ้ง'])
 const w=mount(Receipt);try{expect(w.text()).toContain('แยกน้ำผึ้ง');expect(w.text()).toContain('ไม่ใส่น้ำผึ้ง')}finally{w.unmount()}
})

it('retains the note when stock confirmation is pending and attaches it on confirmation',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Custom)
 try{
  store.modals.customOrder={isOpen:true,menuId:store.menus[0].id};await flushPromises()
  await w.get('[aria-label="หมายเหตุรายการนี้"]').setValue('แยกถุง');w.vm.qty=40;w.vm.addToCart()
  expect(store.modals.lowStockWarning.isOpen).toBe(true);expect(w.get('[aria-label="หมายเหตุรายการนี้"]').element.value).toBe('แยกถุง')
  store.modals.lowStockWarning.onConfirm();expect(store.cart[0].note).toBe('แยกถุง');expect(store.modals.customOrder.isOpen).toBe(false)
 }finally{w.unmount()}
})

it('treats a note-only draft as unsaved when closing',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Custom)
 try{
  store.modals.customOrder={isOpen:true,menuId:store.menus[0].id};await flushPromises()
  await w.get('[aria-label="หมายเหตุรายการนี้"]').setValue('ไม่ใส่ช้อน')
  const closing=w.vm.requestClose();await flushPromises();expect(store.modals.confirm.isOpen).toBe(true)
  store.modals.confirm.onCancel();await closing;expect(store.modals.customOrder.isOpen).toBe(true)
 }finally{w.unmount()}
})
