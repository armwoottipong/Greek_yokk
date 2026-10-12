import {describe,it,expect} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'

function setup(){
 const store=createTestStore()
 const bowl=material('BOWL',10,{name:'ถ้วยเล็ก',inventoryType:'packaging',unit:'ใบ',unitCost:2})
 const bag=material('BAG',5,{name:'ถุง',inventoryType:'packaging',unit:'ใบ',unitCost:1})
 const honey=material('HONEY',100,{name:'น้ำผึ้ง'})
 store.materials=[bowl,bag,honey]
 const menu={id:'MENU',name:'โยเกิร์ต',prices:{PLAT01:80},recipe:[{materialId:'HONEY',qty:10},{materialId:'BOWL',qty:1}],hasPackage:true}
 store.cart=[{menu,selectedAddons:[],qty:2,addonKey:''}]
 return {store,bowl,bag,honey,menu}
}

describe('order package adjustments',()=>{
 it('derives baseline and converts requested quantity to a retained delta',()=>{
  const {store,menu}=setup()
  expect(store.cartPackagePlan.items.find(x=>x.materialId==='BOWL')).toMatchObject({baselineQty:2,requestedQty:2,fulfilledQty:2})
  expect(store.savePackageAdjustment({materialId:'BOWL',requestedQty:3,reason:'separate_bag',note:''}).ok).toBe(true)
  expect(store.packageAdjustments[0]).toMatchObject({materialId:'BOWL',deltaQty:1,reason:'separate_bag'})
  store.cart[0].qty=4
  expect(store.cartPackagePlan.items.find(x=>x.materialId==='BOWL')).toMatchObject({baselineQty:4,adjustmentQty:1,requestedQty:5})
  expect(menu.recipe).toEqual([{materialId:'HONEY',qty:10},{materialId:'BOWL',qty:1}])
 })
 it('adds package-only rows and validates target, reason and other note',()=>{
  const {store}=setup()
  expect(store.savePackageAdjustment({materialId:'BAG',requestedQty:2,reason:'separate_bag',note:''}).ok).toBe(true)
  expect(store.cartPackagePlan.items.find(x=>x.materialId==='BAG')).toMatchObject({baselineQty:0,requestedQty:2})
  expect(store.savePackageAdjustment({materialId:'HONEY',requestedQty:1,reason:'separate_bag',note:''}).ok).toBe(false)
  expect(store.savePackageAdjustment({materialId:'BAG',requestedQty:1,reason:'',note:''}).ok).toBe(false)
  expect(store.savePackageAdjustment({materialId:'BAG',requestedQty:1,reason:'other',note:'  '}).ok).toBe(false)
 })
 it('resets rows/all and clearCart clears transient adjustments',()=>{
  const {store}=setup()
  store.savePackageAdjustment({materialId:'BOWL',requestedQty:0,reason:'customer_declined',note:''})
  store.savePackageAdjustment({materialId:'BAG',requestedQty:1,reason:'separate_bag',note:''})
  store.resetPackageAdjustment('BOWL');expect(store.packageAdjustments).toHaveLength(1)
  store.resetPackageAdjustments();expect(store.packageAdjustments).toEqual([])
  store.savePackageAdjustment({materialId:'BAG',requestedQty:1,reason:'separate_bag',note:''})
  store.clearCart();expect(store.packageAdjustments).toEqual([])
 })
 it('keeps a negative delta after baseline removal and clamps effective quantity at zero',()=>{
  const {store}=setup()
  store.savePackageAdjustment({materialId:'BOWL',requestedQty:1,reason:'combined_packaging',note:''})
  store.cart=[]
  expect(store.cartPackagePlan.items.find(x=>x.materialId==='BOWL')).toMatchObject({baselineQty:0,adjustmentQty:-1,requestedQty:0})
 })
 it('projects adjusted fulfilled package cost into the cart financial summary',()=>{
  const {store}=setup();store.savePackageAdjustment({materialId:'BOWL',requestedQty:1,reason:'combined_packaging',note:''})
  expect(store.cartSummary).toMatchObject({totalIngredientCost:20,totalPackagingCost:2,totalFoodCost:22})
 })
})
