import {readFileSync} from 'node:fs'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDocFromServer,writeBatch,Timestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createCatalogOrdering} from '../../src/cloud/core/catalogOrdering.js'
import {createCatalogBindings} from '../../src/cloud/core/catalogBindings.js'
import {catalogMenus,catalogAddons,catalogGroups} from '../../src/cloud/core/catalogPresentation.js'

let env,data,api,db,base,ordered
beforeAll(async()=>{env=await createRulesTest({rules:readFileSync('firestore.rules','utf8')})})
beforeEach(async()=>{
 await env.clearFirestore()
 const source=coreSource()
 source.platforms=Array.from({length:4},(_,i)=>({id:`P${i}`,name:`Platform ${i}`,gpPercent:0,isActive:true}))
 const prices=Object.fromEntries(source.platforms.map(p=>[p.id,10]))
 for(const menu of source.menus)menu.prices=prices
 source.addons=[{id:'A',name:'Option',prices,recipe:[{materialId:'M0',qty:1}]}]
 source.addonGroups=[{id:'G',name:'Fruit group',minSelections:1,maxSelections:1,allowRepeat:false,pricingMode:'included',options:[{addonId:'A'}]}]
 source.menus[0].hasAddons=true;source.menus[0].addonGroupIds=['G']
 const imported=compileCoreImport(source,{shopId:'greek-yogg',generation:'g_trial_order_edit',sourceSha256:'a'.repeat(64)})
 imported.shop.allowedEmails={'manager@example.com':true};imported.shop.userRoles={'manager@example.com':'manager'}
 await env.withSecurityRulesDisabled(async ctx=>{
  const b=writeBatch(ctx.firestore());b.set(doc(ctx.firestore(),'shops/greek-yogg'),imported.shop)
  for(const d of imported.documents)b.set(doc(ctx.firestore(),d.path),d.data)
  await b.commit()
 })
 const context={projectId:'demo-greek-yogg',shopId:'greek-yogg',generation:imported.shop.generation,uid:'manager',deviceId:'device',online:true,ready:true,role:'manager'}
 db=env.authenticatedContext('manager',{email:'manager@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
 api=createCoreTransport({db,getContext:()=>context});base=`shops/greek-yogg/generations/${context.generation}`
 await reload()
 const ordering=createCatalogOrdering({db,getContext:()=>context})
 try{await ordering.saveMenuOrder([...data.shop.catalog.menuIds].reverse(),{expectedOrderRevision:0,expectedCatalogRevision:data.shop.catalogRevision})}finally{ordering.close()}
 await reload();ordered=data.display.menuOrderUpdatedAt
 expect(ordered).toBeInstanceOf(Timestamp)
})
afterAll(async()=>env?.cleanup())
async function reload(){data={...await api.snapshot(),display:(await getDocFromServer(doc(db,`${base}/display/catalog`))).data()}}
function bindings(){return createCatalogBindings({snapshot:()=>data,error:message=>{throw new Error(message)},mutate:async entries=>{
 for(const [i,entry] of entries.entries()){await api.commit({...entry,opId:`AFTER-ORDER-${i}`});await reload()}
 return {ok:true}
}})}
async function assertMetadata(){
 const display=(await getDocFromServer(doc(db,`${base}/display/catalog`))).data()
 expect(display.menuOrderUpdatedAt).toBeInstanceOf(Timestamp)
 expect(display.menuOrderUpdatedAt.isEqual(ordered)).toBe(true)
 expect(display.menuOrderRevision).toBe(1)
 expect(display.menuOrder).toEqual([...data.shop.catalog.menuIds].reverse())
}
it.each(['menu','addon','group'])('renames a %s after server-confirmed ordering without rewriting order metadata',async kind=>{
 const row=({menu:catalogMenus,addon:catalogAddons,group:catalogGroups})[kind](data)[0]
 const action=({menu:'saveMenu',addon:'saveAddon',group:'saveAddonGroup'})[kind]
 await expect(bindings()[action]({...row,name:'Renamed'})).resolves.toMatchObject({ok:true})
 const collection={menu:'menus',addon:'addons',group:'groups'}[kind]
 expect(data.display[collection][row.id].name).toBe('Renamed')
 await assertMetadata()
})
it('saves the group and links another menu after ordering, preserving stock and the existing link',async()=>{
 const group=catalogGroups(data)[0],menus=catalogMenus(data),stocks=data.materials.map(m=>[m.id,m.stock])
 const existing=menus.find(m=>m.addonGroupIds?.includes(group.id)),additional=menus.find(m=>!m.addonGroupIds?.includes(group.id))
 await expect(bindings().saveAddonGroup({...group,menuIds:[existing.id,additional.id]})).resolves.toMatchObject({ok:true})
 expect(data.shop.catalog.groups[group.id].menuIds).toEqual([existing.id,additional.id])
 expect(data.shop.catalog.menus[additional.id].groupId).toBe(group.id)
 expect(data.materials.map(m=>[m.id,m.stock])).toEqual(stocks)
 await assertMetadata()
})
