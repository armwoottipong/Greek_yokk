import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { summaryAddon,summaryMenu,summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
import { lineOperands } from './summaryLineCache.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
const input=()=>({name:'Additional topping',recipe:{S0:250,S11:100},pricesCents:{P:1200}})
function registry(size,options={}){
  const base=summaryFixture(options),c=base.shop.catalog
  for(let i=11;i<size;i++){const id=`A${i}`;c.addonIds.push(id);c.addons[id]=input();c.addonPrices.P[id]=1200}
  for(const m of base.materials)m.recipeIndex.addons={_:0,...Object.fromEntries(c.addonIds.map(id=>[id,c.addons[id].recipe[m.id]||0]))}
  return base
}
it.each([11,63])('creates addon %i + 1 while preserving old edit addresses',async size=>{
  const base=registry(size),f=summaryAddon(base.shop,base.materials,'NEW',input());await seedSetCatalog(env,base)
  expect(f.nextShop.catalog.counterIds).toEqual(base.shop.catalog.counterIds)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('edits a new addon by ID and updates its protected cache without an old counter address',async()=>{
  const base=registry(12),f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A11.recipe.S0=500;c.addons.A11.pricesCents.P=1500})
  expect(f.operation.counterIndex).toBe(-1);await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([[1,1],[6,1],[6,4]])('authors a 45-choice menu and sells %i lines with four lots, %i platforms',async(count,platforms)=>{
  const base=registry(64,{prepareMaterials:materials=>{for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}}})
  const c=base.shop.catalog,db=env.authenticatedContext('cashier').firestore()
  for(let p=1;p<platforms;p++){
    const id=`P${p}`;c.platformIds.push(id);c.platforms[id]={...c.platforms.P};c.addonPrices[id]=structuredClone(c.addonPrices.P)
    for(const a of Object.values(c.addons))a.pricesCents[id]=a.pricesCents.P
    for(const m of Object.values(c.menus)){m.pricesCents[id]=m.pricesCents.P;m.optionPrices[id]=structuredClone(m.optionPrices.P)}
  }
  const menu=structuredClone(c.menus.SIMPLE)
  menu.optionIds=c.addonIds.slice(0,44).concat('A63');menu.max=11
  for(const p of c.platformIds)menu.optionPrices[p]={_:0,...Object.fromEntries(menu.optionIds.map(id=>[id,c.addonPrices[p][id]]))}
  const f=summaryMenu(base.shop,base.materials,menu);await seedSetCatalog(env,base)
  await expect(summaryCatalogBatch(db,f).commit(),'extended menu authoring').resolves.toBeUndefined()
  const selected=c.addonIds.slice(0,10).concat('A63'),sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:count},()=>({menuId:'SIMPLE',qty:1,optionIds:selected})))
  await expect(setSaleBatch(db,sale).commit(),'extended menu sale').resolves.toBeUndefined()
})
it.each(Array.from({length:45},(_,i)=>i))('validates choice reference/price position %i in an extended menu',async i=>{
  const base=registry(64),c=base.shop.catalog,menu=structuredClone(c.menus.SIMPLE)
  menu.optionIds=c.addonIds.slice(0,45);menu.optionPrices.P={_:0,...Object.fromEntries(menu.optionIds.map(id=>[id,c.addonPrices.P[id]]))}
  const f=summaryMenu(base.shop,base.materials,menu)
  f.nextShop.catalog.menus.SIMPLE.optionPrices.P[c.addonIds[i]]=-1;f.operation.entitySnapshot.optionPrices.P[c.addonIds[i]]=-1
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
async function zeroSale(slot=0){
  const base=registry(12),c=base.shop.catalog;c.addons.A11.recipe={};c.addons.A11.pricesCents.P=0;c.addonPrices.P.A11=0
  for(const m of base.materials)m.recipeIndex.addons.A11=0
  const menu={...structuredClone(c.menus.SIMPLE),recipe:{},pricesCents:{P:0},optionIds:['A11'],min:0,max:1,optionPrices:{P:{_:0,A11:0}}}
  const f=summaryMenu(base.shop,base.materials,menu),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:['A11']}])
  sale.order.addonKeys.A0='_';sale.order.addonCounts.A0=0;sale.order.addonKeys[`A${slot}`]='A11';sale.order.addonCounts[`A${slot}`]=1
  return {db,sale}
}
it.each(Array.from({length:11},(_,i)=>i))('accepts a legitimate zero-recipe addon in operand slot %i',async i=>{
  const {db,sale}=await zeroSale(i);await assertSucceeds(setSaleBatch(db,sale).commit())
})
it.each(Array.from({length:11},(_,i)=>i))('rejects an operand-only count forgery in slot %i',async i=>{
  const {db,sale}=await zeroSale(i);sale.order.addonCounts[`A${i}`]=0
  await assertFails(setSaleBatch(db,sale).commit())
})
it('rejects omitting a selected zero-recipe addon from the operand map',async()=>{
  const {db,sale}=await zeroSale();sale.order.addonKeys.A0='_';sale.order.addonCounts.A0=0
  await assertFails(setSaleBatch(db,sale).commit())
})
it('rejects duplicate real addon operands even when recipe and price are zero',async()=>{
  const {db,sale}=await zeroSale();sale.order.addonKeys.A1='A11';sale.order.addonCounts.A1=1
  await assertFails(setSaleBatch(db,sale).commit())
})
it('rejects a positive sentinel count without changing any stock or prices',async()=>{
  const {db,sale}=await zeroSale();sale.order.addonCounts.A10=1
  await assertFails(setSaleBatch(db,sale).commit())
})
it('rejects coherent line omission when its operand count remains inflated',async()=>{
  const {db,sale}=await zeroSale();sale.order.lines[0].optionIds=[];Object.assign(sale.order,lineOperands(sale.order.lines))
  await assertFails(setSaleBatch(db,sale).commit())
})
it('rejects a sixty-fifth registry entry even when the planner bound is bypassed',async()=>{
  const base=registry(63),f=summaryAddon(base.shop,base.materials,'NEW',input())
  for(const c of [base.shop.catalog,f.nextShop.catalog]){c.addonIds.push('EXTRA');c.addons.EXTRA=input();c.addonPrices.P.EXTRA=1200}
  f.nextShop.catalog.addonIds=[...base.shop.catalog.addonIds,'NEW'];f.operation.counterIndex=68
  for(const m of [...base.materials,...f.nextMaterials])m.recipeIndex.addons.EXTRA=base.shop.catalog.addons.EXTRA.recipe[m.id]||0
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects a forty-sixth menu choice even when the planner bound is bypassed',async()=>{
  const base=registry(64),c=base.shop.catalog,menu=structuredClone(c.menus.SIMPLE)
  menu.optionIds=c.addonIds.slice(0,45);menu.optionPrices.P={_:0,...Object.fromEntries(menu.optionIds.map(id=>[id,c.addonPrices.P[id]]))}
  const f=summaryMenu(base.shop,base.materials,menu)
  for(const m of [f.nextShop.catalog.menus.SIMPLE,f.operation.entitySnapshot]){
    m.optionIds.push('A45');m.optionPrices.P.A45=1200;m.choiceMaterials.A45=['S0','S11']
  }
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('requires the menu shape witness in the same atomic command',async()=>{
  const base=registry(12),f=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,name:'Edited'})
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitShapeProof:true}).commit())
})
