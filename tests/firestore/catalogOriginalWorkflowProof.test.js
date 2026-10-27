import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest'
import {doc,getDocFromServer,writeBatch} from 'firebase/firestore'
import {readFileSync} from 'node:fs'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
let env;const memory=new Map(),root='shops/proof-shop',gen=root+'/generations/g1'
beforeAll(async()=>{vi.stubGlobal('sessionStorage',{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)});env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{memory.clear();await env.clearFirestore()})
afterAll(async()=>{await env.cleanup();vi.unstubAllGlobals()})
async function workflow(source){
 const imported=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_catalog',sourceSha256:'a'.repeat(64)});imported.shop.generation='g1'
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),batch=writeBatch(db);batch.set(doc(db,root),imported.shop);for(const d of imported.documents)batch.set(doc(db,d.path.replace('/g_trial_catalog/','/g1/')),d.data);await batch.commit()})
 const ctx={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'a',deviceId:'a',online:true,ready:true},db=env.authenticatedContext('a').firestore(),api=createCoreTransport({db,getContext:()=>ctx})
 const other=createCoreTransport({db:env.authenticatedContext('b').firestore(),getContext:()=>({...ctx,uid:'b',deviceId:'b'})})
 const load=async()=>({...await api.snapshot(),display:(await getDocFromServer(doc(db,gen+'/display/catalog'))).data()})
 let data=await load(),model
 model=createInventoryModel({getData:()=>data,loadServer:load,execute:async c=>{const result=await api.commit(c);data=await load();model.update(data);return {ok:true,value:{opId:c.opId,kind:c.kind,result}}},isReady:()=>true,isBlocked:()=>false,storageKey:'catalog-workflow'})
 try{
  const material=data.materials.find(m=>data.shop.catalog.summaryMaterials.includes(m.id)&&m.stock>200),platform=data.shop.catalog.platformIds[0],prices=Object.fromEntries(data.shop.catalog.platformIds.map(id=>[id,10]))
  expect(material).toBeDefined()
  expect(await model.saveMenu({name:'Original editor menu',emoji:'x',prices,hasPackage:true,hasAddons:false,recipe:[{materialId:material.id,qty:1}]})).toMatchObject({ok:true})
  const menu=model.menus.find(m=>m.name==='Original editor menu')
  expect(await model.saveAddon({name:'Original editor addon',emoji:'y',prices,recipe:[{materialId:material.id,qty:1}]})).toMatchObject({ok:true})
  const addon=model.addons.find(m=>m.name==='Original editor addon')
  expect(await model.saveAddonGroup({name:'Original editor group',minSelections:1,maxSelections:1,allowRepeat:false,pricingMode:'extra',options:[{addonId:addon.id,prices:Object.fromEntries(data.shop.catalog.platformIds.map(id=>[id,4]))}]})).toMatchObject({ok:true})
  const group=model.addonGroups.find(g=>g.name==='Original editor group')
  expect(await model.saveMenu({...menu,hasAddons:true,addonGroupIds:[group.id]})).toMatchObject({ok:true})
  expect((await other.snapshot()).shop.catalog.menus[menu.id].groupId).toBe(group.id)
  const before=(await api.snapshot()).materials.find(m=>m.id===material.id).stock
  const sale=await api.commit({kind:'sale',opId:'SALE-NEW',payload:{platformId:platform,lines:[{menuId:menu.id,qty:1,optionIds:[addon.id]}],approvedShortages:{}}})
  expect(sale.subtotalCents).toBe(1400)
  await api.commit({kind:'cancel',opId:'RETURN-NEW',payload:{orderId:sale.opId}})
  const fresh=await load();model.update(fresh);expect(fresh.materials.find(m=>m.id===material.id).stock).toBe(before)
  expect((await model.deleteAddon(addon.id)).ok).toBe(false)
  const retiredMenu=await model.deleteMenu(menu.id);expect(retiredMenu).toMatchObject({ok:true})
  const retiredGroup=await model.deleteAddonGroup(group.id);expect(retiredGroup).toMatchObject({ok:true})
  const retiredAddon=await model.deleteAddon(addon.id);expect(retiredAddon,retiredAddon.message).toMatchObject({ok:true})
  expect(model.menus.some(m=>m.id===menu.id)).toBe(false);expect(model.addonGroups.some(g=>g.id===group.id)).toBe(false);expect(model.addons.some(a=>a.id===addon.id)).toBe(false)
  expect((await other.snapshot()).shop.catalog.addons[addon.id].active).toBe(false)
 } finally {model.close()}
}
it('runs original editor bindings through menu/addon/group save, sale/cancel and retire across two accounts',async()=>{await workflow(coreSource())})
it.skipIf(!process.env.GY_LATEST_BACKUP)('runs original editor bindings on the real four-platform sixteen-material snapshot',async()=>{await workflow(JSON.parse(readFileSync(process.env.GY_LATEST_BACKUP,'utf8')))},60000)
