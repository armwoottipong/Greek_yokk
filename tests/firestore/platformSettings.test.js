import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {IDBFactory} from 'fake-indexeddb'
import {doc,getDocFromServer,setDoc,writeBatch,setLogLevel} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {summaryFixture} from './summaryFixture.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createCoreCommands} from '../../src/cloud/core/commands.js'
import {createCommandJournal} from '../../src/cloud/journal.js'
let env,f,db,api
setLogLevel('silent')
const shopId='greek-yogg',root=`shops/${shopId}`,path=()=>`${root}/generations/${f.shop.generation}`
const command=(opId='GP',expectedRevision=f.shop.revision)=>({kind:'platform_gp',opId,payload:{expectedRevision,rates:Object.fromEntries(f.shop.catalog.platformIds.map(id=>[id,2550]))}})
const client=uid=>{
 const db=env.authenticatedContext(uid,{email:`${uid}@example.com`,email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
 const getContext=()=>({projectId:'demo-greek-yogg',shopId,generation:f.shop.generation,uid,deviceId:uid,ready:true,online:true,protocolCertified:true})
 return {db,getContext,api:createCoreTransport({db,getContext})}
}
beforeAll(async()=>{env=await createRulesTest({rules:readFileSync('firestore.rules','utf8')})})
beforeEach(async()=>{
 await env.clearFirestore();f=summaryFixture()
 f.shop.allowedEmails={'alice@example.com':true,'bob@example.com':true,'manager@example.com':true}
 f.shop.userRoles={'alice@example.com':'admin','bob@example.com':'admin','manager@example.com':'manager'}
 // Exercise all four deployed channel slots, including the last Rules branch.
 const c=f.shop.catalog,source=c.platformIds[0]
 for(const id of ['P2','P3','P4']){
  c.platformIds.push(id);c.platforms[id]=structuredClone(c.platforms[source]);c.addonPrices[id]=structuredClone(c.addonPrices[source])
  for(const entity of [...Object.values(c.menus),...Object.values(c.addons)]){entity.pricesCents[id]=entity.pricesCents[source];if(entity.optionPrices)entity.optionPrices[id]=structuredClone(entity.optionPrices[source])}
 }
 await env.withSecurityRulesDisabled(async ctx=>{const d=ctx.firestore(),b=writeBatch(d);b.set(doc(d,root),f.shop);for(const m of f.materials)b.set(doc(d,`${path()}/materials/${m.id}`),m);await b.commit()});({db,api}=client('alice'))
})
afterAll(async()=>env?.cleanup())
async function direct(change=()=>{},actor=db,mode='both'){
 const planned=planInventoryCommand(f.shop,f.materials,command(),'alice')
 planned.nextShop=structuredClone(planned.nextShop)
 change(planned)
 const b=writeBatch(actor);if(mode!=='receipt')b.set(doc(actor,root),planned.nextShop);if(mode!=='root')b.set(doc(actor,`${path()}/operations/GP`),planned.operation);return b.commit()
}
it('saves atomically for admins, retries once and rejects stale drafts/collisions',async()=>{
 const b=client('bob'),c=command();const saved=await api.commit(c);expect(saved.rates).toEqual(c.payload.rates)
 expect(await api.commit(c)).toEqual(saved)
 const snapshot=await b.api.snapshot();expect(snapshot.shop.catalogRevision).toBe(f.shop.catalogRevision+1);expect(Object.fromEntries(snapshot.materials.map(m=>[m.id,m]))).toEqual(Object.fromEntries(f.materials.map(m=>[m.id,m])))
 expect(snapshot.shop.catalog.menus).toEqual(f.shop.catalog.menus)
 await expect(b.api.commit(command('STALE'))).rejects.toThrow('STALE_INVENTORY_DRAFT')
 expect((await b.api.rejectStaleInventory(command('STALE'))).rejected).toBe(true)
 await expect(api.commit({...c,payload:{...c.payload,rates:{...c.payload.rates,[f.shop.catalog.platformIds[0]]:3000}}})).rejects.toThrow('COMMAND_ID_COLLISION')
 expect((await b.api.commit(command('BOB',snapshot.shop.revision))).uid).toBe('bob')
})
it('journals a GP and channel change, reads it in another session and refuses sales on the paused channel',async()=>{
 const writer=client('alice'),reader=client('bob'),journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:'channel-test'})
 const commands=createCoreCommands({journal,transport:writer.api,getContext:writer.getContext}),c=command('CHANNELS')
 c.payload.enabled=Object.fromEntries(f.shop.catalog.platformIds.map((id,i)=>[id,i!==0]))
 try{
  const result=await commands.execute(c)
  expect(result,result.causeCode).toMatchObject({ok:true,value:{result:{enabled:c.payload.enabled,rates:c.payload.rates}}})
  const {shop}=await reader.api.snapshot(),id=f.shop.catalog.platformIds[0]
  expect(shop.catalog.platforms[id]).toMatchObject({active:false,gpBasisPoints:2550})
  expect(shop.catalog.platformIds).toEqual(f.shop.catalog.platformIds)
  expect(shop.catalog.menus).toEqual(f.shop.catalog.menus)
  expect(shop.catalog.addons).toEqual(f.shop.catalog.addons)
  await expect(writer.api.receipt(c.kind,c.opId,{...c,payload:{...c.payload,enabled:{...c.payload.enabled,[id]:true}}})).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
  await expect(reader.api.commit({kind:'sale',opId:'PAUSED',payload:{platformId:id,lines:[{menuId:f.shop.catalog.menuIds[0],qty:1}]}})).rejects.toThrow('Unsupported sale')
 }finally{await journal.close()}
})
it('denies Manager writes, all-disabled channels, and extra or non-boolean flags',async()=>{
 await assertFails(direct(()=>{},client('manager').db))
 const flags=Object.fromEntries(f.shop.catalog.platformIds.map(id=>[id,true]))
 await assertFails(direct(p=>{p.operation.enabled=Object.fromEntries(Object.keys(flags).map(id=>[id,false]));for(const id of Object.keys(flags))p.nextShop.catalog.platforms[id].active=false}))
 await assertFails(direct(p=>{p.operation.enabled={...flags,extra:false}}))
 await assertFails(direct(p=>{p.operation.enabled={...flags,[Object.keys(flags)[0]]:1}}))
 expect((await getDocFromServer(doc(db,root))).data()).toEqual(f.shop)
})
it('denies root-only and receipt-only writes and unauthenticated writes',async()=>{
 await assertFails(direct(()=>{},db,'root'));await assertFails(direct(()=>{},db,'receipt'))
 await assertFails(direct(()=>{},env.unauthenticatedContext().firestore()))
})
it.each(['negative','hundred','fraction','extra','price','active','stock','identity','revision','time'])('denies tampering: %s',async kind=>{
 await assertFails(direct(p=>{const id=f.shop.catalog.platformIds[0];switch(kind){
 case 'negative':p.operation.rates[id]=-1;p.nextShop.catalog.platforms[id].gpBasisPoints=-1;break
 case 'hundred':p.operation.rates[id]=10000;p.nextShop.catalog.platforms[id].gpBasisPoints=10000;break
 case 'fraction':p.operation.rates[id]=0.5;p.nextShop.catalog.platforms[id].gpBasisPoints=0.5;break
 case 'extra':p.operation.rates.extra=0;break
 case 'price':p.nextShop.catalog.menus[Object.keys(p.nextShop.catalog.menus)[0]].active=false;break
 case 'active':p.nextShop.catalog.platforms[id].active=false;break
 case 'stock':p.nextShop.materialIds=['fake'];break
 case 'identity':p.operation.uid='bob';break
 case 'revision':p.nextShop.catalogRevision--;break
 case 'time':p.operation.createdAt='yesterday';break
 }}))
 expect((await getDocFromServer(doc(db,root))).data()).toEqual(f.shop)
})
it('new sales use the saved GP and cancellation preserves historical money',async()=>{
 const id=f.shop.catalog.platformIds[0],menu=Object.values(f.shop.catalog.menus).find(m=>m.min===0)
 const sale=opId=>({kind:'sale',opId,payload:{platformId:id,lines:[{menuId:menu.id,qty:1,optionIds:[]}]}})
 const old=await api.commit(sale('OLD'));await api.commit(command('GP',(await api.snapshot()).shop.revision))
 const fresh=await api.commit(sale('NEW'));expect((await api.snapshot()).shop.catalog.platforms[id].gpBasisPoints).toBe(2550)
 expect(fresh.gpCents).toBe(Math.round(fresh.subtotalCents*0.255));expect(fresh.subtotalCents).toBe(old.subtotalCents)
 await api.commit({kind:'cancel',opId:'RETURN',payload:{orderId:'OLD'}})
 const saved=(await getDocFromServer(doc(db,`${path()}/orders/OLD`))).data();expect(saved.gpCents).toBe(old.gpCents);expect(saved.status).toBe('cancelled')
})

const channel=(opId,input,revision=f.shop.revision)=>({kind:'channel',opId,payload:{expectedRevision:revision,input}})
async function seedDisplay(){
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),`${path()}/display/catalog`),{platforms:Object.fromEntries(f.shop.catalog.platformIds.map(id=>[id,{name:id}])),menus:{},addons:{},groups:{}}))
}
it('removes and adds a channel through the journal, preserves historical sales and copies the selected prices',async()=>{
 await seedDisplay()
 const writer=client('alice'),reader=client('bob'),journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:'catalog-test'})
 const commands=createCoreCommands({journal,transport:writer.api,getContext:writer.getContext})
 const menu=Object.values(f.shop.catalog.menus).find(m=>m.min===0)
 const sale=await api.commit({kind:'sale',opId:'OLD-CHANNEL-SALE',payload:{platformId:'P2',lines:[{menuId:menu.id,qty:1,optionIds:[]}]}})
 try{
  const remove=channel('REMOVE-CHANNEL',{id:'P2'},(await api.snapshot()).shop.revision)
  const removed=await commands.execute(remove)
  expect(removed,JSON.stringify(removed)).toMatchObject({ok:true})
  const beforeAdd=(await reader.api.snapshot()).shop
  expect(beforeAdd.catalog.platformIds).toEqual(['P','P3','P4'])
  const add=channel('ADD-CHANNEL',{id:'NEW',name:'Delivery',gpBasisPoints:2700,sourceId:'P'},beforeAdd.revision)
  const added=await commands.execute(add)
  expect(added,JSON.stringify(added)).toMatchObject({ok:true})
  expect(await commands.execute(add)).toEqual(added)
  const after=await reader.api.snapshot()
  expect(after.shop.catalog.platforms.NEW).toEqual({active:false,revision:1,gpBasisPoints:2700})
  expect(after.shop.catalog.menus[menu.id].pricesCents.NEW).toBe(menu.pricesCents.P)
  expect(after.shop.catalog.menus[menu.id].pricesCents).not.toHaveProperty('P2')
  const display=(await getDocFromServer(doc(reader.db,`${path()}/display/catalog`))).data()
  expect(display.platforms.P2.name).toBe('P2');expect(display.platforms.NEW.name).toBe('Delivery')
  expect(display.platformAvailabilityOrder).toEqual(['P','P2','P3','P4'])
  await expect(reader.api.commit({kind:'cancel',opId:'RETURN-OLD-CHANNEL',payload:{orderId:sale.opId}})).resolves.toMatchObject({kind:'cancel'})
  expect((await getDocFromServer(doc(reader.db,`${path()}/orders/${sale.opId}`))).data()).toMatchObject({status:'cancelled',platformId:'P2',subtotalCents:sale.subtotalCents})
 }finally{await journal.close()}
})

it('denies structural changes without the complete proof and denies Manager preparations',async()=>{
 await seedDisplay()
 const c=channel('FORGED-CHANNEL',{id:'P2'}),plan=planInventoryCommand(f.shop,f.materials,c,'alice')
 const proposal=doc(db,`${path()}/preparations/channel_${c.opId}`)
 const proposalData={opId:c.opId,uid:'alice',revision:f.shop.revision,input:c.payload.input,catalog:plan.nextShop.catalog}
 const manager=client('manager')
 await assertFails(setDoc(doc(manager.db,proposal.path),{...proposalData,uid:'manager'}))
 await setDoc(proposal,proposalData)
 const batch=writeBatch(db)
 batch.set(doc(db,root),plan.nextShop)
 batch.set(doc(db,`${path()}/operations/${c.opId}`),plan.operation)
 await assertFails(batch.commit())
 const forged={...structuredClone(proposalData),opId:'TAMPERED'};forged.catalog.menus.SIMPLE.recipe={}
 await setDoc(doc(db,`${path()}/preparations/channel_TAMPERED`),forged)
 const index=Math.floor(f.shop.catalog.menuIds.indexOf('SIMPLE')/2)
 expect(index).toBe(0)
 await assertFails(setDoc(doc(db,`${path()}/preparedSales/TAMPERED/operandProofs/channel_0`),{opId:'TAMPERED',index}))
 expect((await api.snapshot()).shop).toEqual(f.shop)
})
