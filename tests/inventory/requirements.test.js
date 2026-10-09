import {it,expect} from 'vitest'
import * as inventory from '../../src/domain/inventory'
import {material} from '../helpers/createStore'
it('filters packaging and aggregates recipe and addon duplicates',()=> {
 const mats=[material('X'),material('P',100,{category:'Packaging'})]
 expect(inventory.getEffectiveRequirements({hasPackage:false,recipe:[{materialId:'X',qty:10},{materialId:'X',qty:20},{materialId:'P',qty:120}]},[],2,mats)).toEqual([{materialId:'X',qty:60}])
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
