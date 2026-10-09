import {it,expect} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
it('material production edit updates raw and output lots and survives reload',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',1000),material('OUT',540,{hasSubRecipe:true,yieldQty:540,subRecipe:[{materialId:'RAW',qty:100}]})]}})
 const result=s.saveMaterial({...s.materials[1],stock:1080})
 expect(result.ok).toBe(true);expect(s.materials.map(m=>m.stock)).toEqual([900,1080]);expect(s.materials.map(m=>m.lots.reduce((n,l)=>n+l.qty,0))).toEqual([900,1080])
 expect(JSON.parse(localStorage.getItem('GY_DATABASE_V3')).materials.map(m=>m.stock)).toEqual([900,1080])
})
it('metadata-only edits preserve lots and totals',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}});expect(s.saveMaterial({...s.materials[0],name:'new name'}).ok).toBe(true);expect(s.materials[0].stock).toBe(100)
})
it('duplicate production ingredients are aggregated before mutation',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',100),material('OUT',0)]}})
 const result=s.batchProduce('OUT',20,[{materialId:'RAW',qty:60},{materialId:'RAW',qty:60}],'',{},true)
 expect(result?.success??result).toBe(false);expect(s.materials[0].stock).toBe(100);expect(s.materials[1].stock).toBe(0)
})
