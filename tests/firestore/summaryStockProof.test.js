import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryStock } from './summaryStock.js'

let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it.each([{},{merge:true},{packaging:true}])('receives summary stock $merge / $packaging',async options=>{
  const base=summaryFixture(),m=base.materials[options.packaging?11:0]
  const f=summaryStock(base.shop,m,options.merge?{receiveDay:m.lots[m.lotIds[0]].receiveDay,expiryDay:m.lots[m.lotIds[0]].expiryDay}:{})
  base.materials=base.materials.map(item=>item.id===f.before.id?f.before:item)
  await seedSetCatalog(env,base)
  expect(f.next.lotQty[f.operation.lotId]).toBe((f.before.lotQty[f.operation.lotId]||0)+f.operation.qtyQ)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects incoherent summary stock quantity',async()=>{
  const base=summaryFixture(),f=summaryStock(base.shop,base.materials[0]);f.next.lotQty[f.operation.lotId]++
  await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
