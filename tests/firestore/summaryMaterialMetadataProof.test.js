import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { serverTimestamp } from 'firebase/firestore'
import { summaryMaterialMetadata } from './summaryMaterialMetadata.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
// Hand-built command first: Rules, rather than client validation, must enforce it.
function fixture(){
  const base=summaryFixture(),m=base.materials[0],opId='MATERIAL-METADATA'
  const metadata={name:'Plain yogurt',emoji:'🥣',minAlertQ:150}
  const f={nextShop:{...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'material_metadata'},
    next:{...structuredClone(m),...metadata,revision:m.revision+1,lastOpId:opId,lastOpKind:'material_metadata',lastOpIndex:0},
    operation:{schemaVersion:2,kind:'material_metadata',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,materialRevision:m.revision,shopRevision:base.shop.revision+1,metadata}}
  return {base,f}
}
it('atomically edits display metadata and the scaled low-stock threshold',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  const result=(await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data()
  expect(result.name).toBe(f.next.name);expect(result.lotQty).toEqual(base.materials[0].lotQty)
  expect(result.recipeIndex).toEqual(base.materials[0].recipeIndex)
  expect((await getDoc(doc(db,ROOT))).data().catalogRevision).toBe(base.shop.catalogRevision)
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects incomplete metadata command %s',async key=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>{f.next.stock++}],['lot quantity',f=>{f.next.lotQty[f.next.lotIds[0]]++}],
  ['cost',f=>{f.next.unitCost++}],['pack size',f=>{f.next.packSize++}],
  ['recipe',f=>{f.next.recipeIndex.quantities[0]++}],['archive',f=>{f.next.deleted=true}],
  ['type',f=>{f.next.inventoryType='packaging'}],['production recipe',f=>{f.next.productionRecipe={}}],
  ['catalog',f=>{f.nextShop.catalogRevision++}],['membership',f=>{f.nextShop.catalog.summaryMaterials.reverse()}],
  ['name missing',f=>{delete f.next.name}],['empty name',f=>{f.next.name=''}],
  ['long name',f=>{f.next.name='a'.repeat(161)}],['emoji type',f=>{f.next.emoji=1}],
  ['long emoji',f=>{f.next.emoji='a'.repeat(33)}],['negative threshold',f=>{f.next.minAlertQ=-1}],
  ['fractional threshold',f=>{f.next.minAlertQ=0.5}],['oversized threshold',f=>{f.next.minAlertQ=1000000001}],
  ['receipt snapshot',f=>{f.operation.metadata.name='Other'}],['extra metadata',f=>{f.operation.metadata.stock=0}],
  ['uid',f=>{f.operation.uid='other'}],['stale material',f=>{f.operation.materialRevision--}],
  ['stale shop',f=>{f.operation.shopRevision--}],['revision jump',f=>{f.next.revision++}],
])('rejects metadata forgery: %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  {name:''},{name:'a'.repeat(161)},{name:2},{emoji:1},{emoji:'a'.repeat(33)},
  {minAlertQ:-1},{minAlertQ:0.5},{minAlertQ:1000000001},{minAlertQ:NaN},{minAlertQ:Infinity},
])('rejects invalid values even with an identical receipt snapshot %j',async patch=>{
  const {base,f}=fixture();Object.assign(f.next,patch);Object.assign(f.operation.metadata,patch);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('accepts maximum field sizes and zero alert, preserving all quantity and cost fields',async()=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const f=summaryMaterialMetadata(base.shop,base.materials[0],{name:'a'.repeat(160),emoji:'a'.repeat(32),minAlertQ:0})
  await seedSetCatalog(env,base);await assertSucceeds(summarySwitchBatch(db,f).commit())
  const next=summaryMaterialMetadata(f.nextShop,f.next,{name:'Another',emoji:'',minAlertQ:1000000000},{opId:'SECOND'})
  await assertSucceeds(summarySwitchBatch(db,next).commit())
})
it.each(['materialRevision','shopRevision','materialId','metadata'])('requires receipt field %s',async key=>{
  const {base,f}=fixture();delete f.operation[key];await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects anonymous writes and permits a second signed-in account without roles',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.unauthenticatedContext().firestore(),f).commit())
  f.operation.uid='second-account'
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('second-account').firestore(),f).commit())
})
it('rejects archived materials and inactive generations',async()=>{
  const {base,f}=fixture();base.materials[0].deleted=true;f.next.deleted=true;await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  await env.clearFirestore();base.materials[0].deleted=false;f.next.deleted=false;base.shop.generation='another';f.nextShop.generation='another';await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('prevents stale sale overwrites and reuses unchanged price proofs after replanning stock',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await seedSetCatalog(env,base);await assertSucceeds(prepareSummarySale(db,sale))
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  await assertFails(preparedSaleBatch(db,sale).commit())
  const updated=base.materials.map(m=>m.id===f.next.id?f.next:m)
  const replanned=preparedSale(summarySale(f.nextShop,updated,base.order.lines))
  await assertSucceeds(preparedSaleBatch(db,replanned).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data().name).toBe(f.next.name)
})
it('rejects stale metadata after sale, then edits the latest material without undoing deductions',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  await assertFails(summarySwitchBatch(db,f).commit())
  const m=sale.nextMaterials.find(m=>m.id===f.next.id)
  const fresh=summaryMaterialMetadata(sale.nextShop,m,f.operation.metadata)
  await assertSucceeds(summarySwitchBatch(db,fresh).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().lotQty).toEqual(m.lotQty)
  await assertFails(summarySwitchBatch(db,fresh).commit())
})
it('allows only one of two competing metadata edits and retains the first receipt',async()=>{
  const {base,f}=fixture(),a=env.authenticatedContext('cashier').firestore(),b=env.authenticatedContext('other').firestore()
  const other=summaryMaterialMetadata(base.shop,base.materials[0],{...f.operation.metadata,name:'Competing'}, {opId:'OTHER-EDIT',uid:'other'})
  await seedSetCatalog(env,base)
  const result=await Promise.allSettled([summarySwitchBatch(a,f).commit(),summarySwitchBatch(b,other).commit()])
  expect(result.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  const winner=result[0].status==='fulfilled'?f:other
  expect((await getDoc(doc(a,`${GENERATION}/materials/${winner.next.id}`))).data().name).toBe(winner.next.name)
})
