import {it,expect} from 'vitest'
import {summaryFixture} from './firestore/summaryFixture.js'
import {materialRegistryShop} from './firestore/summaryMaterialAuthor.js'
import {planInventoryCommand} from '../src/cloud/core/inventoryPlan.js'
import {summaryMaterialDelete} from '../src/cloud/core/model/materialDelete.js'
const input=id=>({id,name:id,emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0})
function fixture(){
 const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
 for(const id of ['REMOVE','KEEP']){const p=planInventoryCommand(f.shop,f.materials,{kind:'material_create',opId:`CREATE-${id}`,payload:{input:input(id)}});f.shop=p.nextShop;f.materials.push(p.nextMaterials[0])}
 f.materials.find(m=>m.id==='REMOVE').deleted=true
 return f
}
it('removes an archived empty material, preserving immutable history and cost ranks after recreation',()=>{
 const f=fixture(),before=structuredClone(f),m=f.materials.find(m=>m.id==='REMOVE')
 const p=planInventoryCommand(f.shop,f.materials,{kind:'material_delete',opId:'DELETE',payload:{materialId:m.id,expectedRevision:f.shop.revision}})
 expect(p.nextMaterials).toEqual([]);expect(p.removedMaterialIds).toEqual([m.id]);expect(p.nextShop.productionUsers[m.id]).toBeUndefined()
 expect(p.nextShop.materialIds).not.toContain(m.id);expect(p.operation.materialSnapshot).toEqual(m)
 const created=planInventoryCommand(p.nextShop,f.materials.filter(n=>n.id!==m.id),{kind:'material_create',opId:'RECREATE',payload:{input:input(m.id)}})
 expect(created.nextMaterials[0].costRank).toBe(17);expect(created.nextShop.nextMaterialCostRank).toBe(18)
 expect(f).toEqual(before)
})
it.each(['live','stock','lot','menu','addon','counter','input','output','protected'])('rejects %s material deletion',condition=>{
 const f=fixture(),m=f.materials.find(m=>m.id==='REMOVE')
 if(condition==='live')m.deleted=false
 if(condition==='stock')m.stock=1
 if(condition==='lot')m.lotQty._=1
 if(condition==='menu')m.recipeIndex.menus.SIMPLE=1
 if(condition==='addon')m.recipeIndex.addons.A0=1
 if(condition==='counter')m.recipeIndex.quantities[0]=1
 if(condition==='input')f.shop.productionUsers[m.id]=['KEEP']
 if(condition==='output')m.productionRecipe={inputIds:['S0'],quantities:[1],yieldQ:1}
 if(condition==='protected')f.shop.catalog.summaryMaterials.push(m.id)
 expect(()=>summaryMaterialDelete(f.shop,m)).toThrow('archived, empty and unreferenced')
})
