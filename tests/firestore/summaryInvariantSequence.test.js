import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryMenu,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summarySwitch,summarySwitchBatch } from './summarySwitch.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('preserves exact total quantity through every implemented mutation after menu creation',async()=>{
  const base=summaryFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  let shop=base.shop,materials=base.materials
  const check=()=>{for(const m of materials){expect(m.stock).toBe(Object.values(m.lotQty).reduce((a,b)=>a+b,0));expect(Object.values(m.lotQty).every(q=>Number.isSafeInteger(q)&&q>=0)).toBe(true)}}
  const replace=rows=>{materials=materials.map(m=>rows.find(row=>row.id===m.id)||m);check()}
  check()
  const menu=summaryMenu(shop,materials,{...structuredClone(shop.catalog.menus.SIMPLE),id:'FIFTH',name:'Sequence menu'})
  await assertSucceeds(summaryCatalogBatch(db,menu).commit());shop=menu.nextShop;replace(menu.nextMaterials)
  const sale=summarySale(shop,materials,[{menuId:'FIFTH',qty:1,optionIds:shop.catalog.addonIds}])
  await assertSucceeds(setSaleBatch(db,sale).commit());shop=sale.nextShop;replace(sale.nextMaterials)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const received=summaryStock(shop,materials[0],{newLotId:'RECEIVED-AFTER-MENU',opId:'RECEIVE-AFTER-MENU'})
  await assertSucceeds(setStockInBatch(db,received).commit());shop=received.nextShop;replace([received.next])
  const produced=summaryProduce(shop,materials,'S12')
  await assertSucceeds(summaryProduceBatch(db,produced).commit());shop=produced.nextShop;replace([...produced.nextInputs,produced.nextOutput])
  const m=materials[0],id=m.lotIds[0]
  const counted=summaryCount(shop,materials,[{materialId:m.id,counts:[{id,to:m.lotQty[id]-100}]}])
  await assertSucceeds(summaryCountBatch(db,counted).commit());shop=counted.nextShop;replace(counted.nextMaterials)
  const cancelled=summaryCancel(shop,materials,order)
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit());shop=cancelled.nextShop;replace(cancelled.nextMaterials)
  const switched=summarySwitch(shop,materials[0],'RECEIVED-AFTER-MENU')
  await assertSucceeds(summarySwitchBatch(db,switched).commit());replace([switched.next])
  for(const m of materials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
})
