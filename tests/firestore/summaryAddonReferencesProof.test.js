import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,setDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryMenu,summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(size=4){
  const base=summaryFixture()
  for(let i=4;i<size;i++){
    const id=`MENU${i}`
    base.shop.catalog.menuIds.push(id)
    base.shop.catalog.menus[id]={...structuredClone(base.shop.catalog.menus.SIMPLE),id}
    for(const m of base.materials)m.recipeIndex.menus[id]=base.shop.catalog.menus[id].recipe[m.id]||0
  }
  return {base,f:summaryCatalog(base.shop,base.materials,c=>{c.addons.A10.recipe={S14:450}})}
}
it.each([4,64])('refreshes addon references across %i menus and sells using the new recipe',async size=>{
  const {base,f}=fixture(size),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:size===4?'SIMPLE':'MENU63',qty:1,optionIds:['A10']}])
  expect(sale.order.inventory[14].needed).toBe(550)
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('rejects a stale menu reference even when actual stock coefficients are correct',async()=>{
  const {base,f}=fixture();f.nextShop.catalog.menus.SIMPLE.choiceMaterials.A10=['S10']
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(Array.from({length:15},(_,i)=>i))('checks distributed menu reference slot %i',async i=>{
  const {base,f}=fixture(64),key=f.nextShop.catalog.menuIds[45+i]
  f.nextShop.catalog.menus[key].choiceMaterials.A10=['S10']
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  ['price',f=>{f.nextShop.catalog.menus.SIMPLE.pricesCents.P++}],
  ['unrelated choice',f=>{f.nextShop.catalog.menus.SIMPLE.choiceMaterials.A0=['S14']}],
  ['selection limit',f=>{f.nextShop.catalog.menus.SIMPLE.max=1}],
  ['unrelated material removal',f=>{f.nextShop.catalog.menus.SIMPLE.materialIds=['S14']}],
  ['missing menu',f=>{delete f.nextShop.catalog.menus.SIMPLE}],
  ['extra menu',f=>{f.nextShop.catalog.menus.EXTRA=structuredClone(f.nextShop.catalog.menus.SIMPLE)}],
  ['sentinel cache',f=>{f.nextMaterials[0].recipeIndex.menus._=1}],
])('rejects changing %s during addon reference maintenance',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('allows later menu authoring after an addon ingredient change',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const menu=summaryMenu(f.nextShop,f.nextMaterials,{...f.nextShop.catalog.menus.SIMPLE,name:'After recipe change'},{opId:'EDIT-MENU'})
  await assertSucceeds(summaryCatalogBatch(db,menu).commit())
})
it.each([60,61,62,63])('checks the additional reference witness menu %i',async i=>{
  const {base,f}=fixture(64);f.nextShop.catalog.menus[base.shop.catalog.menuIds[i]].choiceMaterials.A10=['S10']
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('requires the additional witness in the atomic addon edit',async()=>{
  const {base,f}=fixture(64);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitReferenceProof:true}).commit())
})
it('rejects replaying or adding a standalone witness after a committed edit',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}/referenceProofs/0`),f.referenceProof))
  await assertFails(setDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}/referenceProofs/1`),f.referenceProof))
})
it.each(Array.from({length:11},(_,i)=>i))('updates addon %i across 64 menus and four platforms',async i=>{
  const {base}=fixture(64),c=base.shop.catalog
  for(let p=1;p<=3;p++){
    const id=`P${p}`;c.platformIds.push(id);c.platforms[id]={...c.platforms.P}
    c.addonPrices[id]=structuredClone(c.addonPrices.P)
    for(const a of Object.values(c.addons))a.pricesCents[id]=a.pricesCents.P
    for(const m of Object.values(c.menus)){m.pricesCents[id]=m.pricesCents.P;m.optionPrices[id]=structuredClone(m.optionPrices.P)}
  }
  const f=summaryCatalog(base.shop,base.materials,c=>{c.addons[`A${i}`].recipe=Object.fromEntries(c.summaryMaterials.map(id=>[id,100]))})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
