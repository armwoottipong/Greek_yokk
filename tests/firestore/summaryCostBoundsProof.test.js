import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture,SUMMARY_MAX_UNIT_COST } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
// Candidate financial envelope only, not publication of a complete cloud protocol.
const maximum=SUMMARY_MAX_UNIT_COST
it.each([false,true])('rejects an input cost beyond the safe envelope, merge %j',async merge=>{
  const base=summaryFixture(),m=base.materials[0]
  const f=summaryStock(base.shop,m,{qtyQ:100,unitCost:maximum+0.0001,packCostCents:1000000000,
    ...(merge?{receiveDay:m.lots[m.lotIds[0]].receiveDay,expiryDay:m.lots[m.lotIds[0]].expiryDay}:{})})
  await seedSetCatalog(env,base)
  await assertFails(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([false,true])('accepts the receiving boundary, merge %j',async merge=>{
  const base=summaryFixture(),m=base.materials[0]
  const f=summaryStock(base.shop,m,{qtyQ:100,unitCost:maximum,packCostCents:1000000000,
    ...(merge?{receiveDay:m.lots[m.lotIds[0]].receiveDay,expiryDay:m.lots[m.lotIds[0]].expiryDay}:{})})
  await seedSetCatalog(env,base)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
function production({empty=false,over=false}={}){
  const base=summaryFixture(),input=base.materials[0],output=base.materials[12]
  input.unitCost=maximum
  for(const id of input.lotIds)input.lots[id].unitCost=maximum
  if(empty){output.stock=0;output.activeLotId='';output.zeroActiveIds=[];for(const id of output.lotIds)output.lotQty[id]=0}
  output.productionRecipe={yieldQ:1,inputIds:[input.id],quantities:[over?2:1]}
  return {base,f:summaryProduce(base.shop,base.materials,output.id,{qtyQ:1})}
}
it.each([false,true])('rejects production creating an unsafe output lot, empty %j',async empty=>{
  const {base,f}=production({empty,over:true})
  expect(f.nextOutput.lots['PRODUCED-LOT'].unitCost).toBeGreaterThan(maximum)
  await seedSetCatalog(env,base)
  await assertFails(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([false,true])('accepts production at the output cost boundary, empty %j',async empty=>{
  const {base,f}=production({empty})
  expect(f.nextOutput.lots['PRODUCED-LOT'].unitCost).toBe(maximum)
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
