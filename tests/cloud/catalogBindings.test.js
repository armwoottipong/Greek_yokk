import {it,expect} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {optionPrices} from '../../src/domain/addonGroups.js'
function fixture(beforeExecute=()=>null){
 sessionStorage.clear();const f=summaryFixture();let data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{SIMPLE:{name:'Original menu',emoji:'x'}},addons:{A0:{name:'Original addon',emoji:'y'}},groups:{},platforms:{P:{name:'Counter'}}}},model
 const execute=async command=>{const blocked=beforeExecute(command);if(blocked)return blocked;const plan=planInventoryCommand(data.shop,data.materials,command);data={...data,shop:plan.nextShop,materials:data.materials.map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),display:plan.displayChange?applyCatalogDisplay(data.display,plan.displayChange):data.display};return {ok:true,value:{opId:command.opId,kind:command.kind}}}
 model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute,isReady:()=>true,isBlocked:()=>false,storageKey:'catalog-bindings'})
 return {model,snapshot:()=>data}
}
it('reorders only group options without moving that group behind other groups on its menus',async()=>{
 const {model,snapshot}=fixture()
 try{
  for(const name of ['First','Second'])expect(await model.saveAddonGroup({name,minSelections:0,maxSelections:2,allowRepeat:false,pricingMode:'included',options:[{addonId:'A0'},{addonId:'A1'}]})).toMatchObject({ok:true})
  const groups=model.addonGroups.filter(g=>['First','Second'].includes(g.name))
  expect(await model.saveMenu({...model.menus.find(m=>m.id==='SIMPLE'),addonGroupIds:groups.map(g=>g.id)})).toMatchObject({ok:true})
  const before=structuredClone(snapshot().shop.catalog.menus.SIMPLE)
  expect(await model.saveAddonGroup({...groups[0],options:[...groups[0].options].reverse()})).toMatchObject({ok:true})
  expect(snapshot().shop.catalog.menus.SIMPLE.groupIds).toEqual(before.groupIds)
  expect(snapshot().shop.catalog.menus.SIMPLE.revision).toBe(before.revision)
 }finally{model.close()}
})
it('round trips unset channel prices separately from an explicitly free option',async()=>{
 const {model}=fixture()
 try{
  expect(await model.saveAddonGroup({name:'Price states',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'included',options:[{addonId:'A0',prices:{},unpricedPlatformIds:['P']},{addonId:'A1',prices:{P:0},unpricedPlatformIds:[]}]})).toMatchObject({ok:true})
  let group=model.addonGroups.find(g=>g.name==='Price states')
  expect(group.options[0].unpricedPlatformIds).toEqual(['P'])
  expect(optionPrices(group,group.options[0],model.addons.find(a=>a.id==='A0'))).not.toHaveProperty('P')
  expect(optionPrices(group,group.options[1],model.addons.find(a=>a.id==='A1')).P).toBe(0)
  expect(await model.saveAddonGroup({...group,name:'Renamed states'})).toMatchObject({ok:true})
  group=model.addonGroups.find(g=>g.name==='Renamed states')
  expect(group.options[0].unpricedPlatformIds).toEqual(['P'])
 }finally{model.close()}
})
it('moves legacy choices to groups using a checked revision and preserves prices and recipes',async()=>{
 const {model,snapshot}=fixture()
 const before=structuredClone(snapshot().shop.catalog)
 const plan=model.legacyOptionMigrationPlan()
 const ids=plan.profiles.flatMap(profile=>profile.menus)
 expect(ids.length).toBeGreaterThan(0)
 expect((await model.migrateLegacyOptions(plan.revision-1)).ok).toBe(false)
 expect((await model.migrateLegacyOptions(plan.revision)).ok).toBe(true)
 const after=snapshot().shop.catalog
 for(const id of ids){
  const old=before.menus[id],menu=after.menus[id],group=after.groups[menu.groupId]
  expect(menu.optionIds).toEqual([])
  expect(menu.recipe).toEqual(old.recipe)
  expect(menu.pricesCents).toEqual(old.pricesCents)
  expect(group).toMatchObject({min:old.min,max:old.max,optionIds:old.optionIds})
  for(const p of before.platformIds)for(const option of old.optionIds){
   const price=(old.priceMode==='addon'?before.addonPrices:old.optionPrices)[p][option]
   expect(group.optionPrices[p][option]).toBe(price)
  }
 }
 expect(model.legacyOptionMigrationPlan().profiles).toEqual([])
 model.close()
})
it('saves original menu/addon fields with one quantity/price conversion and confirmed display names',async()=>{
 const {model,snapshot}=fixture(),menu=model.menus.find(m=>m.id==='SIMPLE')
 expect(await model.saveMenu({...menu,name:'Renamed menu',prices:{P:89.5},recipe:[{materialId:'S0',qty:12.5}],hasAddons:false,hasPackage:true})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.menus.SIMPLE.pricesCents.P).toBe(8950);expect(snapshot().shop.catalog.menus.SIMPLE.recipe.S0).toBe(1250)
 expect(model.menus.find(m=>m.id==='SIMPLE').name).toBe('Renamed menu')
 const addon=model.addons.find(a=>a.id==='A0')
 expect(await model.saveAddon({...addon,name:'Renamed addon',prices:{P:12.25},recipe:[{materialId:'S0',qty:2.5}]})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.addons.A0.pricesCents.P).toBe(1225);expect(snapshot().shop.catalog.addons.A0.recipe.S0).toBe(250);model.close()
})
it('saves a new option, its group price and menu assignment through one group action',async()=>{
 const {model,snapshot}=fixture()
 const addonId='ADDON-TEST',menuId='SIMPLE'
 const before=structuredClone(snapshot().shop.catalog.menus[menuId])
 expect(await model.saveAddonGroup({
  name:'Fruit choices',minSelections:0,maxSelections:3,pricingMode:'extra',allowRepeat:false,
  warnLowStock:true,autoPauseOutOfStock:true,menuIds:[menuId],
  newAddons:[{id:addonId,name:'New fruit',recipe:[{materialId:'S0',qty:2.5}],prices:{}}],
  options:[{addonId,paused:true,prices:{P:5}}]
 })).toMatchObject({ok:true})
 const group=model.addonGroups.find(g=>g.name==='Fruit choices')
 expect(group).toMatchObject({warnLowStock:true,autoPauseOutOfStock:true,options:[{addonId,paused:true,prices:{P:5}}]})
 const catalog=snapshot().shop.catalog
 expect(catalog.addons[addonId].recipe.S0).toBe(250)
 expect(catalog.groups[group.id].menuIds).toContain(menuId)
 expect(catalog.menus[menuId]).toMatchObject({recipe:before.recipe,pricesCents:before.pricesCents})
 const addon=model.addons.find(item=>item.id===addonId)
 expect(await model.saveAddonGroup({
  ...group, expectedCatalogRevision:model.catalogRevision,
  updatedAddons:[{...addon,recipe:[{materialId:'S0',qty:3.5}]}]
 })).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.addons[addonId].recipe.S0).toBe(350)
 const duplicate={...addon,id:'ADDON-DUPLICATE'}
 expect(await model.saveAddonGroup({
  ...group, options:[...group.options,{addonId:duplicate.id}],newAddons:[duplicate]
 })).toMatchObject({ok:false,message:expect.stringContaining('วัตถุดิบนี้อยู่ในกลุ่มแล้ว')})
 expect(snapshot().shop.catalog.addons[duplicate.id]).toBeUndefined()
 expect(snapshot().shop.catalog.groups[group.id].menuIds).toContain(menuId)
 expect((await model.deleteAddon(addonId)).ok).toBe(false)
 const beforeDelete=structuredClone(snapshot())
 expect(await model.deleteAddonGroup(group.id)).toMatchObject({ok:true})
 expect(model.menus.find(menu=>menu.id===menuId).addonGroupIds).toEqual([])
 expect(snapshot().shop.catalog.addons).toEqual(beforeDelete.shop.catalog.addons)
 expect(snapshot().materials.map(m=>m.stock)).toEqual(beforeDelete.materials.map(m=>m.stock))
 model.close()
})
it('explains the two-group selection limit before creating or attaching records',async()=>{
 const {model,snapshot}=fixture()
 const input={name:'Many choices',minSelections:0,maxSelections:4,pricingMode:'included',allowRepeat:false,options:[{addonId:'A0'}]}
 expect(await model.saveAddonGroup({...input,menuIds:['SIMPLE']})).toMatchObject({ok:true})
 const large=model.addonGroups.find(group=>group.name===input.name)
 const next={...input,name:'Second group',maxSelections:2}
 const revision=snapshot().shop.revision
 const issue='แต่ละกลุ่มต้องเลือกได้ไม่เกิน 3 รายการ'
 expect(await model.saveAddonGroup({...next,menuIds:['SIMPLE']})).toMatchObject({ok:false,message:expect.stringContaining(issue)})
 expect(snapshot().shop.revision).toBe(revision)
 expect(await model.saveAddonGroup(next)).toMatchObject({ok:true})
 const second=model.addonGroups.find(group=>group.name===next.name)
 const menu=model.menus.find(item=>item.id==='SIMPLE')
 expect(await model.saveMenu({...menu,addonGroupIds:[large.id,second.id]})).toMatchObject({ok:false,message:expect.stringContaining(issue)})
 expect(await model.saveAddonGroup({...large,maxSelections:3})).toMatchObject({ok:true})
 expect(await model.saveAddonGroup({...second,menuIds:['SIMPLE']})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.menus.SIMPLE.groupIds).toEqual([large.id,second.id])
 expect(await model.saveAddonGroup({...large,maxSelections:4})).toMatchObject({ok:false,message:expect.stringContaining(issue)})
 expect(await model.saveAddonGroup({...large,maxSelections:4,menuIds:[]})).toMatchObject({ok:true})
 expect(snapshot().shop.catalog.menus.SIMPLE.groupId).toBe(second.id)
 model.close()
})
it('detaches only the deleted group from two-group menus and rejects a stale confirmation',async()=>{
 const {model,snapshot}=fixture()
 const input={name:'First group',minSelections:0,maxSelections:2,allowRepeat:false,pricingMode:'included',options:[{addonId:'A0'}]}
 expect(await model.saveAddonGroup({...input,menuIds:['SIMPLE']})).toMatchObject({ok:true})
 const first=model.addonGroups.find(group=>group.name===input.name)
 expect(await model.saveAddonGroup({...input,name:'Second group',menuIds:['SIMPLE']})).toMatchObject({ok:true})
 const second=model.addonGroups.find(group=>group.name==='Second group')
 const revision=model.catalogRevision
 expect(await model.deleteAddonGroup(first.id,{expectedCatalogRevision:revision-1})).toMatchObject({ok:false})
 expect(model.menus.find(menu=>menu.id==='SIMPLE').addonGroupIds).toEqual([first.id,second.id])
 snapshot().display.menus.SIMPLE.name='Renamed display menu'
 model.update(snapshot())
 const before=JSON.parse(JSON.stringify(model.menus.find(menu=>menu.id==='SIMPLE')))
 expect(await model.deleteAddonGroup(first.id,{expectedCatalogRevision:revision})).toMatchObject({ok:true})
 expect(model.menus.find(menu=>menu.id==='SIMPLE')).toMatchObject({addonGroupIds:[second.id],hasAddons:true,recipe:before.recipe,prices:before.prices})
 expect(snapshot().shop.catalog.groups[second.id].menuIds).toContain('SIMPLE')
 expect(snapshot().shop.catalog.groups[second.id].multiMenuIds).toEqual([])
 expect(model.addonGroups.some(group=>group.id===first.id)).toBe(false)
 expect(await model.deleteAddonGroup(first.id)).toMatchObject({ok:true})
 model.close()
})
it('retains the unfinished deletion and resumes after menus have been detached',async()=>{
 let interrupt=false
 const {model,snapshot}=fixture(command=>{
  if(interrupt&&command.kind==='group'){interrupt=false;return {ok:false,outcome:'not_submitted',message:'Disconnected'}}
 })
 const input={name:'Delete after reconnect',minSelections:0,maxSelections:2,allowRepeat:false,pricingMode:'included',options:[{addonId:'A0'}],menuIds:['SIMPLE']}
 expect(await model.saveAddonGroup(input)).toMatchObject({ok:true})
 const group=model.addonGroups.find(item=>item.name===input.name)
 const stock=snapshot().materials.map(material=>material.stock)
 interrupt=true
 expect(await model.deleteAddonGroup(group.id)).toMatchObject({ok:false})
 expect(snapshot().shop.catalog.menus.SIMPLE.groupId).toBeUndefined()
 expect(snapshot().shop.catalog.groups[group.id].active).toBe(true)
 expect(model.hasStockDrafts).toBe(false)
 expect(model.stockDraftSummary.items).toEqual([])
 expect(model.hasCatalogDrafts).toBe(true)
 expect(model.catalogDraftSummary).toEqual([expect.objectContaining({name:input.name,title:'บันทึกกลุ่มตัวเลือก'})])
 const saved=JSON.parse(sessionStorage.getItem('catalog-bindings'))
 delete saved.draftKind
 sessionStorage.setItem('catalog-bindings',JSON.stringify(saved))
 const restored=createInventoryModel({getData:snapshot,loadServer:async()=>snapshot(),execute:async()=>({ok:false}),isReady:()=>true,isBlocked:()=>false,storageKey:'catalog-bindings'})
 expect(restored.hasStockDrafts).toBe(false)
 expect(restored.hasCatalogDrafts).toBe(true)
 expect(restored.stockDraftSummary.items).toEqual([])
 restored.close()
 expect(await model.commitCatalogChanges()).toMatchObject({ok:true})
 expect(model.hasCatalogDrafts).toBe(false)
 expect(snapshot().shop.catalog.groups[group.id].active).toBe(false)
 expect(snapshot().materials.map(material=>material.stock)).toEqual(stock)
 model.close()
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
