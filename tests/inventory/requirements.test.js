import {it,expect} from 'vitest'
import * as inventory from '../../src/domain/inventory'
import {material} from '../helpers/createStore'
it('filters only typed Menu packaging and aggregates Menu and Add-on recipe duplicates',()=> {
 const mats=[material('X'),material('P',100,{category:'Cups',inventoryType:'packaging'})]
 const menu={hasPackage:false,recipe:[{materialId:'X',qty:10},{materialId:'X',qty:20},{materialId:'P',qty:120}]}
 const addons=[{id:'A',recipe:[{materialId:'X',qty:5},{materialId:'P',qty:1}]}]
 expect(inventory.getEffectiveRequirements(menu,addons,2,mats)).toEqual([{materialId:'X',qty:70},{materialId:'P',qty:2}])
})
it('preserves edible ingredients despite packaging-like names or categories',()=> {
 const mats=[material('X',100,{name:'โยเกิร์ตถ้วย',category:'Packaging ถ้วย'})]
 expect(inventory.getEffectiveRequirements({hasPackage:false,recipe:[{materialId:'X',qty:10}]},[],2,mats)).toEqual([{materialId:'X',qty:20}])
})
it('expands typed requirements with Menu and Add-on source evidence',()=> {
 const mats=[material('X'),material('P',100,{inventoryType:'packaging'})]
 const menu={id:'M',name:'Bowl',recipe:[{materialId:'X',qty:10},{materialId:'P',qty:1}]}
 const addons=[{id:'A',name:'Extra',recipe:[{materialId:'X',qty:5},{materialId:'P',qty:2}]}]
 expect(inventory.expandItemRequirements(menu,addons,2,mats)).toEqual([
  {materialId:'X',qty:20,inventoryType:'ingredient',sourceType:'menu',sourceId:'M',sourceName:'Bowl'},
  {materialId:'P',qty:2,inventoryType:'packaging',sourceType:'menu',sourceId:'M',sourceName:'Bowl'},
  {materialId:'X',qty:10,inventoryType:'ingredient',sourceType:'addon',sourceId:'A',sourceName:'Extra'},
  {materialId:'P',qty:4,inventoryType:'packaging',sourceType:'addon',sourceId:'A',sourceName:'Extra'},
 ])
})
it('aggregates only cart ingredient requirements and rounds quantities to two decimals',()=> {
 const mats=[material('X'),material('P',100,{inventoryType:'packaging'})]
 const cart=[{menu:{recipe:[{materialId:'X',qty:0.333},{materialId:'P',qty:1}]},selectedAddons:[{recipe:[{materialId:'X',qty:0.111}]}],qty:3},{menu:{recipe:[{materialId:'X',qty:1}]},qty:2}]
 expect(inventory.ingredientRequirementsForCart(cart,mats)).toEqual([{materialId:'X',qty:3.33}])
})
it('preserves existing Menu aggregation rounding for duplicate fractional ingredient rows',()=> {
 const mats=[material('X')]
 const menu={recipe:[{materialId:'X',qty:0.01},{materialId:'X',qty:0.145}]}
 expect(inventory.getEffectiveRequirements(menu,[],1,mats)).toEqual([{materialId:'X',qty:0.16}])
 expect(inventory.ingredientRequirementsForCart([{menu,selectedAddons:[],qty:1}],mats)).toEqual([{materialId:'X',qty:0.16}])
})
it('rejects ingredient rounding overflow through the compatibility requirements interface',()=> {
 const mats=[material('X')]
 const menu={recipe:[{materialId:'X',qty:1}]}
 expect(()=>inventory.getEffectiveRequirements(menu,[],Number.MAX_VALUE,mats)).toThrow()
})
it('rejects ingredient rounding overflow through the cart requirements interface',()=> {
 const mats=[material('X')]
 const menu={recipe:[{materialId:'X',qty:1}]}
 expect(()=>inventory.ingredientRequirementsForCart([{menu,selectedAddons:[],qty:Number.MAX_VALUE}],mats)).toThrow()
})
it('rejects invalid order or recipe quantities instead of dropping requirements',()=> {
 for (const qty of [0,-1,NaN,Infinity]) expect(()=>inventory.expandItemRequirements({recipe:[]},[],qty,[])).toThrow()
 for (const qty of [-1,NaN,Infinity]) expect(()=>inventory.expandItemRequirements({recipe:[{materialId:'X',qty}]},[],1,[material('X')])).toThrow()
})
it('expired only stock cannot be allocated and does not mutate inputs',()=> {
 const mats=[material('X',100,{lots:[{id:'L',qty:100,expiryDate:'2026-10-01',isInUse:true}]})]
 const r=inventory.allocateInventory(mats,[{materialId:'X',qty:20}],{businessDate:'2026-10-09',allowShortage:true})
 expect(r.ok).toBe(false);expect(mats[0].stock).toBe(100)
})
it('uses fresh alternative lot and returns allocations without mutations',()=> {
 const mats=[material('X',120,{lots:[{id:'expired',qty:100,expiryDate:'2026-10-01',isInUse:true},{id:'fresh',qty:20,expiryDate:'2026-10-10',isInUse:false}]})]
 const r=inventory.allocateInventory(mats,[{materialId:'X',qty:20}],{businessDate:'2026-10-09'})
 expect(r.ok).toBe(true);expect(r.allocations).toEqual([{materialId:'X',lotId:'fresh',qty:20}]);expect(r.materials[0].stock).toBe(100);expect(mats[0].stock).toBe(120)
})
it('missing and archived materials cannot be overridden',()=> {
 expect(inventory.allocateInventory([], [{materialId:'X',qty:1}],{allowShortage:true}).ok).toBe(false)
 expect(inventory.allocateInventory([material('X',100,{isDeleted:true})],[{materialId:'X',qty:1}],{allowShortage:true}).ok).toBe(false)
})
it('explicit shortage records outstanding quantity without negative lots',()=> {
 const r=inventory.allocateInventory([material('X',20)],[{materialId:'X',qty:60}],{businessDate:'2026-10-09',allowShortage:true})
 expect(r.ok).toBe(true);expect(r.materials[0].stock).toBe(0);expect(r.shortages[0].qty).toBe(40)
})
