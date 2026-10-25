import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertFails,assertSucceeds } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { documentMetrics,commitMetrics } from './summaryProfileMetrics.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function historical(count){
  const base=summaryFixture(),m=base.materials[0],lot=m.lots[m.lotIds[0]]
  while(m.lotIds.length<count){
    const ordinal=m.lotIds.length,id=`HISTORY-${ordinal}`
    m.lotIds.push(id);m.lotQty[id]=0
    m.lots[id]={...lot,id,qty:0,isInUse:false,ordinal,sortKey:999999*1e9+20000*1000+ordinal,note:''}
  }
  return base
}
it.each([999,1000])('preserves %s historical IDs and enforces the new-lot ordinal boundary',async count=>{
  const base=historical(count),m=base.materials[0],db=env.authenticatedContext('cashier').firestore()
  const f=summaryStock(base.shop,m,{qtyQ:100,unitCost:0.5,receiveDay:21000,expiryDay:999999,newLotId:'NEXT-HISTORY',opId:'HISTORY-BOUND'})
  expect(f.next.lotIds.slice(0,count)).toEqual(m.lotIds)
  const path=`${GENERATION}/materials/${m.id}`
  expect(documentMetrics(path,f.next).violations).toEqual([])
  expect(commitMetrics('projects/demo-greek-yogg/databases/(default)',[{path,data:f.next},{path:ROOT,data:f.nextShop},{path:`${GENERATION}/operations/${f.operation.opId}`,data:f.operation}]).violations).toEqual([])
  await seedSetCatalog(env,base)
  if(count===999)await assertSucceeds(setStockInBatch(db,f).commit())
  else {await assertFails(setStockInBatch(db,f).commit());expect((await getDoc(doc(db,path))).data()).toEqual(m)}
})
