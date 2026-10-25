import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc,deleteDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { platformFixture } from './summaryPlatformFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryCatalogBatch,summaryCatalog } from './summaryCatalog.js'
import { prepareSummaryPlatform } from './summaryPreparedPlatform.js'
import { summaryPlatform } from './summaryPlatform.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { ROOT,GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it.each([false,true])('adds a channel with complete copied price columns (dense %s)',async dense=>{
  const {base,f}=platformFixture({dense,platforms:3});await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore();await assertSucceeds(prepareSummaryPlatform(db,f))
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
})
const create={id:'DELIVERY',name:'Delivery',emoji:'🛵',active:true,gpBasisPoints:3250,sourcePlatformId:'P'}
const rowsWith=(materials,rows)=>materials.map(m=>rows.find(n=>n.id===m.id)||m)
const line=[{menuId:'SIMPLE',qty:1,optionIds:['A0','A1']}]
const proposalPath=id=>`${GENERATION}/preparedPlatforms/${id}`
it('matches the independent oracle and preparation never changes live catalogue, stock or creates a committed receipt',async()=>{
  const {base,f}=platformFixture(),db=env.authenticatedContext('cashier').firestore()
  expect(summaryPlatform(base.shop,base.materials,create,{opId:'NEW-PLATFORM'})).toEqual(f)
  await seedSetCatalog(env,base);await prepareSummaryPlatform(db,f)
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
  expect((await getDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`))).exists()).toBe(false)
  for(const m of base.materials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
})
it('creates a channel, sells six lines with copied zero/absent overrides, edits GP and returns an earlier bill',async()=>{
  const {base,f}=platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await prepareSummaryPlatform(db,f);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const lines=Array.from({length:6},()=>structuredClone(line[0]))
  const old=preparedSale(summarySale(f.nextShop,base.materials,lines,{platformId:'DELIVERY',opId:'OLD-PLATFORM-BILL'}))
  await prepareSummarySale(db,old);await assertSucceeds(preparedSaleBatch(db,old).commit())
  const receipt=(await getDoc(doc(db,`${GENERATION}/orders/${old.order.opId}`))).data(),materials=rowsWith(base.materials,old.nextMaterials)
  const edit=summaryPlatform(old.nextShop,materials,{...create,sourcePlatformId:'',gpBasisPoints:9999,name:'Renamed delivery'},{opId:'GP-EDIT'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  const fresh=preparedSale(summarySale(edit.nextShop,materials,line,{platformId:'DELIVERY',opId:'NEW-GP-BILL'}))
  expect(fresh.order.gpCents).toBe(Math.floor((fresh.order.subtotalCents*9999+5000)/10000))
  await prepareSummarySale(db,fresh);await assertSucceeds(preparedSaleBatch(db,fresh).commit())
  const cancelled=summaryCancel(fresh.nextShop,rowsWith(materials,fresh.nextMaterials),receipt,{opId:'RETURN-OLD-GP'})
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit());await assertFails(summaryCancelBatch(db,cancelled).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/orders/${receipt.opId}`))).data()
  expect(saved.gpCents).toBe(receipt.gpCents);expect(saved.subtotalCents).toBe(receipt.subtotalCents)
  expect(saved.inventory).toEqual(receipt.inventory);expect(saved.status).toBe('cancelled')
})
it('rejects a staged sale after GP changes, then accepts a fresh plan using unchanged price proofs',async()=>{
  const {base}=platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const stale=preparedSale(summarySale(base.shop,base.materials,line,{opId:'STAGED'}));await prepareSummarySale(db,stale)
  const edit=summaryPlatform(base.shop,base.materials,{id:'P',name:'Store',active:true,gpBasisPoints:3500},{opId:'GP'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit());await assertFails(preparedSaleBatch(db,stale).commit())
  const fresh=preparedSale(summarySale(edit.nextShop,base.materials,line,{opId:'STAGED'}))
  await assertSucceeds(preparedSaleBatch(db,fresh).commit())
})
it('rejects stale preparation after another sale, preserves stock and accepts preparation with a new ID',async()=>{
  const {base,f}=platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareSummaryPlatform(db,f)
  const sale=preparedSale(summarySale(base.shop,base.materials,line,{opId:'SALE-FIRST'}));await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  await assertFails(summaryCatalogBatch(db,f).commit())
  const fresh=summaryPlatform(sale.nextShop,sale.nextMaterials,create,{opId:'FRESH-CHANNEL'})
  await prepareSummaryPlatform(db,fresh);await assertSucceeds(summaryCatalogBatch(db,fresh).commit())
  for(const m of sale.nextMaterials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
})
it('disables and re-enables a channel, blocks its prepared sale, and leaves old receipts returnable',async()=>{
  const {base,f}=platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareSummaryPlatform(db,f);await summaryCatalogBatch(db,f).commit()
  const sale=preparedSale(summarySale(f.nextShop,base.materials,line,{platformId:'DELIVERY',opId:'BEFORE-DISABLE'}))
  await prepareSummarySale(db,sale);await preparedSaleBatch(db,sale).commit()
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data(),materials=rowsWith(base.materials,sale.nextMaterials)
  const staged=preparedSale(summarySale(sale.nextShop,materials,line,{platformId:'DELIVERY',opId:'DISABLED'}));await prepareSummarySale(db,staged)
  const disable=summaryPlatform(sale.nextShop,materials,{...create,sourcePlatformId:'',active:false},{opId:'DISABLE'})
  await assertSucceeds(summaryCatalogBatch(db,disable).commit());await assertFails(preparedSaleBatch(db,staged).commit())
  const returned=summaryCancel(disable.nextShop,materials,order,{opId:'RETURN-DISABLED'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  const enable=summaryPlatform(returned.nextShop,rowsWith(materials,returned.nextMaterials),{...create,sourcePlatformId:''},{opId:'ENABLE'})
  await assertSucceeds(summaryCatalogBatch(db,enable).commit())
})
it('serializes two account edits and rejects duplicate and standalone root replay',async()=>{
  const {base}=platformFixture(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('other').firestore();await seedSetCatalog(env,base)
  const input={id:'P',name:'Store',active:true,gpBasisPoints:1000},a=summaryPlatform(base.shop,base.materials,input,{opId:'A'}),b=summaryPlatform(base.shop,base.materials,{...input,gpBasisPoints:2500},{opId:'B',uid:'other'})
  const result=await Promise.allSettled([summaryCatalogBatch(db,a).commit(),summaryCatalogBatch(other,b).commit()])
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const winner=result[0].status==='fulfilled'?a:b,loser=winner===a?b:a,target=winner===a?other:db
  const fresh=summaryPlatform(winner.nextShop,base.materials,{...input,gpBasisPoints:loser.operation.entitySnapshot.gpBasisPoints},{opId:loser.operation.opId,uid:loser.operation.uid})
  await assertSucceeds(summaryCatalogBatch(target,fresh).commit());await assertFails(summaryCatalogBatch(target,fresh).commit())
  await assertFails(setDoc(doc(target,ROOT),{...fresh.nextShop,revision:fresh.nextShop.revision+1}))
})
it('does not allow the generic catalogue route to disable the final active channel',async()=>{
  const {base}=platformFixture();await seedSetCatalog(env,base)
  const f=summaryCatalog(base.shop,base.materials,c=>{c.platforms.P.active=false})
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['proposal','proof','delete proof','other account','commit after prepare changed','final changed price'])('rejects prepared platform tampering: %s',async mode=>{
  const {base,f}=platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  if(mode==='commit after prepare changed'){
    await prepareSummaryPlatform(db,f);const edit=summaryPlatform(base.shop,base.materials,{id:'P',name:'Changed',gpBasisPoints:1},{opId:'INTERVENING'})
    await summaryCatalogBatch(db,edit).commit();await assertFails(summaryCatalogBatch(db,f).commit());return
  }
  if(mode==='proof'){
    await prepareSummaryPlatform(db,f,{omitProof:0})
    await assertFails(setDoc(doc(db,`${proposalPath(f.operation.opId)}/columnProofs/1`),{opId:f.operation.opId}));return
  }
  await prepareSummaryPlatform(db,f)
  if(mode==='proposal')await assertFails(setDoc(doc(db,proposalPath(f.operation.opId)),{...f.operation,catalog:base.shop.catalog}))
  if(mode==='delete proof')await assertFails(deleteDoc(doc(db,`${proposalPath(f.operation.opId)}/columnProofs/0`)))
  if(mode==='other account')await assertFails(summaryCatalogBatch(env.authenticatedContext('other').firestore(),f).commit())
  if(mode==='final changed price'){f.nextShop.catalog.menus.SIMPLE.pricesCents.DELIVERY++;await assertFails(summaryCatalogBatch(db,f).commit())}
})
it.each([0,14,15,29,30,44,45,55,56,59,60,63])('rejects altered group metadata at dense position %s',async index=>{
  const {base,f}=platformFixture({dense:true});f.nextShop.catalog.groups[base.shop.catalog.groupIds[index]].name='Forged'
  await seedSetCatalog(env,base)
  await assertFails(prepareSummaryPlatform(env.authenticatedContext('cashier').firestore(),f))
})
it.each(['menus','addons'].flatMap(kind=>[0,14,15,31,45,63].map(index=>({kind,index}))))('rejects altered copied price %j',async({kind,index})=>{
  const {base,f}=platformFixture({dense:true}),ids=kind==='menus'?base.shop.catalog.menuIds:base.shop.catalog.addonIds
  f.nextShop.catalog[kind][ids[index]].pricesCents.DELIVERY++
  await seedSetCatalog(env,base);await assertFails(prepareSummaryPlatform(env.authenticatedContext('cashier').firestore(),f))
})
it.each([
  ['negative GP',f=>{f.operation.entitySnapshot.gpBasisPoints=-1;f.nextShop.catalog.platforms.P.gpBasisPoints=-1}],
  ['GP 100%',f=>{f.operation.entitySnapshot.gpBasisPoints=10000;f.nextShop.catalog.platforms.P.gpBasisPoints=10000}],
  ['blank name',f=>{f.operation.entitySnapshot.name='  ';f.nextShop.catalog.platforms.P.name='  '}],
  ['long emoji',f=>{f.operation.entitySnapshot.emoji='a'.repeat(33);f.nextShop.catalog.platforms.P.emoji='a'.repeat(33)}],
  ['last active',f=>{f.operation.entitySnapshot.active=false;f.nextShop.catalog.platforms.P.active=false}],
  ['before snapshot',f=>f.operation.beforePlatform.gpBasisPoints++],
  ['template on edit',f=>{f.operation.sourcePlatformId='P'}],
  ['another entity',f=>{f.nextShop.catalog.addons.A0.recipe.S0++}],
])('rejects server-side platform edit tampering %s',async(_,mutate)=>{
  const {base}=platformFixture(),f=summaryPlatform(base.shop,base.materials,{id:'P',name:'Store',gpBasisPoints:0});mutate(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects a fifth channel, unauthenticated preparation and writes in a paused shop',async()=>{
  const {base,f}=platformFixture({platforms:4});await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore()
  await assertFails(prepareSummaryPlatform(db,f))
  await assertFails(prepareSummaryPlatform(env.unauthenticatedContext().firestore(),f))
  base.shop.status='paused';await seedSetCatalog(env,base)
  const edit=summaryPlatform(base.shop,base.materials,{id:'P',name:'Store',gpBasisPoints:0})
  await assertFails(summaryCatalogBatch(db,edit).commit())
})
it.each(['omitShop','omitOperation',0,1,5])('rejects omitted platform write %s',async key=>{
  const {base,f}=platformFixture();await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore();await prepareSummaryPlatform(db,f,typeof key==='number'?{omitProof:key}:{})
  await assertFails(summaryCatalogBatch(db,f,typeof key==='number'?{}:{[key]:true}).commit())
})
it.each([
  ['stock',f=>f.nextMaterials.push({id:'S0',lastOpKind:'platform',stock:1})],['cache epoch',f=>f.nextShop.catalogRevision++],
  ['template price',f=>f.nextShop.catalog.menus.SIMPLE.pricesCents.DELIVERY++],
  ['old price',f=>f.nextShop.catalog.menus.SIMPLE.pricesCents.P++],
  ['recipe',f=>f.nextShop.catalog.menus.SIMPLE.recipe.S0++],
  ['addon price',f=>f.nextShop.catalog.addons.A0.pricesCents.DELIVERY++],
  ['group override',f=>f.nextShop.catalog.groups.G.optionPrices.DELIVERY.A1=1],
  ['lookup table',f=>f.nextShop.catalog.addonPrices.DELIVERY.A0++],
  ['old metadata snapshot',f=>f.operation.beforePlatform={active:true}],
  ['GP',f=>{f.nextShop.catalog.platforms.DELIVERY.gpBasisPoints=10000;f.operation.entitySnapshot.gpBasisPoints=10000}],
  ['uid',f=>f.operation.uid='other'],['old catalogue',f=>f.operation.sourceCatalogRevision--],
])('rejects platform forgery %s',async(_,mutate)=>{
  const {base,f}=platformFixture();mutate(f);await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore()
  await assertFails((async()=>{await prepareSummaryPlatform(db,f);await summaryCatalogBatch(db,f).commit()})())
})
