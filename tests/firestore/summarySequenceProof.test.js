import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryStock } from './summaryStock.js'
import { summarySale } from './summarySale.js'
import { summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('agrees with the original domain sale fixture at six lines',()=>{
  const base=summaryFixture({lines:6}),f=summarySale(base.shop,base.materials,base.order.lines,{opId:base.order.opId})
  expect(f.order).toEqual(base.order)
  expect(f.nextMaterials).toEqual(base.nextMaterials)
})
it.each(['price','recipe','addon','stock'])('sells using the latest %s after a prior command',async kind=>{
  const base=summaryFixture({lines:6}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  let shop=base.shop,materials=base.materials
  if(kind==='stock'){
    const edit=summaryStock(shop,materials[0])
    await assertSucceeds(setStockInBatch(db,edit).commit())
    shop=edit.nextShop
    materials=materials.map(m=>m.id===edit.next.id?edit.next:m)
  }else{
    const change=kind==='price'?c=>{c.menus.SIMPLE.pricesCents.P=7500}:kind==='addon'?c=>{c.addons.A0.pricesCents.P=222}:c=>{c.addons.A0.recipe.S0=333}
    const edit=summaryCatalog(shop,materials,change)
    await assertSucceeds(summaryCatalogBatch(db,edit).commit())
    shop=edit.nextShop;materials=edit.nextMaterials
  }
  const sale=summarySale(shop,materials,base.order.lines)
  await assertSucceeds(setSaleBatch(db,sale).commit())
  if(kind==='price')expect(sale.order.subtotalCents-base.order.subtotalCents).toBe(1200)
  if(kind==='addon')expect(sale.order.subtotalCents-base.order.subtotalCents).toBe(4*122)
  if(kind==='recipe')expect(sale.order.inventory[0].needed-base.order.inventory[0].needed).toBe(6*233)
  for(const m of sale.nextMaterials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().lotQty).toEqual(m.lotQty)
})
it.each(['stock','sale'])('rejects old catalogue receipt replay after %s',async next=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  const edit=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7500})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  let current
  if(next==='stock'){
    const stock=summaryStock(edit.nextShop,edit.nextMaterials[0])
    await assertSucceeds(setStockInBatch(db,stock).commit());current=stock.next
  }else{
    const sale=summarySale(edit.nextShop,edit.nextMaterials,base.order.lines)
    await assertSucceeds(setSaleBatch(db,sale).commit());current=sale.nextMaterials[0]
  }
  const replay={...structuredClone(current),revision:current.revision+1,lastOpId:edit.operation.opId,lastOpKind:'catalog',lastOpIndex:0}
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${current.id}`),replay))
})
