import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { packageStockFixture } from './summaryPackageStockFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { setStockInBatch } from './setStockInFixture.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryPackageStock } from './summaryPackageStock.js'
import { summaryMaterialType } from './summaryMaterialType.js'
import { summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('receives packaging with four working lots while retaining original IDs and every other balance',async()=>{
  const {base,f}=packageStockFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(setStockInBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data(),before=base.materials[11]
  expect(saved.lotIds).toEqual(before.lotIds)
  for(const id of before.lotIds.filter(id=>id!==f.operation.lotId)){
    expect(saved.lots[id]).toEqual(before.lots[id]);expect(saved.lotQty[id]).toBe(before.lotQty[id])
  }
  const receipt=(await getDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`))).data()
  expect(receipt.beforeLot).toEqual(before.lots[f.operation.lotId])
  expect((await getDoc(doc(db,ROOT))).data().catalogRevision).toBe(base.shop.catalogRevision)
})

const receiptInput={qtyQ:1200,unitCost:0.5,packCostCents:500,receiveDay:21000,note:'New delivery',opId:'PACKAGE-RECEIPT'}
const rowsWith=(materials,rows)=>materials.map(m=>rows.find(n=>n.id===m.id)||m)
const receiptPath=id=>`${GENERATION}/operations/${id}`
it('matches the independent four-lot oracle',()=>{
  const {base,f}=packageStockFixture(),actual=summaryPackageStock(base.shop,base.materials[11],receiptInput)
  expect(actual.next).toEqual(f.next);expect(actual.nextShop).toEqual(f.nextShop);expect(actual.operation).toEqual(f.operation)
})
it('reclassifies both ways, receives, sells and returns an older bill to original lots exactly once',async()=>{
  const {base}=packageStockFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  let shop=base.shop,materials=base.materials
  const ingredient=summaryMaterialType(shop,materials,'S11','ingredient',{opId:'AS-INGREDIENT'})
  await assertSucceeds(summaryCatalogBatch(db,ingredient).commit());shop=ingredient.nextShop;materials=rowsWith(materials,ingredient.nextMaterials)
  const old=preparedSale(summarySale(shop,materials,[{menuId:'SIMPLE',qty:12}],{opId:'OLD-BILL'}))
  await prepareSummarySale(db,old);await assertSucceeds(preparedSaleBatch(db,old).commit());shop=old.nextShop;materials=rowsWith(materials,old.nextMaterials)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/OLD-BILL`))).data()
  const pack=summaryMaterialType(shop,materials,'S11','packaging',{opId:'AS-PACKAGING'})
  await assertSucceeds(summaryCatalogBatch(db,pack).commit());shop=pack.nextShop;materials=rowsWith(materials,pack.nextMaterials)
  const receive=summaryPackageStock(shop,materials[11],receiptInput)
  await assertSucceeds(setStockInBatch(db,receive).commit());shop=receive.nextShop;materials=rowsWith(materials,[receive.next])
  const sale=preparedSale(summarySale(shop,materials,[{menuId:'SIMPLE',qty:1}],{opId:'NEW-BILL'}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());shop=sale.nextShop;materials=rowsWith(materials,sale.nextMaterials)
  const returned=summaryCancel(shop,materials,order,{opId:'OLD-RETURN'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S11`))).data(),original=base.materials[11]
  expect(saved.lotIds).toEqual(original.lotIds);expect(saved.stock).toBe(original.stock+receiptInput.qtyQ)
  for(const id of original.lotIds)expect(saved.lotQty[id]).toBe(original.lotQty[id]+(id===receive.operation.lotId?receiptInput.qtyQ:0))
  expect(saved.lots).toEqual(receive.next.lots);expect(saved.unitCost).toBe(receive.next.unitCost)
})
it('rejects stale sale after receipt and reuses unchanged price proofs after replanning',async()=>{
  const {base}=packageStockFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const lines=[{menuId:'SIMPLE',qty:1}],stale=preparedSale(summarySale(base.shop,base.materials,lines,{opId:'STAGED'}))
  await prepareSummarySale(db,stale)
  const receive=summaryPackageStock(base.shop,base.materials[11],receiptInput)
  await assertSucceeds(setStockInBatch(db,receive).commit());await assertFails(preparedSaleBatch(db,stale).commit())
  const fresh=preparedSale(summarySale(receive.nextShop,rowsWith(base.materials,[receive.next]),lines,{opId:'STAGED'}))
  await assertSucceeds(preparedSaleBatch(db,fresh).commit())
})
it('rejects stale receipt after sale and accepts a receipt replanned from current balances',async()=>{
  const {base}=packageStockFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const receive=summaryPackageStock(base.shop,base.materials[11],receiptInput)
  const sale=preparedSale(summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1}],{opId:'SALE-FIRST'}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  await assertFails(setStockInBatch(db,receive).commit())
  const fresh=summaryPackageStock(sale.nextShop,rowsWith(base.materials,sale.nextMaterials)[11],receiptInput)
  await assertSucceeds(setStockInBatch(db,fresh).commit())
  expect(fresh.operation.beforeStockQ).toBe(sale.nextMaterials[11].stock)
})
it('allows one of two signed-in accounts to win the shared revision, then accepts a fresh retry',async()=>{
  const {base}=packageStockFixture();await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('second-account').firestore()
  const first=summaryPackageStock(base.shop,base.materials[11],receiptInput)
  const second=summaryPackageStock(base.shop,base.materials[11],{...receiptInput,opId:'SECOND',uid:'second-account'})
  const results=await Promise.allSettled([setStockInBatch(db,first).commit(),setStockInBatch(other,second).commit()])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const winner=results[0].status==='fulfilled'?first:second,loser=winner===first?second:first,loserDb=winner===first?other:db
  const retry=summaryPackageStock(winner.nextShop,winner.next,{...receiptInput,opId:loser.operation.opId,uid:loser.operation.uid})
  await assertSucceeds(setStockInBatch(loserDb,retry).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/S11`))).data().stock).toBe(base.materials[11].stock+2*receiptInput.qtyQ)
})
it('rejects duplicate command and standalone replay of a previously accepted material',async()=>{
  const {base,f}=packageStockFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(setStockInBatch(db,f).commit());await assertFails(setStockInBatch(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/S11`),{...f.next,revision:f.next.revision+1}))
})
it.each(['cashier','second-account'])('preserves existing notes and zero-cost stock for %s',async uid=>{
  const {base}=packageStockFixture(),m=base.materials[11],master=m.slotIds[0];m.lots[master].unitCost=0;m.lots[master].note='Original provenance'
  await seedSetCatalog(env,base)
  const f=summaryPackageStock(base.shop,m,{...receiptInput,note:'',uid}),db=env.authenticatedContext(uid).firestore()
  await assertSucceeds(setStockInBatch(db,f).commit())
  expect(f.next.lots[master].note).toBe('Original provenance')
  expect(f.next.lots[master].unitCost).toBeLessThan(receiptInput.unitCost)
  expect((await getDoc(doc(db,receiptPath(f.operation.opId)))).data().beforeLot.unitCost).toBe(0)
})
it('selects the next positive slot after a zero active slot and preserves its old date in history',async()=>{
  const {base}=packageStockFixture(),m=base.materials[11],first=m.slotIds[0],second=m.slotIds[1]
  m.stock-=m.lotQty[first];m.lotQty[first]=0;m.zeroActiveIds=[first];m.activeLotId=second
  await seedSetCatalog(env,base)
  const f=summaryPackageStock(base.shop,m,receiptInput)
  expect(f.operation.lotId).toBe(second)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.operation.beforeLot.expiryDay).toBe(m.lots[second].expiryDay)
  expect(f.next.lots[first]).toEqual(m.lots[first]);expect(f.next.zeroActiveIds).toEqual([])
})
it('retains a depleted working master instead of activating unrelated historical first lot',async()=>{
  const {base}=packageStockFixture(),m=base.materials[11],master=m.slotIds[0],historic='UNRELATED-HISTORIC'
  m.lotIds.unshift(historic);m.lots[historic]={...structuredClone(m.lots[master]),id:historic};m.lotQty[historic]=0
  for(const id of m.allocationIds)m.lotQty[id]=0
  m.stock=0;m.activeLotId='';m.zeroActiveIds=[]
  await seedSetCatalog(env,base)
  const f=summaryPackageStock(base.shop,m,receiptInput)
  expect(f.operation.lotId).toBe(master)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.next.lotQty[historic]).toBe(0);expect(f.next.unitCost).toBe(receiptInput.unitCost)
})
it.each([0,100000])('accepts equal boundary costs %s without numeric drift',async cost=>{
  const {base}=packageStockFixture(),m=base.materials[11];m.unitCost=cost
  for(const id of m.lotIds)m.lots[id].unitCost=cost
  await seedSetCatalog(env,base)
  const f=summaryPackageStock(base.shop,m,{...receiptInput,unitCost:cost,qtyQ:1000000000-m.stock,packCostCents:1000000000,receiveDay:999999})
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.next.stock).toBe(1000000000);expect(f.next.unitCost).toBe(cost)
})
it('rejects unauthenticated receipt',async()=>{
  const {base,f}=packageStockFixture();await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.unauthenticatedContext().firestore(),f).commit())
})
it('receives after a four-lot sellout and returns the old bill without creating a fifth working lot',async()=>{
  const {base}=packageStockFixture(),m=base.materials[11],first=m.slotIds[0],last=m.slotIds[3],historic='UNRELATED-HISTORIC'
  m.lotQty[last]=1000;m.stock=3000
  m.lotIds.unshift(historic);m.lots[historic]={...structuredClone(m.lots[first]),id:historic};m.lotQty[historic]=0
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const type=summaryMaterialType(base.shop,base.materials,'S11','ingredient',{opId:'INGREDIENT'})
  await assertSucceeds(summaryCatalogBatch(db,type).commit())
  const sale=preparedSale(summarySale(type.nextShop,type.nextMaterials,[{menuId:'SIMPLE',qty:30}],{opId:'SELL-OUT'}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  expect(sale.nextMaterials[11].stock).toBe(0)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/SELL-OUT`))).data()
  const pack=summaryMaterialType(sale.nextShop,sale.nextMaterials,'S11','packaging',{opId:'PACKAGING'})
  await assertSucceeds(summaryCatalogBatch(db,pack).commit())
  const receive=summaryPackageStock(pack.nextShop,pack.nextMaterials[11],receiptInput)
  expect(receive.operation.lotId).toBe(first)
  await assertSucceeds(setStockInBatch(db,receive).commit())
  const returned=summaryCancel(receive.nextShop,rowsWith(pack.nextMaterials,[receive.next]),order,{opId:'RETURN-FOUR'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S11`))).data()
  expect(saved.allocationIds).toHaveLength(4);expect(saved.lotQty[historic]).toBe(0);expect(saved.stock).toBe(4200)
})
it('creates a first packaging lot through the existing new-lot command',async()=>{
  const {base}=packageStockFixture(),m=base.materials[11],sentinel=structuredClone(m.lots._)
  Object.assign(m,{stock:0,lotIds:[],lots:{_:sentinel},lotQty:{_:0},zeroActiveIds:[],allocationIds:[],slotIds:['_','_','_','_'],activeLotId:''})
  await seedSetCatalog(env,base)
  const f=summaryPackageStock(base.shop,m,{...receiptInput,newLotId:'FIRST-PACKAGE',businessDay:22000})
  expect(f.operation.kind).toBe('stock_in')
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  ['negative cost',f=>{f.operation.unitCost=-1}],['over cost bound',f=>{f.operation.unitCost=100001}],
  ['fractional quantity',f=>{f.operation.qtyQ=1.5}],['zero quantity',f=>{f.operation.qtyQ=0}],
  ['invalid date',f=>{f.operation.receiveDay=100001}],['fractional pack cost',f=>{f.operation.packCostCents=0.5}],
  ['long note',f=>{f.operation.note='n'.repeat(1001)}],['lost active snapshot',f=>{f.operation.beforeActiveLotId=''}],
  ['wrong zero snapshot',f=>{f.operation.beforeZeroActiveIds=['forged']}],
  ['legacy quantity',f=>{f.next.lots[f.operation.lotId].qty++}],['legacy active flag',f=>{f.next.lots[f.operation.lotId].isInUse=false}],
  ['lot creation provenance',f=>{f.next.lots[f.operation.lotId].createdAt='changed'}],
  ['finite expiry',f=>{f.next.lots[f.operation.lotId].expiryDay=22000}],
  ['deleted material',f=>{f.next.deleted=true}],['extra receipt field',f=>{f.operation.extra=true}],
])('rejects additional package tampering: %s',async(_,mutate)=>{
  const {base,f}=packageStockFixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['archived','ingredient','paused shop','wrong generation'])('rejects receipt against %s',async mode=>{
  const {base,f}=packageStockFixture()
  if(mode==='archived'){base.materials[11].deleted=true;f.next.deleted=true}
  if(mode==='ingredient'){base.materials[11].inventoryType='ingredient';f.next.inventoryType='ingredient'}
  if(mode==='paused shop'){base.shop.status='paused';f.nextShop.status='paused'}
  if(mode==='wrong generation'){base.shop.generation='other';f.nextShop.generation='other'}
  await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects incomplete package receipt %s',async key=>{
  const {base,f}=packageStockFixture();await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['total stock',f=>f.next.stock++],['material cost',f=>f.next.unitCost++],['received quantity',f=>f.next.lotQty[f.operation.lotId]++],
  ['another balance',f=>f.next.lotQty[f.next.lotIds[1]]++],['discard lot',f=>f.next.lotIds.pop()],
  ['discard history',f=>{delete f.next.lots[f.next.lotIds[1]]}],['other lot metadata',f=>f.next.lots[f.next.lotIds[1]].unitCost++],
  ['before snapshot',f=>f.operation.beforeLot.unitCost++],['before quantity',f=>f.operation.beforeLotQtyQ++],
  ['before stock',f=>f.operation.beforeStockQ++],['before cost',f=>f.operation.beforeUnitCost++],
  ['type',f=>{f.next.inventoryType='ingredient'}],['catalog',f=>f.nextShop.catalogRevision++],
  ['uid',f=>{f.operation.uid='other'}],['stale material',f=>f.operation.materialRevision--],['stale shop',f=>f.operation.shopRevision--],
])('rejects package receipt forgery %s',async(_,mutate)=>{
  const {base,f}=packageStockFixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
