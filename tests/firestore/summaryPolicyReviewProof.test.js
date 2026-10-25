import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertFails,assertSucceeds } from '@firebase/rules-unit-testing'
import { doc,getDoc,writeBatch } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { ROOT,GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
const lines=[{menuId:'SIMPLE',qty:1,optionIds:[]}]
const sale=(shop,materials,id)=>preparedSale(summarySale(shop,materials,lines,{opId:id}))
it.each(['omit-all','write-all'])('binds sale guards to sale kind after same-ID stock count: %s',async mode=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore(),id='CROSS-KIND'
  const count=summaryCount(base.shop,base.materials,base.materials.map(m=>({materialId:m.id,counts:[{id:m.lotIds[0],to:m.lotQty[m.lotIds[0]]}]})),{opId:id})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCountBatch(db,count).commit())
  const f=sale(count.nextShop,count.nextMaterials,id);await assertSucceeds(prepareSummarySale(db,f))
  if(mode==='write-all')await assertSucceeds(preparedSaleBatch(db,f).commit())
  else{
    const b=writeBatch(db);b.set(doc(db,ROOT),f.nextShop);b.set(doc(db,`${GENERATION}/orders/${id}`),f.order)
    await assertFails(b.commit())
    expect((await getDoc(doc(db,ROOT))).data()).toEqual(count.nextShop)
  }
})
it.each(['omit-all','write-all'])('binds catalog guards to catalog kind after same-ID sale: %s',async mode=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore(),id='CROSS-KIND'
  await seedSetCatalog(env,base);const first=sale(base.shop,base.materials,id)
  await prepareSummarySale(db,first);await assertSucceeds(preparedSaleBatch(db,first).commit())
  const f=summaryCatalog(first.nextShop,first.nextMaterials,c=>{c.menus.SIMPLE.pricesCents.P++},{opId:id})
  const b=summaryCatalogBatch(db,mode==='write-all'?f:{...f,nextMaterials:[]})
  if(mode==='write-all')await assertSucceeds(b.commit())
  else {await assertFails(b.commit());expect((await getDoc(doc(db,ROOT))).data()).toEqual(first.nextShop)}
})
it('rejects a count receipt reusing sale ID while omitting all count writes',async()=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore(),id='CROSS-COUNT'
  await seedSetCatalog(env,base);const first=sale(base.shop,base.materials,id)
  await prepareSummarySale(db,first);await preparedSaleBatch(db,first).commit()
  const f=summaryCount(first.nextShop,first.nextMaterials,first.nextMaterials.map(m=>({materialId:m.id,counts:[{id:m.lotIds[0],to:m.lotQty[m.lotIds[0]]+1}]})),{opId:id})
  await assertFails(summaryCountBatch(db,{...f,nextMaterials:[]}).commit())
})
