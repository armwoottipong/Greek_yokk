import { summaryMenu,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { sourceSummaryFixture } from './summarySourceAdapter.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
const sourcePath=process.env.GY_SOURCE_BACKUP
let env,bytes,source
beforeAll(async()=>{
  if(!sourcePath)return
  bytes=await readFile(sourcePath);source=JSON.parse(bytes.toString('utf8'))
  env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})
})
beforeEach(async()=>{if(env)await env.clearFirestore()})
afterAll(async()=>{
  await env?.cleanup()
  if(sourcePath)expect(createHash('sha256').update(await readFile(sourcePath)).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'))
})
it.runIf(Boolean(sourcePath)).each([{fruit:true},{allOptions:true,lines:6}])('sells and cancels a supplied-source shape: %j',async options=>{
  const f=sourceSummaryFixture(source,options),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,f)
  await assertSucceeds(setSaleBatch(db,f).commit()).catch(error=>{throw new Error('Source sale failed',{cause:error})})
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${f.order.opId}`))).data()
  const cancel=summaryCancel(f.nextShop,f.nextMaterials,order)
  await assertSucceeds(summaryCancelBatch(db,cancel).commit())
  for(const m of cancel.nextMaterials)expect(m.lotQty).toEqual(f.materials.find(item=>item.id===m.id).lotQty)
})
it.runIf(Boolean(sourcePath))('produces using the supplied two-input recipe without changing its quantities or costs',async()=>{
  const base=sourceSummaryFixture(source,{allOptions:true}),output=base.materials.find(m=>m.productionRecipe)
  expect(output.productionRecipe.inputIds).toHaveLength(2)
  const db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  // The supplied raw inputs are unavailable. Receive a test batch first through
  // the same protected command, preserving source recipe/cost data and the file.
  let shop=base.shop,materials=base.materials
  for(const [i,id] of output.productionRecipe.inputIds.entries()){
    const m=materials.find(m=>m.id===id)
    const stock=summaryStock(shop,m,{qtyQ:output.productionRecipe.quantities[i],unitCost:m.unitCost,packCostCents:m.packCostCents,opId:`SOURCE-RAW-${i}`,newLotId:`SOURCE-RAW-LOT-${i}`})
    await assertSucceeds(setStockInBatch(db,stock).commit())
    shop=stock.nextShop;materials=materials.map(m=>m.id===id?stock.next:m)
  }
  const f=summaryProduce(shop,materials,output.id,{qtyQ:output.productionRecipe.yieldQ})
  expect(f.operation.inputs.map(row=>row.needed)).toEqual(output.productionRecipe.quantities)
  await assertSucceeds(summaryProduceBatch(db,f).commit())
})

it.runIf(Boolean(sourcePath))('adds a menu to the supplied catalogue and sells it on the existing platform',async()=>{
  const base=sourceSummaryFixture(source,{allOptions:true}),template=Object.values(base.shop.catalog.menus).find(m=>m.priceMode==='addon'&&!m.groupId)
  const f=summaryMenu(base.shop,base.materials,{...structuredClone(template),id:'SOURCE-ADDED',name:'Test menu'}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:6},()=>({menuId:'SOURCE-ADDED',qty:1,optionIds:template.optionIds})),{platformId:base.order.platformId})
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
