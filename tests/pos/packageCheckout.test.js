import {describe,it,expect,vi} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'

function setup({ingredientStock=100,packageStock=1}={}){
 const store=createTestStore(),food=material('FOOD',ingredientStock,{name:'โยเกิร์ต',unitCost:0.5}),cup=material('CUP',packageStock,{name:'ถ้วย',inventoryType:'packaging',unit:'ใบ',unitCost:2})
 store.materials=[food,cup];store.menus=[{id:'M',name:'เมนู',isActive:true,prices:{PLAT01:100},recipe:[{materialId:'FOOD',qty:10},{materialId:'CUP',qty:1}]}]
 store.executeAddToCart(store.menus[0],[],3)
 return store
}

describe('package checkout accounting',()=>{
 it('confirms package shortage then allocates only available stock and separates costs',()=>{
  const store=setup();expect(store.checkout()).toBeNull()
  expect(store.modals.lowStockWarning.warningItems[0]).toMatchObject({inventoryType:'packaging',shortage:2})
  const order=store.checkout({allowPackageShortage:true})
  expect(store.matMap.CUP.stock).toBe(0);expect(order).toMatchObject({ingredientCost:15,packagingCost:2,expectedPackagingShortageCost:4,foodCost:17})
  expect(order.packagePlan[0]).toMatchObject({requestedQty:3,fulfilledQty:1,shortageQty:2})
  expect(order.stockShortages.find(x=>x.materialId==='CUP')).toMatchObject({qty:2,inventoryType:'packaging'})
 })
 it('shows ingredient and package shortages together and commits nothing before confirmation',()=>{
  const store=setup({ingredientStock:5,packageStock:0});expect(store.checkout()).toBeNull()
  expect(store.modals.lowStockWarning.warningItems.map(x=>x.inventoryType).sort()).toEqual(['ingredient','packaging'])
  expect(store.orders).toEqual([]);expect(store.matMap.FOOD.stock).toBe(5);expect(store.matMap.CUP.stock).toBe(0)
  const order=store.checkout({allowShortage:true,allowPackageShortage:true});expect(order).toBeTruthy();expect(order.stockShortages).toHaveLength(2)
 })
 it('uses a reduction adjustment and clears it only after successful checkout',()=>{
  const store=setup({packageStock:1});store.savePackageAdjustment({materialId:'CUP',requestedQty:1,reason:'combined_packaging',note:''})
  const order=store.checkout();expect(order.packagePlan[0]).toMatchObject({baselineQty:3,adjustmentQty:-2,requestedQty:1});expect(store.packageAdjustments).toEqual([])
 })
 it('blocks an archived or retyped manual package and retains the order draft',()=>{
  const store=setup();store.materials.push(material('BAG',2,{inventoryType:'packaging'}));store.savePackageAdjustment({materialId:'BAG',requestedQty:1,reason:'separate_bag',note:''});store.materials.find(x=>x.id==='BAG').inventoryType='ingredient'
  expect(store.checkout()).toBeNull();expect(store.cart).toHaveLength(1);expect(store.packageAdjustments).toHaveLength(1);expect(store.orders).toEqual([])
 })
 it('keeps stock orders shortages cart and adjustments recoverable on persistence failure',()=>{
  const store=setup();store.savePackageAdjustment({materialId:'CUP',requestedQty:1,reason:'combined_packaging',note:''});vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota')})
  expect(store.checkout()).toBeNull();expect(store.matMap.CUP.stock).toBe(1);expect(store.orders).toEqual([]);expect(store.stockShortages).toEqual([]);expect(store.cart).toHaveLength(1);expect(store.packageAdjustments).toHaveLength(1)
 })
})
