import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture,asSummary } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch,setCatalogFixture,planSetCatalog } from './setCatalogFixture.js'

let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})

it.each([{lines:1,fruit:true},{lines:6},{lines:6,prepareMaterials:materials=>{
  for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
}}])('commits a summary sale with $lines lines',async options=>{
  const f=summaryFixture(options);await seedSetCatalog(env,f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(Array.from({length:11},(_,i)=>i))('rejects forged counter %i atomically',async i=>{
  const f=summaryFixture({lines:6});f.order.addonCounts[`A${i}`]++
  await seedSetCatalog(env,f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('never stores exponential subset tables',()=>{
  const f=summaryFixture({lines:6})
  expect(JSON.stringify(f).length).toBeLessThan(100000)
})
it('supports fifteen different recipe terms on a material with four lots',async()=>{
  const base=setCatalogFixture({lines:6,prepareMaterials:materials=>{
    for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }})
  for(const addon of Object.values(base.addons))addon.recipe.S0=100
  const f=asSummary(planSetCatalog({materials:base.materials,addons:base.addons,menus:base.shop.catalog.menus,
    platforms:base.shop.catalog.platforms,orderLines:base.order.lines,platformId:'P'}))
  expect(Object.values(f.materials[0].recipeIndex.addons).filter(n=>n>0)).toHaveLength(11)
  expect(Object.values(f.shop.catalog.menus).filter(menu=>menu.recipe.S0>0)).toHaveLength(4)
  await seedSetCatalog(env,f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['lastStockInDay','expiryDay'])('rejects an altered primary material date: %s',async field=>{
  const f=summaryFixture({lines:6});f.nextMaterials[0][field]--
  await seedSetCatalog(env,f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
