import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summarySale } from './summarySale.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
async function setup(options={}){
  const base=summaryFixture({lines:6,...options}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  await assertSucceeds(setSaleBatch(db,base).commit()).catch(error=>{throw new Error('Initial sale failed',{cause:error})})
  // Read the immutable receipt to resolve the sale's server timestamp.
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  const f=summaryCancel(base.nextShop,base.nextMaterials,order)
  return {base,db,f}
}
it('returns the exact original allocations and preserves historical cost',async()=>{
  const {base,db,f}=await setup()
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  for(const m of f.nextMaterials){
    const before=base.materials.find(item=>item.id===m.id)
    expect(m.stock).toBe(before.stock);expect(m.lotQty).toEqual(before.lotQty)
    expect(m.unitCost).toBe(before.unitCost);expect(m.lots).toEqual(before.lots)
  }
})
it.each(Array.from({length:15},(_,i)=>i))('rejects omitted return guard %i',async i=>{
  const {db,f}=await setup()
  await assertFails(summaryCancelBatch(db,f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitOperation:true},{omitOrder:true},{omitShop:true}])('rejects incomplete cancellation %j',async omit=>{
  const {db,f}=await setup()
  await assertFails(summaryCancelBatch(db,f,omit).commit())
})
it.each([
  ['quantity',f=>{f.nextMaterials[0].lotQty.L0++}],
  ['price',f=>{f.nextOrder.subtotalCents++}],
  ['cost',f=>{f.nextMaterials[0].unitCost++}],
  ['recipe',f=>{f.nextMaterials[0].recipeIndex.quantities[0]++}],
  ['provenance',f=>{f.nextMaterials[0].lots.L0.initialQtyQ++}],
  ['UID',f=>{f.operation.uid='someone-else'}],
  ['source revision',f=>{f.operation.sourceRevisions[0]--}],
])('rejects forged %s',async(_,tamper)=>{
  const {db,f}=await setup();tamper(f)
  await assertFails(summaryCancelBatch(db,f).commit())
})
it('rejects material-only replay after a committed cancellation',async()=>{
  const {db,f}=await setup()
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  const replay={...f.nextMaterials[0],revision:f.nextMaterials[0].revision+1}
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${replay.id}`),replay))
})
it('returns all four original lot allocations after another catalogue edit',async()=>{
  const {base,db}=await setup({prepareMaterials:materials=>{
    for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }})
  const edit=summaryCatalog(base.nextShop,base.nextMaterials,c=>{c.addons.A0.recipe.S0=444})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  const f=summaryCancel(edit.nextShop,edit.nextMaterials,order)
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  for(const m of f.nextMaterials)expect(m.lotQty).toEqual(base.materials.find(item=>item.id===m.id).lotQty)
})
it('returns only real allocations when the sale approved shortages',async()=>{
  const {base,db,f}=await setup({prepareMaterials:materials=>{
    for(const m of materials){m.stock=100;m.lots[0].qty=100}
  }})
  expect(base.order.inventory.some(row=>row.shortage>0)).toBe(true)
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  for(const m of f.nextMaterials)expect(m.stock).toBe(100)
})
it.each(['stock','sale'])('cancels the original allocations after a later %s command',async kind=>{
  const {base,db}=await setup()
  let shop=base.nextShop,materials=base.nextMaterials
  if(kind==='stock'){
    const stock=summaryStock(shop,materials[0])
    await assertSucceeds(setStockInBatch(db,stock).commit());shop=stock.nextShop
    materials=materials.map(m=>m.id===stock.next.id?stock.next:m)
  }else{
    const sale=summarySale(shop,materials,base.order.lines,{opId:'ANOTHER-SALE'})
    await assertSucceeds(setSaleBatch(db,sale).commit());shop=sale.nextShop;materials=sale.nextMaterials
  }
  const original=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  const f=summaryCancel(shop,materials,original)
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  for(const [i,m] of f.nextMaterials.entries())expect(m.stock).toBe(materials.find(row=>row.id===m.id).stock+original.inventory[i].take)
})
it('rejects a second cancellation under a new operation ID',async()=>{
  const {db,f}=await setup()
  await assertSucceeds(summaryCancelBatch(db,f).commit())
  const original={...f.nextOrder,status:'committed'}
  delete original.cancelOpId;delete original.cancelledAt
  const replay=summaryCancel(f.nextShop,f.nextMaterials,original,{opId:'SECOND-CANCEL'})
  await assertFails(summaryCancelBatch(db,replay).commit())
})
it('allows any signed-in user and accepts exactly one competing cancellation',async()=>{
  const {base,db,f}=await setup()
  const original=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  const other=summaryCancel(base.nextShop,base.nextMaterials,original,{uid:'another-cashier',opId:'OTHER-CANCEL'})
  const results=await Promise.allSettled([summaryCancelBatch(db,f).commit(),summaryCancelBatch(env.authenticatedContext('another-cashier').firestore(),other).commit()])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
})
it('rejects signed-out cancellation',async()=>{
  const {f}=await setup()
  await assertFails(summaryCancelBatch(env.unauthenticatedContext().firestore(),f).commit())
})
