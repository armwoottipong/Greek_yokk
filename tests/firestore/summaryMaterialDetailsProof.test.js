import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { serverTimestamp,doc,getDoc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryMaterialDetails } from './summaryMaterialDetails.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(){
  const base=summaryFixture();base.shop=materialRegistryShop(base.shop,base.materials)
  const m=base.materials[0],details={category:'Fruit',packUnit:'กล่อง',shelfLifeDays:2.5,isSubIngredient:false},opId='DETAILS'
  // Hand-built independent oracle, deliberately not using the new planner.
  const next={...structuredClone(m),...details,revision:m.revision+1,lastOpId:opId,lastOpKind:'material_details',lastOpIndex:0}
  const nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'material_details'}
  const operation={schemaVersion:2,kind:'material_details',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,
    materialRevision:m.revision,shopRevision:nextShop.revision,beforeDetails:{},details}
  return {base,f:{next,nextShop,operation}}
}
it('atomically saves optional material details without rewriting inventory or prices',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data()).toEqual(f.next)
  expect((await getDoc(doc(db,ROOT))).data().catalogRevision).toBe(base.shop.catalogRevision)
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects missing details write %s',async key=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>f.next.stock++],['cost',f=>f.next.unitCost++],['lot quantity',f=>f.next.lotQty[f.next.lotIds[0]]++],
  ['lot expiry',f=>f.next.lots[f.next.lotIds[0]].expiryDay=1],['type',f=>{f.next.inventoryType='packaging'}],
  ['recipe',f=>f.next.recipeIndex.menus.SIMPLE++],['name',f=>{f.next.name='Unrelated'}],['unit',f=>{f.next.unit='kg'}],
  ['catalogue',f=>f.nextShop.catalogRevision++],['uid',f=>{f.operation.uid='other'}],
  ['old material revision',f=>f.operation.materialRevision--],['old shop revision',f=>f.operation.shopRevision--],
  ['false before presence',f=>{f.operation.beforeDetails={shelfLifeDays:null}}],
  ['category bound',f=>{f.next.category='a'.repeat(161);f.operation.details.category=f.next.category}],
  ['pack unit bound',f=>{f.next.packUnit='a'.repeat(33);f.operation.details.packUnit=f.next.packUnit}],
  ['negative shelf life',f=>{f.next.shelfLifeDays=-1;f.operation.details.shelfLifeDays=-1}],
  ['large shelf life',f=>{f.next.shelfLifeDays=100001;f.operation.details.shelfLifeDays=100001}],
  ['role flag type',f=>{f.next.isSubIngredient=0;f.operation.details.isSubIngredient=0}],
])('rejects details tampering %s',async(_,mutate)=>{
  const {base,f}=fixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects standalone replay of a previously accepted material document',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${f.next.id}`),{...f.next,revision:f.next.revision+1}))
})
const rowsWith=(rows,changes)=>rows.map(m=>changes.find(n=>n.id===m.id)||m)
it('matches the independent oracle and rejects the complete command twice',async()=>{
  const {base,f}=fixture(),actual=summaryMaterialDetails(base.shop,base.materials[0],f.operation.details,{opId:'DETAILS'})
  expect(actual).toEqual(f)
  await seedSetCatalog(env,base);const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(summarySwitchBatch(db,actual).commit());await assertFails(summarySwitchBatch(db,actual).commit())
})
it.each([{category:null},{category:''},{packUnit:null},{packUnit:''},{shelfLifeDays:null},{shelfLifeDays:0},{shelfLifeDays:0.125},{isSubIngredient:false},
  {category:'a'.repeat(160),packUnit:'p'.repeat(32),shelfLifeDays:100000,isSubIngredient:true}])('preserves precise detail value %j',async details=>{
  const {base}=fixture(),m=base.materials[0],f=summaryMaterialDetails(base.shop,m,details);await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore();await assertSucceeds(summarySwitchBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()
  for(const field of ['category','packUnit','shelfLifeDays','isSubIngredient']){
    expect(Object.hasOwn(saved,field)).toBe(Object.hasOwn(details,field))
    if(Object.hasOwn(details,field))expect(saved[field]).toBe(details[field])
  }
  expect(saved.lots).toEqual(m.lots);expect(saved.inventoryType).toBe(m.inventoryType)
})
it('saves exact old presence and cannot remove an unchanged nullable field',async()=>{
  const {base}=fixture(),m=base.materials[0];Object.assign(m,{category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false})
  const f=summaryMaterialDetails(base.shop,m,{shelfLifeDays:null}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const malformed={...f,next:structuredClone(f.next)};delete malformed.next.category
  await assertFails(summarySwitchBatch(db,malformed).commit());await assertSucceeds(summarySwitchBatch(db,f).commit())
  const receipt=(await getDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`))).data()
  expect(receipt.beforeDetails).toEqual({category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false})
  expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().shelfLifeDays).toBeNull()
})
it('fences stale sale plans and can reuse unchanged price proofs after a metadata-only replan',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines,{opId:'STAGED'}));await prepareSummarySale(db,sale)
  await assertSucceeds(summarySwitchBatch(db,f).commit());await assertFails(preparedSaleBatch(db,sale).commit())
  const materials=rowsWith(base.materials,[f.next]),fresh=preparedSale(summarySale(f.nextShop,materials,base.order.lines,{opId:'STAGED'}))
  await assertSucceeds(preparedSaleBatch(db,fresh).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/STAGED`))).data(),returned=summaryCancel(fresh.nextShop,rowsWith(materials,fresh.nextMaterials),order,{opId:'RETURN'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data()
  expect(saved.lotQty).toEqual(base.materials[0].lotQty);expect(saved.packUnit).toBe(f.next.packUnit);expect(saved.shelfLifeDays).toBe(2.5)
})
it('rejects details based on pre-sale stock, then accepts an edit of current material without undoing deductions',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines,{opId:'SALE-FIRST'}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());await assertFails(summarySwitchBatch(db,f).commit())
  const m=sale.nextMaterials.find(m=>m.id===f.next.id),fresh=summaryMaterialDetails(sale.nextShop,m,f.operation.details)
  await assertSucceeds(summarySwitchBatch(db,fresh).commit());expect(fresh.next.stock).toBe(m.stock);expect(fresh.next.lotQty).toEqual(m.lotQty)
})
it('serializes two account edits with equal access and retries from the winning snapshot',async()=>{
  const {base,f}=fixture(),a=env.authenticatedContext('cashier').firestore(),b=env.authenticatedContext('other').firestore();await seedSetCatalog(env,base)
  const other=summaryMaterialDetails(base.shop,base.materials[0],{packUnit:'Bottle'},{opId:'OTHER',uid:'other'})
  const result=await Promise.allSettled([summarySwitchBatch(a,f).commit(),summarySwitchBatch(b,other).commit()])
  expect(result.filter(row=>row.status==='fulfilled')).toHaveLength(1)
  const winner=result[0].status==='fulfilled'?f:other,loser=winner===f?other:f,target=winner===f?b:a
  const retry=summaryMaterialDetails(winner.nextShop,winner.next,loser.operation.details,{opId:loser.operation.opId,uid:loser.operation.uid})
  await assertSucceeds(summarySwitchBatch(target,retry).commit())
  expect((await getDoc(doc(a,`${GENERATION}/materials/${winner.next.id}`))).data().packUnit).toBe(retry.next.packUnit)
})
it.each(['anonymous','archived','unregistered','wrong generation','paused'])('rejects details on %s context',async mode=>{
  const {base,f}=fixture()
  if(mode==='archived'){base.materials[0].deleted=true;f.next.deleted=true}
  if(mode==='unregistered'){base.shop.materialIds=[];f.nextShop.materialIds=[]}
  if(mode==='wrong generation'){base.shop.generation='other';f.nextShop.generation='other'}
  if(mode==='paused'){base.shop.status='paused';f.nextShop.status='paused'}
  await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(mode==='anonymous'?env.unauthenticatedContext().firestore():env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['empty patch','unexpected patch field','remove receipt snapshot field','wrong existing before value','unchanged patch'])('rejects invalid patch semantics %s',async mode=>{
  const {base,f}=fixture()
  if(mode==='empty patch')f.operation.details={}
  if(mode==='unexpected patch field'){f.operation.details.unit='kg';f.next.unit='kg'}
  if(mode==='remove receipt snapshot field')delete f.operation.beforeDetails
  if(mode==='wrong existing before value'){base.materials[0].category='Old';f.operation.beforeDetails={category:'Forged'}}
  if(mode==='unchanged patch')Object.assign(base.materials[0],f.operation.details)
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
