import {readFileSync} from 'node:fs'
import {beforeAll,afterAll,describe,it,expect,vi} from 'vitest'
import {doc,getDocFromServer,writeBatch,Timestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'

describe.skipIf(!process.env.GY_FIREBASE_AUDIT_SNAPSHOT)('private production snapshot rehearsal in demo emulator',()=>{
 let env,model,other,api,data,db,base
 beforeAll(async()=>{
  vi.stubGlobal('sessionStorage',{getItem:()=>null,setItem:()=>{}})
  data=JSON.parse(readFileSync(process.env.GY_FIREBASE_AUDIT_SNAPSHOT,'utf8'),(_key,value)=>value?.type==='firestore/timestamp/1.0'?new Timestamp(value.seconds,value.nanoseconds):value)
  env=await createRulesTest({rules:readFileSync('firestore.rules','utf8')})
  await env.clearFirestore();data.shop.allowedEmails={'manager@example.com':true};data.shop.userRoles={'manager@example.com':'manager'}
  base=`shops/greek-yogg/generations/${data.shop.generation}`
  await env.withSecurityRulesDisabled(async ctx=>{
   const b=writeBatch(ctx.firestore());b.set(doc(ctx.firestore(),'shops/greek-yogg'),data.shop)
   for(const m of data.materials)b.set(doc(ctx.firestore(),`${base}/materials/${m.id}`),m)
   b.set(doc(ctx.firestore(),base+'/display/catalog'),data.display);await b.commit()
  })
  const auth={email:'manager@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}},context={projectId:'demo-greek-yogg',shopId:'greek-yogg',generation:data.shop.generation,uid:'manager',deviceId:'audit',online:true,ready:true}
  db=env.authenticatedContext('manager',auth).firestore();api=createCoreTransport({db,getContext:()=>context})
  other=createCoreTransport({db:env.authenticatedContext('other',auth).firestore(),getContext:()=>({...context,uid:'other'})})
  const load=async()=>({...await api.snapshot(),display:(await getDocFromServer(doc(db,base+'/display/catalog'))).data()})
  model=createInventoryModel({getData:()=>data,loadServer:load,execute:async c=>{const receipt=await api.commit(c);data=await load();model.update(data);return {ok:true,value:{opId:c.opId,kind:c.kind,result:receipt}}},isReady:()=>true,isBlocked:()=>false,storageKey:'snapshot-audit'})
 })
 afterAll(async()=>{model?.close();await env?.cleanup();vi.unstubAllGlobals()})
 it('links and unlinks a previously disabled production-profile menu and retains stock, prices, recipes and ordering',async()=>{
  const before=await other.snapshot(),menu=model.menus.find(m=>!m.hasAddons&&m.isActive),group=model.addonGroups.find(g=>g.isActive)
  expect(menu).toBeDefined();expect(group).toBeDefined()
  const original=data.display.menuOrderUpdatedAt
  for(const ids of [[group.id],[]]){
   expect(await model.saveMenu({...menu,hasAddons:ids.length>0,addonGroupIds:ids})).toMatchObject({ok:true})
   const saved=await other.snapshot(),m=saved.shop.catalog.menus[menu.id],old=before.shop.catalog.menus[menu.id]
   expect(m.groupIds||(m.groupId?[m.groupId]:[])).toEqual(ids)
   expect(saved.shop.catalog.groups[group.id].menuIds.includes(menu.id)).toBe(ids.length>0)
   expect(m.pricesCents).toEqual(old.pricesCents);expect(m.recipe).toEqual(old.recipe)
   for(const material of saved.materials)expect(material.stock).toBe(before.materials.find(row=>row.id===material.id).stock)
   const display=(await getDocFromServer(doc(db,base+'/display/catalog'))).data()
   expect(display.menuOrderUpdatedAt).toBeInstanceOf(Timestamp)
   expect(display.menuOrderUpdatedAt.isEqual(original)).toBe(true)
  }
 })
})
