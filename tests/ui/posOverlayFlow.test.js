import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Custom from '../../src/components/modals/CustomOrderModal.vue'
import Shortage from '../../src/components/modals/LowStockWarningModal.vue'
import Lot from '../../src/components/modals/LotDepletionModal.vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'
it('uses the adaptive frame and preserves customization when shortage is cancelled',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Custom,{attachTo:document.body})
 const warning=mount(Shortage,{attachTo:document.body})
 try{
  store.modals.customOrder={isOpen:true,menuId:store.menus[0].id};await flushPromises()
  expect(w.findComponent(DialogFrame).exists()).toBe(true)
  w.vm.qty=40;w.vm.addToCart();await flushPromises()
  expect(store.modals.lowStockWarning.isOpen).toBe(true)
  warning.vm.cancel();await flushPromises()
  expect(w.vm.qty).toBe(40);expect(store.cart).toHaveLength(0)
  expect(store.modals.customOrder.isOpen).toBe(true)
 }finally{warning.unmount();w.unmount()}
})
it('treats changed bowl quantity as an unsaved customization',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Custom)
 try{
  store.modals.customOrder={isOpen:true,menuId:store.menus[0].id};await flushPromises();w.vm.qty=2
  const closing=w.vm.requestClose();await flushPromises()
  expect(store.modals.confirm.isOpen).toBe(true)
  store.modals.confirm.onCancel();await closing
  expect(store.modals.customOrder.isOpen).toBe(true);expect(w.vm.qty).toBe(2)
 }finally{w.unmount()}
})
it('confirms a stock warning only once even while its button is leaving',async()=>{
 const store=createTestStore();store.resetDemoData();let confirmed=0
 store.modals.lowStockWarning={isOpen:true,isOutOfStock:true,warningItems:[],onConfirm:()=>{confirmed++}}
 const w=mount(Shortage)
 try{w.vm.confirm();w.vm.confirm();expect(confirmed).toBe(1)}finally{w.unmount()}
})
it('cancels a multi-lot decision without switching the active lot',async()=>{
 const store=createTestStore();const mat=material('MILK',100);mat.lots.push({...mat.lots[0],id:'NEXT',qty:50,isInUse:false});store.materials=[mat]
 const w=mount(Lot)
 try{
  const decision=store.promptLotDepletion({material:mat,currentLot:mat.lots[0],nextLot:mat.lots[1],neededQty:110,availableInCurrent:100,actionContext:'pos'})
  await flushPromises();expect(w.findComponent(DialogFrame).exists()).toBe(true)
  w.vm.onCancel();expect(await decision).toBe(false)
  expect(store.materials[0].lots[0].isInUse).toBe(true)
 }finally{w.unmount()}
})
it('does not offer a switch when there is no next lot',async()=>{
 const store=createTestStore();const mat=material('MILK',100);store.materials=[mat]
 const w=mount(Lot)
 try{
  const decision=store.promptLotDepletion({material:mat,currentLot:mat.lots[0],nextLot:null,neededQty:110,availableInCurrent:100,actionContext:'pos'})
  await flushPromises()
  const button=w.findAll('button').find(b=>b.text().includes('เปลี่ยนไปล็อตใหม่'))
  expect(button.attributes('disabled')).toBeDefined();w.vm.onCancel();expect(await decision).toBe(false)
 }finally{w.unmount()}
})
