import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { serverTimestamp,doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { summaryMaterialMeasure } from './summaryMaterialMeasure.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(){
  const base=summaryFixture();base.shop=materialRegistryShop(base.shop,base.materials)
  const m=base.materials[0],opId='MEASURE',measure={unit:'kg',packSize:12,unitCost:0.123456789,packCostCents:400}
  return {base,f:{next:{...structuredClone(m),...measure,revision:m.revision+1,lastOpId:opId,lastOpKind:'material_measure',lastOpIndex:0},
    nextShop:{...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'material_measure'},
    operation:{schemaVersion:2,kind:'material_measure',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,materialRevision:m.revision,shopRevision:base.shop.revision+1,measure}}}
}
it('edits units, pack size and current cost without converting stock or historical lot costs',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()
  expect(saved.stock).toBe(base.materials[0].stock)
  expect(saved.lots).toEqual(base.materials[0].lots)
  expect(saved.lotQty).toEqual(base.materials[0].lotQty)
  expect(saved.unitCost).toBe(f.operation.measure.unitCost)
  expect((await getDoc(doc(db,ROOT))).data().catalogRevision).toBe(base.shop.catalogRevision)
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects missing measure write %s',async key=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>f.next.stock++],['lot cost',f=>f.next.lots[f.next.lotIds[0]].unitCost++],
  ['lot quantity',f=>f.next.lotQty[f.next.lotIds[0]]++],['type',f=>{f.next.inventoryType='packaging'}],
  ['recipe',f=>f.next.recipeIndex.quantities[4]++],['catalog',f=>f.nextShop.catalogRevision++],
  ['snapshot',f=>f.operation.measure.packSize++],['uid',f=>{f.operation.uid='other'}],
  ['material revision',f=>f.operation.materialRevision--],['shop revision',f=>f.operation.shopRevision--],
])('rejects measure forgery %s',async(_,mutate)=>{
  const {base,f}=fixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  {unit:''},{unit:' \t\n '},{unit:'a'.repeat(33)},{unit:1},{packSize:0},{packSize:0.5},{packSize:10000001},
  {unitCost:-1},{unitCost:100000.0001},{unitCost:NaN},{unitCost:Infinity},
  {packCostCents:-1},{packCostCents:0.5},{packCostCents:1000000001},{extra:1},
])('rejects invalid coherent measure %j',async patch=>{
  const {base,f}=fixture();Object.assign(f.next,patch);Object.assign(f.operation.measure,patch);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('replans sale costs after a measure edit while reusing unchanged staged prices, then returns original lots once',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const stale=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await seedSetCatalog(env,base);await prepareSummarySale(db,stale)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  await assertFails(preparedSaleBatch(db,stale).commit())
  const updated=base.materials.map(m=>m.id===f.next.id?f.next:m)
  const sale=preparedSale(summarySale(f.nextShop,updated,base.order.lines))
  expect(sale.order.ingredientCostCents).not.toBe(stale.order.ingredientCostCents)
  await assertSucceeds(preparedSaleBatch(db,sale).commit()).catch(error=>{throw new Error('measure workflow: replanned sale',{cause:error})})
  const receipt=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const cancelled=summaryCancel(sale.nextShop,sale.nextMaterials,receipt)
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit()).catch(error=>{throw new Error('measure workflow: cancellation',{cause:error})})
  await assertFails(summaryCancelBatch(db,cancelled).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()
  expect(saved.lotQty).toEqual(base.materials[0].lotQty)
  expect(saved.lots).toEqual(base.materials[0].lots)
  expect(saved.unitCost).toBe(f.next.unitCost)
  expect(saved.packSize).toBe(f.next.packSize)
})

it('rejects old edits after receipt, then uses the new pack size and exact cost in the next receipt',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const received=summaryStock(base.shop,base.materials[0],{qtyQ:100,unitCost:2,opId:'FIRST-RECEIPT'})
  await assertSucceeds(setStockInBatch(db,received).commit())
  await assertFails(summarySwitchBatch(db,f).commit())
  const edited=summaryMaterialMeasure(received.nextShop,received.next,f.operation.measure)
  await assertSucceeds(summarySwitchBatch(db,edited).commit())
  const next=summaryStock(edited.nextShop,edited.next,{qtyQ:100,unitCost:1,opId:'SECOND-RECEIPT',lotId:'SECOND-LOT'})
  await assertSucceeds(setStockInBatch(db,next).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()
  expect(saved.stock).toBe(base.materials[0].stock+200)
  expect(saved.packCostCents).toBe(1200)
  expect(saved.lots[base.materials[0].lotIds[0]].unitCost).toBe(base.materials[0].lots[base.materials[0].lotIds[0]].unitCost)
})

it.each(['anonymous','archived','inactive generation','inactive shop','unregistered'])('rejects measure boundary %s',async boundary=>{
  const {base,f}=fixture()
  if(boundary==='archived')base.materials[0].deleted=f.next.deleted=true
  if(boundary==='inactive generation')base.shop.generation=f.nextShop.generation='other'
  if(boundary==='inactive shop')base.shop.status=f.nextShop.status='inactive'
  if(boundary==='unregistered')base.shop.materialIds=f.nextShop.materialIds=base.shop.materialIds.slice(1)
  await seedSetCatalog(env,base)
  const db=(boundary==='anonymous'?env.unauthenticatedContext():env.authenticatedContext('cashier')).firestore()
  await assertFails(summarySwitchBatch(db,f).commit())
})

it('accepts maximum field values and zero costs for packaging and preserves its lot provenance',async()=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const m=base.materials.find(m=>m.inventoryType==='packaging')
  const f=summaryMaterialMeasure(base.shop,m,{unit:'a'.repeat(32),packSize:10000000,unitCost:100000,packCostCents:1000000000})
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  const zero=summaryMaterialMeasure(f.nextShop,f.next,{unit:'piece',packSize:1,unitCost:0,packCostCents:0},{opId:'ZERO'})
  await assertSucceeds(summarySwitchBatch(db,zero).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().lots).toEqual(m.lots)
})

it('returns an older receipt after a later measure edit without restoring the former cost or unit',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const receipt=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const edit=summaryMaterialMeasure(sale.nextShop,sale.nextMaterials[0],f.operation.measure)
  await assertSucceeds(summarySwitchBatch(db,edit).commit())
  const materials=sale.nextMaterials.map(m=>m.id===edit.next.id?edit.next:m)
  const returned=summaryCancel(edit.nextShop,materials,receipt)
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()
  expect(saved.unitCost).toBe(edit.next.unitCost);expect(saved.unit).toBe(edit.next.unit)
  expect(saved.lotQty).toEqual(base.materials[0].lotQty)
  expect(saved.lots).toEqual(base.materials[0].lots)
})

it('rejects stale production and prices fresh production from edited ingredient cost',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  base.materials[12].productionRecipe={inputIds:['S0'],quantities:[100],yieldQ:100}
  base.shop=materialRegistryShop(base.shop,base.materials)
  const edit=summaryMaterialMeasure(base.shop,base.materials[0],f.operation.measure)
  const old=summaryProduce(base.shop,base.materials,'S12',{qtyQ:100})
  await seedSetCatalog(env,base);await assertSucceeds(summarySwitchBatch(db,edit).commit())
  await assertFails(summaryProduceBatch(db,old).commit())
  const updated=base.materials.map(m=>m.id==='S0'?edit.next:m)
  const fresh=summaryProduce(edit.nextShop,updated,'S12',{qtyQ:100})
  expect(fresh.operation.rawCostBaht).toBe(edit.next.unitCost)
  await assertSucceeds(summaryProduceBatch(db,fresh).commit())
})

it('allows equal-access accounts to replan a competing edit without overwriting the first change',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  const other=summaryMaterialMeasure(base.shop,base.materials[0],{...f.operation.measure,packSize:13},{opId:'OTHER',uid:'other'})
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  await assertFails(summarySwitchBatch(env.authenticatedContext('other').firestore(),other).commit())
  const fresh=summaryMaterialMeasure(f.nextShop,f.next,other.operation.measure,{opId:'OTHER',uid:'other'})
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('other').firestore(),fresh).commit())
})
