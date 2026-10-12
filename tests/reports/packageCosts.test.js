import {it,expect} from 'vitest'
import {buildDashboard} from '../../src/domain/dashboard'

it('aggregates split costs adjustments reasons and package shortages with historical defaults',()=>{
 const orders=[
  {orderId:'NEW',createdAt:'2026-10-10T10:00:00Z',subtotal:100,netRevenue:100,gpAmount:0,ingredientCost:20,packagingCost:4,expectedPackagingShortageCost:2,foodCost:24,grossProfit:76,items:[],packagePlan:[{materialId:'CUP',materialName:'ถ้วย',adjustmentQty:1,reason:'separate_bag'}],stockShortages:[{materialId:'CUP',materialName:'ถ้วย',inventoryType:'packaging',qty:1}]},
  {orderId:'OLD',createdAt:'2026-10-09T10:00:00Z',subtotal:80,netRevenue:80,gpAmount:0,foodCost:30,grossProfit:50,items:[]}
 ]
 const metrics=buildDashboard(orders,{start:null,end:null}).metrics
 expect(metrics).toMatchObject({totalIngredientCost:50,totalPackagingCost:4,expectedPackagingShortageCost:2,totalFoodCost:54,packagingCostPerOrder:2})
 expect(metrics.packageAdjustments[0]).toMatchObject({materialId:'CUP',count:1,quantity:1})
 expect(metrics.adjustmentReasons[0]).toMatchObject({reason:'separate_bag',count:1})
 expect(metrics.packageShortages[0]).toMatchObject({materialId:'CUP',count:1,quantity:1})
})
