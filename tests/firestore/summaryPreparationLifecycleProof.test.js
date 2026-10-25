import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertFails,assertSucceeds } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc,deleteDoc,serverTimestamp,Timestamp,writeBatch } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch,preparedPath,preparedProof } from './summaryPreparedSale.js'
import { preparationPath,ensurePreparation,preparationDescriptor,closePreparationBatch,cleanupPreparationPage,reconcilePreparation,findPreparationPage } from './summaryPreparationLifecycle.js'
import { inventoryBatchFixture } from './summaryInventoryBatchFixture.js'
import { prepareInventoryBatch,inventoryBatchCommit } from './summaryPreparedInventory.js'
import { platformFixture } from './summaryPlatformFixture.js'
import { prepareSummaryPlatform } from './summaryPreparedPlatform.js'
import { summaryCatalogBatch } from './summaryCatalog.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { criticalProofPath } from './summaryPreparationLifecycle.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
import { summaryInventoryBatch } from './summaryInventoryBatch.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function sale(){const base=summaryFixture(),f=preparedSale(summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:[]}],{opId:'LIFECYCLE'}));return {base,f}}
const saved=async(db,kind,id)=>(await getDoc(doc(db,preparationPath(kind,id)))).data()
it('registers, discovers, abandons and cleans a sale without changing stock or allowing ID resurrection',async()=>{
  const {base,f}=sale(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(prepareSummarySale(db,f));const m=await saved(db,'sale_set',f.order.opId)
  expect(m.state).toBe('open');expect((await findPreparationPage(db,{before:Timestamp.now()})).size).toBe(1)
  await assertSucceeds(closePreparationBatch(db,m).commit());await assertFails(preparedSaleBatch(db,f).commit())
  const closed=await saved(db,m.kind,m.opId);await cleanupPreparationPage(db,closed)
  await assertFails(setDoc(doc(db,preparedPath(m.opId,0)),preparedProof(f,0,f.order.lines)))
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
  await assertFails(deleteDoc(doc(db,preparationPath(m.kind,m.opId))))
  await expect(ensurePreparation(db,preparationDescriptor(f,'sale_set'))).rejects.toThrow()
})
it('reconciles a lost sale response and cleans duplicate price proofs while retaining its receipt',async()=>{
  const {base,f}=sale(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareSummarySale(db,f)
  const m=await saved(db,'sale_set',f.order.opId);await preparedSaleBatch(db,f).commit()
  expect((await reconcilePreparation(db,m)).action).toBe('committed')
  const terminal=await saved(db,m.kind,m.opId);await cleanupPreparationPage(db,terminal)
  expect((await getDoc(doc(db,`${GENERATION}/orders/${m.opId}`))).exists()).toBe(true)
  await assertFails(preparedSaleBatch(db,f).commit());await assertFails(closePreparationBatch(db,m).commit())
})
it.each(['inventory_batch','platform'])('closes %s and prevents finalization and recreation',async kind=>{
  const {base,f}=kind==='inventory_batch'?inventoryBatchFixture():platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const prepare=()=>kind==='inventory_batch'?prepareInventoryBatch(db,f):prepareSummaryPlatform(db,f)
  await prepare();const m=await saved(db,kind,f.operation.opId)
  await closePreparationBatch(db,m).commit()
  await assertFails((kind==='inventory_batch'?inventoryBatchCommit(db,f):summaryCatalogBatch(db,f)).commit())
  await expect(prepare()).rejects.toThrow()
})
it.each(['sale_set','inventory_batch','platform'])('prevents two outcomes and reconciles concurrent finalization/abandonment for %s',async kind=>{
  const {base,f}=kind==='sale_set'?sale():kind==='inventory_batch'?inventoryBatchFixture():platformFixture()
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await (kind==='sale_set'?prepareSummarySale(db,f):kind==='inventory_batch'?prepareInventoryBatch(db,f):prepareSummaryPlatform(db,f))
  const id=kind==='sale_set'?f.order.opId:f.operation.opId,m=await saved(db,kind,id)
  const commit=kind==='sale_set'?preparedSaleBatch(db,f):kind==='inventory_batch'?inventoryBatchCommit(db,f):summaryCatalogBatch(db,f)
  const secondDevice=env.authenticatedContext('cashier').firestore()
  const results=await Promise.allSettled([commit.commit(),closePreparationBatch(secondDevice,m).commit()])
  const accepted=results.filter(r=>r.status==='fulfilled').length
  expect(accepted).toBeLessThanOrEqual(1)
  // Independent connections can both fail closed when the Emulator cannot
  // acquire a Rules service read during contention. Reconcile persisted state
  // before an explicit retry; a rejected request is never reported as success.
  if(accepted===0){
    for(const r of results)expect(r.reason.code).toBe('permission-denied')
    expect((await saved(db,kind,id)).state).toBe('open')
    expect((await getDoc(doc(db,criticalProofPath(m)))).exists()).toBe(true)
    expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
    expect((await reconcilePreparation(db,m)).action).toBe('resume')
    await assertSucceeds(closePreparationBatch(secondDevice,m).commit())
    await assertFails((kind==='sale_set'?preparedSaleBatch(db,f):kind==='inventory_batch'?inventoryBatchCommit(db,f):summaryCatalogBatch(db,f)).commit())
  }
  const receipt=await getDoc(doc(db,`${GENERATION}/${kind==='sale_set'?'orders':'operations'}/${id}`))
  if(receipt.exists())expect((await reconcilePreparation(db,await saved(db,kind,id))).action).toBe('committed')
  else {expect((await saved(db,kind,id)).state).toBe('abandoned');expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)}
})
it.each(['inventory_batch','platform'])('preserves a committed %s receipt when abandonment arrives later',async kind=>{
  const {base,f}=kind==='inventory_batch'?inventoryBatchFixture():platformFixture(),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base);await (kind==='inventory_batch'?prepareInventoryBatch(db,f):prepareSummaryPlatform(db,f))
  const m=await saved(db,kind,f.operation.opId)
  await assertSucceeds((kind==='inventory_batch'?inventoryBatchCommit(db,f):summaryCatalogBatch(db,f)).commit())
  await assertFails(closePreparationBatch(db,m).commit())
  expect((await reconcilePreparation(db,m)).action).toBe('committed')
  expect((await saved(db,kind,m.opId)).state).toBe('committed')
})
it('retains committed inventory movement snapshots while clearing proof pages',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f)
  const id=f.operation.opId,m=await saved(db,'inventory_batch',id);await inventoryBatchCommit(db,f).commit();await reconcilePreparation(db,m)
  const terminal=await saved(db,m.kind,id);let cursor=0,done=false
  while(!done){const page=await cleanupPreparationPage(db,terminal,{cursor,pageSize:2});cursor=page.nextCursor;done=page.done}
  expect((await getDoc(doc(db,`${GENERATION}/preparedInventory/${id}/steps/0`))).exists()).toBe(true)
  expect((await getDoc(doc(db,`${GENERATION}/preparedInventory/${id}`))).exists()).toBe(true)
  await assertFails(deleteDoc(doc(db,`${GENERATION}/preparedInventory/${id}/steps/0`)))
  await assertFails(deleteDoc(doc(db,`${GENERATION}/operations/${id}`)))
})
it.each(['inventory_batch','platform'])('rejects a manifest count that would close the wrong compulsory proof for %s',async kind=>{
  const {base,f}=kind==='inventory_batch'?inventoryBatchFixture():platformFixture({dense:true}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const d=preparationDescriptor(f,kind)
  await ensurePreparation(db,{...d,...(kind==='inventory_batch'?{stepCount:1}:{proofCount:1})})
  const path=kind==='inventory_batch'?`${GENERATION}/preparedInventory/${d.opId}`:`${GENERATION}/preparedPlatforms/${d.opId}`
  await assertFails(setDoc(doc(db,path),kind==='inventory_batch'?f.proposal:{...f.operation,catalog:f.nextShop.catalog}))
})
it('requires atomic compulsory-proof deletion when closing and blocks foreign closure before expiry',async()=>{
  const {base,f}=sale(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('second').firestore();await seedSetCatalog(env,base);await prepareSummarySale(db,f)
  const m=await saved(db,'sale_set',f.order.opId)
  await assertFails(setDoc(doc(db,preparationPath(m.kind,m.opId)),{...m,state:'abandoned',closedAt:serverTimestamp()}))
  await assertFails(closePreparationBatch(other,m).commit());await assertFails(closePreparationBatch(other,m,'expired').commit())
  await assertFails(deleteDoc(doc(db,criticalProofPath(m))))
  await assertFails(setDoc(doc(db,preparationPath(m.kind,m.opId)),{...m,proofCount:3}))
})
it('lets another signed-in account expire a seven-day stale preparation and prevents resurrection',async()=>{
  const {base,f}=sale(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('second').firestore();await seedSetCatalog(env,base);await prepareSummarySale(db,f)
  const m=await saved(db,'sale_set',f.order.opId),path=preparationPath(m.kind,m.opId)
  await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),path),{createdAt:Timestamp.fromMillis(Date.now()-8*86400000)},{merge:true}))
  const old=await saved(db,m.kind,m.opId);await assertSucceeds(closePreparationBatch(other,old,'expired').commit())
  await cleanupPreparationPage(other,await saved(other,m.kind,m.opId));await assertFails(preparedSaleBatch(db,f).commit())
  await assertFails(setDoc(doc(db,preparedPath(m.opId,0)),preparedProof(f,0,f.order.lines)))
})
it.each(['inventory_batch','platform'])('closes %s even when another command kind consumed its operation ID',async kind=>{
  const {base,f}=kind==='inventory_batch'?inventoryBatchFixture():platformFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await (kind==='inventory_batch'?prepareInventoryBatch(db,f):prepareSummaryPlatform(db,f));const m=await saved(db,kind,f.operation.opId)
  const material=base.materials[0],count=summaryCount(base.shop,base.materials,[{materialId:material.id,counts:[{id:material.lotIds[0],to:material.lotQty[material.lotIds[0]]}]}],{opId:m.opId})
  await summaryCountBatch(db,count).commit()
  await assertFails(setDoc(doc(db,preparationPath(m.kind,m.opId)),{...m,state:'committed',closedAt:serverTimestamp()}))
  await assertSucceeds(closePreparationBatch(db,m).commit())
  expect((await reconcilePreparation(db,m)).action).toBe('conflict')
  expect((await getDoc(doc(db,`${GENERATION}/operations/${m.opId}`))).data().kind).toBe('stock_count')
})
it('does not allow new noncritical proofs in the same batch that closes the manifest',async()=>{
  const {base,f}=inventoryBatchFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await prepareInventoryBatch(db,f,{omitProof:{step:0,proof:0}})
  const m=await saved(db,'inventory_batch',f.operation.opId),b=writeBatch(db)
  b.set(doc(db,preparationPath(m.kind,m.opId)),{...m,state:'abandoned',closedAt:serverTimestamp()});b.delete(doc(db,criticalProofPath(m)))
  b.set(doc(db,`${GENERATION}/preparedInventory/${m.opId}/steps/0/proofs/0`),{before:f.steps[0].before.S0,after:f.steps[0].after.S0})
  await assertFails(b.commit())
})
it.each(['materialId','revision','costRank','ingredientCostBaht','packagingCostCents','lotIds','extra'])('retains production-input validation in phase one: %s',async field=>{
  const base=summaryFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]};base.shop=materialRegistryShop(base.shop,base.materials)
  const f=summaryInventoryBatch(base.shop,base.materials,[{kind:'produce',materialId:'S12',input:{qtyQ:100,lotId:'AUDIT-PRODUCT',receiveDay:Math.floor((Date.now()+7*3600000)/86400000),expiryDay:999999,lotCreatedAtISO:'2026-10-25T00:00:00.000Z'}}],{opId:`FORGED-${field}`})
  const row=f.steps[0].command.inputs[0]
  if(field==='materialId')row.materialId='S1'
  else if(field==='lotIds')row.lotIds=[]
  else if(field==='extra')row.ignored=true
  else row[field]++
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertFails(prepareInventoryBatch(db,f));await assertFails(inventoryBatchCommit(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
})
