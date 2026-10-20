import { it, expect } from 'vitest'
import { estimateMenuCosts, selectedItemCosts } from '../../src/domain/menuCosts'

const materials = [{id:'BASE',unitCost:10,inventoryType:'ingredient'}, {id:'PACK',unitCost:2,inventoryType:'packaging'}, ...[4,7,10,15].map((unitCost,i)=>({id:`F${i}`,unitCost,inventoryType:'ingredient'}))]
const addons = [0,1,2,3].map(i=>({id:`A${i}`,recipe:[{materialId:`F${i}`,qty:1}],prices:{P:20}}))
const group = {id:'G',name:'ผลไม้',pricingMode:'included',minSelections:3,maxSelections:3,allowRepeat:false,options:addons.map(a=>({addonId:a.id}))}
const menu = {prices:{P:100},hasAddons:true,addonGroupIds:['G'],recipe:[{materialId:'BASE',qty:2},{materialId:'PACK',qty:1}]}
it('adds the equal-probability mean and the most expensive distinct choices to the base recipe',()=>{
 expect(estimateMenuCosts(menu,[group],addons,materials)).toMatchObject({baseCost:22,averageCost:49,worstCost:54})
})
it('uses the most expensive option repeatedly only when repetition is allowed',()=>{
 expect(estimateMenuCosts(menu,[{...group,allowRepeat:true}],addons,materials).worstCost).toBe(67)
})
it('ignores paid and disabled options and respects packaging and disabled addons',()=>{
 const result=estimateMenuCosts({...menu,hasPackage:false},[group,{...group,id:'PAID',pricingMode:'extra'}],[...addons.slice(0,3),{...addons[3],isActive:false}],materials)
 expect(result).toMatchObject({baseCost:20,averageCost:41,worstCost:41})
 expect(estimateMenuCosts({...menu,hasAddons:false},[group],addons,materials).averageCost).toBe(22)
})
it('does not report false zero costs for missing material or insufficient distinct options',()=>{
 expect(estimateMenuCosts(menu,[group],addons,materials.slice(0,2)).averageCost).toBeNull()
 expect(estimateMenuCosts(menu,[group],addons.slice(0,2),materials).worstCost).toBeNull()
})
it('calculates actual selected recipe costs, repeated portions, GP and bowl quantity',()=>{
 const result=selectedItemCosts(menu,[{...addons[0],prices:{P:0},selectionQty:2},{...addons[3],prices:{P:20}}],2,materials,{id:'P',gpPercent:30})
 expect(result).toMatchObject({cost:90,revenue:240,gpAmount:72,netRevenue:168,profit:78})
})
