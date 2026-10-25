import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, afterAll, expect, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { setCatalogFixture,seedSetCatalog,planSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { prepareStockMaterial,planSetStockIn,setStockInBatch } from './setStockInFixture.js'
import { ROOT,GENERATION } from './proofFixture.js'

let env
beforeAll(async () => { env=await createRulesTest({rules:await readFile(new URL('./candidates/set-catalog.rules',import.meta.url),'utf8')}) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

function fixture({packaging=false,merge=false,unitCost=0.5}={}) {
  const catalog=setCatalogFixture()
  const m=prepareStockMaterial(catalog.materials[packaging ? 11 : 0])
  const stock=planSetStockIn(catalog.shop,m,{unitCost,...(merge ? {receiveDay:m.lots[m.lotIds[0]].receiveDay,expiryDay:m.lots[m.lotIds[0]].expiryDay} : {})})
  catalog.materials=catalog.materials.map(item=>item.id===m.id ? m : item)
  return {catalog,...stock}
}

function lotsFixture(count=3,history=0) {
  const catalog=setCatalogFixture({prepareMaterials:materials=>{
    const m=materials[0],original=m.lots[0]
    m.lots=[...Array.from({length:history},(_,i)=>({...original,id:`OLD-${i}`,qty:0,isInUse:false})),
      ...Array.from({length:count},(_,i)=>({...original,id:`LIVE-${i}`,qty:i===count-1 ? 1000000-(count-1)*100 : 100,isInUse:i===0,receiveDay:20000+i,expiryDay:22000+i}))]
    m.activeLotId='LIVE-0'
  }})
  const m=prepareStockMaterial(catalog.materials[0]);catalog.materials[0]=m
  return {catalog,m}
}

it.each([{},{merge:true},{packaging:true},{merge:true,unitCost:0}])('commits stock-in $packaging / merge=$merge / cost=$unitCost',async options=>{
  const f=fixture(options); await seedSetCatalog(env,f.catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setStockInBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(2)
})

it.each(['Material','Operation','Shop'])('rejects an omitted %s from stock-in',async omitted=>{
  const f=fixture(); await seedSetCatalog(env,f.catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertFails(setStockInBatch(db,f,{[`omit${omitted}`]:true}).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(1)
})

it.each([
  ['quantity',f=>{f.next.stock++}],['cost',f=>{f.next.unitCost++}],['initial quantity',f=>{f.next.lots['NEW-LOT'].initialQtyQ++}],
  ['catalog index',f=>{f.next.recipeIndex.optionQty++}],['old lot',f=>{f.next.lots[f.before.lotIds[0]].qty--}],
  ['source revision',f=>{f.operation.materialRevision--}],['author',f=>{f.operation.uid='someone-else'}],
  ['allocation index',f=>{f.next.allocationIds.reverse()}],['new lot expiry',f=>{f.next.lots['NEW-LOT'].expiryDay--}],
  ['slot padding',f=>{f.next.slotIds[3]='NEW-LOT'}],['new ordinal',f=>{f.next.lots['NEW-LOT'].ordinal++}],
  ['lot history',f=>{f.next.lotIds.reverse()}],['active pointer',f=>{f.next.activeLotId='NEW-LOT'}],
  ['material date',f=>{f.next.lastStockInDay++}],['material expiry',f=>{f.next.expiryDay--}],
  ['pack cost',f=>{f.next.packCostCents++}],['negative quantity',f=>{f.operation.qtyQ=-1}],
  ['creation provenance',f=>{f.next.lots['NEW-LOT'].createdByOpId='OTHER'}],
  ['creation display date',f=>{f.next.lots['NEW-LOT'].createdAt='wrong'}],
])('rejects altered %s',async (_,change)=>{
  const f=fixture(); await seedSetCatalog(env,f.catalog); change(f)
  const db=env.authenticatedContext('cashier').firestore()
  await assertFails(setStockInBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(1)
})

it('adds the fourth live lot while preserving forty depleted history lots',async()=>{
  const {catalog,m}=lotsFixture(3,40),f=planSetStockIn(catalog.shop,m)
  await seedSetCatalog(env,catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setStockInBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()
  expect(saved.lotIds).toHaveLength(44)
  expect(saved.lots['OLD-39']).toEqual(m.lots['OLD-39'])
})

it('merges the existing fourth lot when live capacity is full',async()=>{
  const {catalog,m}=lotsFixture(4)
  const f=planSetStockIn(catalog.shop,m,{receiveDay:20003,expiryDay:22003})
  await seedSetCatalog(env,catalog)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects an injected fifth live lot instead of dropping stock or history',async()=>{
  const {catalog,m}=lotsFixture(4)
  expect(()=>planSetStockIn(catalog.shop,m)).toThrow('Unsupported live-lot count')
  const source=lotsFixture(3)
  const f=planSetStockIn(source.catalog.shop,source.m)
  f.before=m; f.shop=catalog.shop
  f.next.lots={...m.lots,...Object.fromEntries(Object.entries(f.next.lots).filter(([id])=>id==='NEW-LOT'))}
  f.next.lotIds=[...m.lotIds,'NEW-LOT'];f.next.allocationIds=[...m.allocationIds,'NEW-LOT'];f.next.slotIds=[...f.next.allocationIds]
  f.next.lots['NEW-LOT'].ordinal=m.lotIds.length
  await seedSetCatalog(env,catalog)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('does not create a new lot when a positive matching-date lot already exists',async()=>{
  const f=fixture()
  f.operation.receiveDay=f.before.lots[f.before.lotIds[0]].receiveDay
  f.operation.expiryDay=f.before.lots[f.before.lotIds[0]].expiryDay
  f.next.lots['NEW-LOT'].receiveDay=f.operation.receiveDay;f.next.lots['NEW-LOT'].expiryDay=f.operation.expiryDay
  await seedSetCatalog(env,f.catalog)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each(['empty ingredient','zero active history','expired active','zero packaging master','empty packaging'])('receives stock with %s',async shape=>{
  const catalog=setCatalogFixture({prepareMaterials:materials=>{
    const m=materials[shape.includes('packaging')?11:0]
    if(shape==='expired active'){
      m.lots=[{...m.lots[0],qty:500,expiryDay:0},{...m.lots[0],id:'UNEXPIRED',qty:999500,isInUse:false,expiryDay:999999,receiveDay:20001}]
    }else{
      m.stock=0
      m.lots=shape.startsWith('empty')?[]:[{...m.lots[0],qty:0,isInUse:shape==='zero active history'}]
      m.activeLotId=shape==='zero active history'?m.lots[0].id:''
    }
  }})
  const index=shape.includes('packaging')?11:0
  const m=prepareStockMaterial(catalog.materials[index]);catalog.materials[index]=m
  const f=planSetStockIn(catalog.shop,m)
  await seedSetCatalog(env,catalog)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('receives packaging without optional dates',async()=>{
  const f=fixture({packaging:true})
  const receipt=planSetStockIn(f.shop,f.before,{receiveDay:999999,expiryDay:999999})
  await seedSetCatalog(env,f.catalog)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),receipt).commit())
})

it.each(['maintenance','inactive generation','deleted material'])('rejects stock-in for %s',async state=>{
  const f=fixture()
  if(state==='maintenance'){f.shop.status='maintenance';f.nextShop.status='maintenance'}
  if(state==='inactive generation')f.nextShop.generation='g2'
  if(state==='deleted material'){f.before.deleted=true;f.next.deleted=true;f.catalog.materials[0]=f.before}
  await seedSetCatalog(env,f.catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertFails(setStockInBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(1)
})

it('allows a signed-in account without a profile and denies anonymous stock-in',async()=>{
  const f=fixture(); f.operation.uid='fresh-user';await seedSetCatalog(env,f.catalog)
  await assertFails(setStockInBatch(env.unauthenticatedContext().firestore(),f).commit())
  await assertSucceeds(setStockInBatch(env.authenticatedContext('fresh-user').firestore(),f).commit())
})

it('commits exactly one of two competing stock receipts',async()=>{
  const f=fixture(); await seedSetCatalog(env,f.catalog)
  const other=planSetStockIn(f.shop,f.before,{opId:'OTHER',uid:'other-user'})
  const results=await Promise.allSettled([
    setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit(),
    setStockInBatch(env.authenticatedContext('other-user').firestore(),other).commit(),
  ])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  expect((await getDoc(doc(env.authenticatedContext('cashier').firestore(),ROOT))).data().revision).toBe(2)
})

it('rejects changed receipts and old-operation material replay',async()=>{
  const f=fixture();await seedSetCatalog(env,f.catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setStockInBatch(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`),{...f.operation,qtyQ:1}))
  const replay={...f.next,stock:f.next.stock+f.operation.qtyQ,revision:f.next.revision+1}
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${replay.id}`),replay))
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data().stock).toBe(f.next.stock)
})

it('sells a six-line bill from the state produced by stock-in',async()=>{
  const f=fixture();await seedSetCatalog(env,f.catalog)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setStockInBatch(db,f).commit())
  const template=setCatalogFixture({lines:6})
  const resolved=(await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data()
  const sale=planSetCatalog({materials:f.catalog.materials.map(m=>m.id===f.next.id ? resolved : m),addons:f.catalog.addons,
    menus:f.nextShop.catalog.menus,platforms:f.nextShop.catalog.platforms,orderLines:template.order.lines,
    platformId:'P',opId:'AFTER-STOCK',shopState:f.nextShop})
  await assertSucceeds(setSaleBatch(db,sale).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(3)
})
