import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc,deleteDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { inventoryBatchFixture } from './summaryInventoryBatchFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { prepareInventoryBatch,inventoryBatchCommit,inventoryPath } from './summaryPreparedInventory.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryInventoryBatch } from './summaryInventoryBatch.js'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { typeFixture } from './summaryMaterialTypeFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('prepares receive then count on the same material and commits the verified final state once',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(prepareInventoryBatch(db,f))
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
  expect((await getDoc(doc(db,`${GENERATION}/materials/${base.materials[0].id}`))).data()).toEqual(base.materials[0])
  await assertSucceeds(inventoryBatchCommit(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${base.materials[0].id}`))).data()
  expect(saved.stock).toBe(base.materials[0].stock+900);expect(saved.lotQty['DRAFT-LOT']).toBe(900)
  expect(saved.revision).toBe(base.materials[0].revision+1)
})
const day=()=>Math.floor((Date.now()+7*3600000)/86400000)
const receive=(id,lot='RECEIVED')=>({kind:'receive',materialId:id,input:{qtyQ:10000,unitCost:0.75,packCostCents:750,receiveDay:day(),expiryDay:999999,newLotId:lot,note:'Receipt',lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}})
function productionBase(){
  const base=summaryFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  base.shop=materialRegistryShop(base.shop,base.materials);return base
}
const produce=()=>({kind:'produce',materialId:'S12',input:{qtyQ:10000,lotId:'PRODUCT',receiveDay:day(),expiryDay:999999,note:'Production',lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}})
const replace=(rows,changes)=>rows.map(m=>changes.find(n=>n.id===m.id)||m)
it('receives an ingredient, produces from its new weighted cost, then counts the same ingredient',async()=>{
  const base=productionBase(),actions=[receive('S0'),produce(),{kind:'count',materialId:'S0',counts:[{id:base.materials[0].lotIds[0],to:980000}],reason:'Count after production'}]
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{opId:'RECEIVE-PRODUCE-COUNT'}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const old=base.materials[0],weighted=Math.round((((old.stock/100)*old.unitCost+100*0.75)/((old.stock+10000)/100))*10000)/10000
  expect(f.steps[0].after.S0.unitCost).toBe(weighted)
  const command=f.steps[1].command,raw=(command.inputs[0].needed/100)*weighted+(command.inputs[1].needed/100)*base.materials[1].unitCost
  expect(command.rawCostBaht).toBe(raw);expect(f.steps[1].after.S12.lots.PRODUCT.unitCost).toBe(raw/100)
  await assertSucceeds(prepareInventoryBatch(db,f));await assertSucceeds(inventoryBatchCommit(db,f).commit())
  for(const m of f.nextMaterials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
  expect(f.nextMaterials.find(m=>m.id==='S0').revision).toBe(old.revision+1)
})
it('atomically commits all five action kinds at the six-step/six-material boundary',async()=>{
  const base=productionBase(),actions=[receive('S0'),produce(),receive('S11'),
    {kind:'count',materialId:'S2',counts:[{id:base.materials[2].lotIds[0],to:999900}],note:'Physical count'},
    {kind:'waste',materialId:'S3',lotId:base.materials[3].lotIds[0],qtyQ:100,reason:'Damage'},
    {kind:'switch',materialId:'S1',lotId:base.materials[1].lotIds[0]}]
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{opId:'MAX-BOUND'}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  expect(f.proposal.materialIds).toHaveLength(6);expect(f.steps).toHaveLength(6)
  await assertSucceeds(prepareInventoryBatch(db,f));await assertSucceeds(inventoryBatchCommit(db,f).commit());await assertFails(inventoryBatchCommit(db,f).commit())
  for(const m of f.nextMaterials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
})
it('validates production consumption across four working lots while preserving old output-lot history',async()=>{
  const {base}=typeFixture({fourLots:true}),output=base.materials[12],first=output.lotIds[0]
  output.productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  for(const id of output.lotIds)output.lotQty[id]=id===first?500:0
  output.stock=500;output.allocationIds=[first];output.slotIds=[first,'_','_','_'];output.activeLotId=first;output.zeroActiveIds=[]
  base.shop=materialRegistryShop(base.shop,base.materials)
  const f=summaryInventoryBatch(base.shop,base.materials,[{...produce(),input:{...produce().input,qtyQ:120000}}],{opId:'FOUR-LOT-PRODUCTION'}),db=env.authenticatedContext('cashier').firestore()
  expect(f.steps[0].command.inputs[0].lotTakes.every(q=>q>0)).toBe(true)
  await seedSetCatalog(env,base);await assertSucceeds(prepareInventoryBatch(db,f));await assertSucceeds(inventoryBatchCommit(db,f).commit())
  expect(f.nextMaterials.find(m=>m.id===output.id).lotIds).toEqual([...output.lotIds,'PRODUCT'])
})
it.each([
  ['stock after receipt',f=>f.steps[0].after.S0.stock++],['unit cost',f=>f.steps[0].after.S0.unitCost++],
  ['lot quantity',f=>f.steps[0].after.S0.lotQty['DRAFT-LOT']++],['lot note',f=>{f.steps[0].after.S0.lots['DRAFT-LOT'].note='Forged'}],
  ['immutable name',f=>{f.steps[0].after.S0.name='Forged'}],['before snapshot',f=>f.steps[0].before.S0.stock++],
  ['step order',f=>{f.steps.reverse()}],['next before snapshot',f=>f.steps[1].before.S0.unitCost++],
  ['count from',f=>f.steps[1].command.rows[0].counts[0].from++],['count value',f=>f.steps[1].after.S0.lotQty['DRAFT-LOT']++],
  ['phantom material',f=>{f.steps[0].after.EXTRA=f.steps[0].after.S0}],['unapproved field',f=>{f.steps[0].command.offline=true}],
  ['status',f=>{f.steps[0].command.status='committed'}],['uid',f=>{f.steps[0].command.uid='other'}],
])('rejects forged intermediate state %s',async(_,mutate)=>{
  const {base,f}=inventoryBatchFixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(prepareInventoryBatch(env.authenticatedContext('cashier').firestore(),f))
})
it.each([
  ['initial material',f=>f.proposal.initial.S0.stock++],['old global revision',f=>f.proposal.rootRevision--],
  ['previous business day',f=>f.proposal.businessDay--],['seven steps',f=>f.proposal.stepCount=7],
  ['missing IDs',f=>f.proposal.materialIds=[]],['duplicate IDs',f=>f.proposal.materialIds.push('S0')],['unexpected field',f=>{f.proposal.queue=true}],
])('rejects invalid proposal %s',async(_,mutate)=>{
  const {base,f}=inventoryBatchFixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(prepareInventoryBatch(env.authenticatedContext('cashier').firestore(),f))
})
it.each([{step:0,proof:0},{step:0,proof:1},{step:0,proof:2},{step:1,proof:0},{step:1,proof:1},{step:1,proof:2}])('rejects incomplete proof chain %j',async omitProof=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await prepareInventoryBatch(db,f,{omitProof});await assertFails(inventoryBatchCommit(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
})
it.each(['wrong stock','old global revision','missing material ID','extra receipt field','wrong UID'])('rejects tampered final result %s',async mode=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f)
  if(mode==='wrong stock')f.nextMaterials[0].stock++
  if(mode==='old global revision')f.nextShop.revision--
  if(mode==='missing material ID')f.operation.materialIds=[]
  if(mode==='extra receipt field')f.operation.partial=true
  if(mode==='wrong UID')f.operation.uid='other'
  await assertFails(inventoryBatchCommit(db,f).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()).toEqual(base.materials[0])
})
it('rejects standalone material replay, proposal changes and proof mutation/deletion',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f)
  await assertFails(setDoc(doc(db,inventoryPath(f.operation.opId)),f.proposal))
  await assertFails(deleteDoc(doc(db,`${inventoryPath(f.operation.opId)}/steps/0/proofs/0`)))
  await assertFails(setDoc(doc(db,`${inventoryPath(f.operation.opId)}/steps/0`),f.steps[0]))
  await assertSucceeds(inventoryBatchCommit(db,f).commit());await assertFails(inventoryBatchCommit(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/S0`),{...f.nextMaterials[0],revision:f.nextMaterials[0].revision+1}))
})
it('rejects preparation made stale by a sale, keeps the draft unchanged and accepts a newly prepared ID',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f)
  const untouched=structuredClone(f.steps),sale=preparedSale(summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:[]}],{opId:'SALE-FIRST'}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());await assertFails(inventoryBatchCommit(db,f).commit())
  expect(f.steps).toEqual(untouched)
  const materials=replace(base.materials,sale.nextMaterials),fresh=summaryInventoryBatch(sale.nextShop,materials,[receive('S0','FRESH-LOT')],{opId:'FRESH-DRAFT'})
  await assertSucceeds(prepareInventoryBatch(db,fresh));await assertSucceeds(inventoryBatchCommit(db,fresh).commit())
  expect(fresh.nextMaterials[0].stock).toBe(materials[0].stock+10000)
})
it('rejects a stale staged sale after a draft, then sells and returns the original lot IDs',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const line=[{menuId:'SIMPLE',qty:1,optionIds:[]}],stale=preparedSale(summarySale(base.shop,base.materials,line,{opId:'STAGED'}));await prepareSummarySale(db,stale)
  await prepareInventoryBatch(db,f);await inventoryBatchCommit(db,f).commit();await assertFails(preparedSaleBatch(db,stale).commit())
  const materials=replace(base.materials,f.nextMaterials),fresh=preparedSale(summarySale(f.nextShop,materials,line,{opId:'STAGED'}))
  await assertSucceeds(preparedSaleBatch(db,fresh).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/STAGED`))).data(),returned=summaryCancel(fresh.nextShop,replace(materials,fresh.nextMaterials),order,{opId:'RETURN-AFTER-DRAFT'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/S0`))).data().lotQty).toEqual(f.nextMaterials[0].lotQty)
})
it('lets one of two accounts commit first and requires a fresh proposal for the other draft',async()=>{
  const {base}=inventoryBatchFixture(),a=env.authenticatedContext('cashier').firestore(),b=env.authenticatedContext('second').firestore();await seedSetCatalog(env,base)
  const left=summaryInventoryBatch(base.shop,base.materials,[receive('S0','A-LOT')],{opId:'LEFT'}),right=summaryInventoryBatch(base.shop,base.materials,[receive('S0','B-LOT')],{opId:'RIGHT',uid:'second'})
  await prepareInventoryBatch(a,left);await prepareInventoryBatch(b,right)
  const result=await Promise.allSettled([inventoryBatchCommit(a,left).commit(),inventoryBatchCommit(b,right).commit()])
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const winner=result[0].status==='fulfilled'?left:right,loser=winner===left?right:left,db=winner===left?b:a
  const retry=summaryInventoryBatch(winner.nextShop,replace(base.materials,winner.nextMaterials),[receive('S0','RETRY-LOT')],{opId:'RETRY',uid:loser.operation.uid})
  await prepareInventoryBatch(db,retry);await assertSucceeds(inventoryBatchCommit(db,retry).commit())
  expect((await getDoc(doc(a,`${GENERATION}/materials/S0`))).data().stock).toBe(base.materials[0].stock+20000)
})
it('keeps all active materials unchanged if a later production step is invalid',async()=>{
  const base=productionBase(),f=summaryInventoryBatch(base.shop,base.materials,[receive('S0'),produce()],{opId:'BAD-LATER'}),db=env.authenticatedContext('cashier').firestore()
  f.steps[1].command.rawCostBaht++
  await seedSetCatalog(env,base);await assertFails(prepareInventoryBatch(db,f));await assertFails(inventoryBatchCommit(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
  for(const m of base.materials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
})
it('fences a previously prepared business day at final commit',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f)
  // Trusted test seed models preparation from yesterday; clients cannot change it.
  await env.withSecurityRulesDisabled(async context=>{
    const prior=(await getDoc(doc(context.firestore(),inventoryPath(f.operation.opId)))).data()
    await setDoc(doc(context.firestore(),inventoryPath(f.operation.opId)),{...prior,businessDay:day()-1})
  })
  f.operation.businessDay=day()-1
  await assertFails(inventoryBatchCommit(db,f).commit())
})
it.each(['anonymous','archived','unregistered','wrong generation','paused shop'])('rejects draft preparation in %s context',async mode=>{
  const {base,f}=inventoryBatchFixture()
  if(mode==='archived'){base.materials[0].deleted=true;f.proposal.initial.S0.deleted=true}
  if(mode==='unregistered')base.shop.materialIds=[]
  if(mode==='wrong generation')base.shop.generation='wrong'
  if(mode==='paused shop')base.shop.status='paused'
  await seedSetCatalog(env,base)
  const db=mode==='anonymous'?env.unauthenticatedContext().firestore():env.authenticatedContext('cashier').firestore()
  await assertFails(prepareInventoryBatch(db,f))
})
it('rejects another account using a proposal or skipping a material proof',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('other').firestore();await seedSetCatalog(env,base)
  await prepareInventoryBatch(db,f,{omitProof:{step:0,proof:0}})
  await assertFails(setDoc(doc(other,`${inventoryPath(f.operation.opId)}/steps/0/proofs/0`),{before:f.steps[0].before.S0,after:f.steps[0].after.S0}))
  await assertFails(setDoc(doc(db,`${inventoryPath(f.operation.opId)}/steps/0/proofs/1`),{before:f.steps[0].before.S0,after:f.steps[0].after.S0}))
  await assertFails(inventoryBatchCommit(other,f).commit())
})
it.each(['omitShop','omitOperation','omitMaterial'])('rejects incomplete final inventory commit %s',async key=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await prepareInventoryBatch(db,f)
  await assertFails(inventoryBatchCommit(db,f,{[key]:key==='omitMaterial'?f.proposal.materialIds[0]:true}).commit())
})
