import {it,expect} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
function fixture(){
 sessionStorage.clear();const f=summaryFixture();let data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{SIMPLE:{name:'Original menu',emoji:'x'}},addons:{A0:{name:'Original addon',emoji:'y'}},groups:{},platforms:{P:{name:'Counter'}}}},model
 const execute=async command=>{const plan=planInventoryCommand(data.shop,data.materials,command);data={...data,shop:plan.nextShop,materials:data.materials.map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),display:plan.displayChange?applyCatalogDisplay(data.display,plan.displayChange):data.display};return {ok:true,value:{opId:command.opId,kind:command.kind}}}
 model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute,isReady:()=>true,isBlocked:()=>false,storageKey:'catalog-bindings'})
 return {model,snapshot:()=>data}
}
it('saves original menu/addon fields with one quantity/price conversion and confirmed display names',async()=>{
 const {model,snapshot}=fixture(),menu=model.menus.find(m=>m.id==='SIMPLE')
 expect(await model.saveMenu({...menu,name:'Renamed menu',prices:{P:89.5},recipe:[{materialId:'S0',qty:12.5}],hasAddons:false,hasPackage:true})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.menus.SIMPLE.pricesCents.P).toBe(8950);expect(snapshot().shop.catalog.menus.SIMPLE.recipe.S0).toBe(1250)
 expect(model.menus.find(m=>m.id==='SIMPLE').name).toBe('Renamed menu')
 const addon=model.addons.find(a=>a.id==='A0')
 expect(await model.saveAddon({...addon,name:'Renamed addon',prices:{P:12.25},recipe:[{materialId:'S0',qty:2.5}]})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.addons.A0.pricesCents.P).toBe(1225);expect(snapshot().shop.catalog.addons.A0.recipe.S0).toBe(250);model.close()
})
it('creates and edits an original option group and binds it to a menu',async()=>{
 const {model,snapshot}=fixture()
 expect(await model.saveAddonGroup({name:'Free choices',minSelections:0,maxSelections:3,pricingMode:'extra',allowRepeat:false,options:[{addonId:'A0',prices:{P:5}}]})).toMatchObject({ok:true})
 const group=model.addonGroups.find(g=>g.name==='Free choices');expect(group.options[0].prices.P).toBe(5)
 const menu=model.menus.find(m=>m.id==='SIMPLE')
 expect(await model.saveMenu({...menu,addonGroupIds:[group.id],hasAddons:true})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.groups[group.id].menuIds).toContain('SIMPLE')
 expect((await model.deleteAddonGroup(group.id)).ok).toBe(false);expect((await model.deleteAddon('A0')).ok).toBe(false);model.close()
})
it('retires a menu from the original management list and detaches its option groups while retaining the canonical identity',async()=>{
 const {model,snapshot}=fixture()
 expect((await model.deleteMenu('SIMPLE')).ok).toBe(true)
 expect(snapshot().shop.catalog.menus.SIMPLE.rawRecipe).toEqual({})
 expect(snapshot().shop.catalog.menus.SIMPLE.recipe).toEqual({})
 expect(model.menus.some(m=>m.id==='SIMPLE')).toBe(false);expect(snapshot().shop.catalog.menus.SIMPLE.active).toBe(false);expect(snapshot().display.menus.SIMPLE.deleted).toBe(true);model.close()
})


it('does not overwrite a different device edit when an original editor still holds an older catalog revision',async()=>{
 const {model,snapshot}=fixture(),menu=model.menus.find(m=>m.id==='SIMPLE'),revision=model.catalogRevision
 expect((await model.saveMenu({...menu,name:'First edit',expectedCatalogRevision:revision})).ok).toBe(true)
 const before=JSON.stringify(snapshot())
 expect((await model.saveMenu({...menu,name:'Old editor overwrite',expectedCatalogRevision:revision})).ok).toBe(false)
 expect(JSON.stringify(snapshot())).toBe(before);model.close()
})
