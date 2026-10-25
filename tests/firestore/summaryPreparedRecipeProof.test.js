import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryPreparedMenu } from './summaryPreparedMenu.js'
import { summaryCatalogBatch } from './summaryCatalog.js'
import { summaryCatalog } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { doc,getDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
import { groupFixture } from './summaryGroupFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(){
  const base=summaryFixture(),input={...structuredClone(base.shop.catalog.menus.SIMPLE),rawRecipe:{S0:100,S11:200},hasPackage:false,recipe:{S0:100}}
  const f=summaryPreparedMenu(base.shop,base.materials,input)
  return {base,f}
}
it('stores declared recipe and validates packaging opt-out without losing the material reference',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.nextShop.catalog.menus.SIMPLE.rawRecipe.S11).toBe(200)
})
it.each([
  ['omitted flag',m=>{delete m.hasPackage}],['omitted raw',m=>{delete m.rawRecipe}],
  ['nonboolean flag',m=>{m.hasPackage=0}],['unknown raw ID',m=>{m.rawRecipe.MISSING=1}],
  ['negative raw',m=>{m.rawRecipe.S0=-1}],['fractional raw',m=>{m.rawRecipe.S0=0.5}],
  ['NaN raw',m=>{m.rawRecipe.S0=NaN}],['infinite raw',m=>{m.rawRecipe.S0=Infinity}],
  ['oversized raw',m=>{m.rawRecipe.S0=1000000001}],['effective ingredient',m=>{m.recipe.S0=101}],
  ['effective packaging',m=>{m.recipe.S11=200}],
])('rejects coherent declared recipe forgery %s',async(_,mutate)=>{
  const {base,f}=fixture(),m=f.nextShop.catalog.menus.SIMPLE;mutate(m)
  f.operation.entitySnapshot=structuredClone(m)
  for(const material of f.nextMaterials)material.recipeIndex.menus.SIMPLE=m.recipe[material.id]||0
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each(['menu','catalog'])('rejects discarding declared provenance through %s edit',async kind=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const input=structuredClone(f.nextShop.catalog.menus.SIMPLE)
  let next
  if(kind==='menu'){
    next=summaryPreparedMenu(f.nextShop,f.nextMaterials,input,{opId:'DOWNGRADE'})
    delete next.nextShop.catalog.menus.SIMPLE.rawRecipe;delete next.nextShop.catalog.menus.SIMPLE.hasPackage
    next.operation.entitySnapshot=structuredClone(next.nextShop.catalog.menus.SIMPLE)
  }else next=summaryCatalog(f.nextShop,f.nextMaterials,c=>{delete c.menus.SIMPLE.rawRecipe;delete c.menus.SIMPLE.hasPackage},{opId:'DOWNGRADE'})
  await assertFails(summaryCatalogBatch(db,next).commit())
})

it('toggles menu packaging, reprices stock requirements and returns the original no-package bill',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=preparedSale(summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:[]}]))
  expect(sale.order.inventory.find(row=>row.materialId==='S11').needed).toBe(0)
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const receipt=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const menu={...structuredClone(sale.nextShop.catalog.menus.SIMPLE),hasPackage:true}
  const included=summaryPreparedMenu(sale.nextShop,sale.nextMaterials,menu,{opId:'INCLUDE'})
  await assertSucceeds(summaryCatalogBatch(db,included).commit())
  expect(included.nextMaterials.find(m=>m.id==='S11').recipeIndex.menus.SIMPLE).toBe(200)
  const nextSale=preparedSale(summarySale(included.nextShop,included.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:[]}],{opId:'WITH-PACKAGE'}))
  expect(nextSale.order.inventory.find(row=>row.materialId==='S11').needed).toBe(200)
  await prepareSummarySale(db,nextSale);await assertSucceeds(preparedSaleBatch(db,nextSale).commit())
  const returned=summaryCancel(nextSale.nextShop,nextSale.nextMaterials,receipt)
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  const packaging=(await getDoc(doc(db,`${GENERATION}/materials/S11`))).data()
  expect(packaging.stock).toBe(base.materials[11].stock-200)
  expect(packaging.lots).toEqual(base.materials[11].lots)
})

it('authors a declared recipe at 64 menus, 45 choices, four platforms and four working lots',async()=>{
  const base=groupFixture({mode:'extra',options:45,platforms:4,fourLots:true}),c=base.shop.catalog
  while(c.menuIds.length<64){
    const id=`MENU${c.menuIds.length}`,menu={...structuredClone(c.menus.SIMPLE),id}
    delete menu.groupId;c.menuIds.push(id);c.menus[id]=menu
  }
  for(const m of base.materials)m.recipeIndex.menus={_:0,...Object.fromEntries(c.menuIds.map(id=>[id,c.menus[id].recipe[m.id]||0]))}
  const input={...structuredClone(c.menus.SIMPLE),groupIds:[],optionIds:[...c.addonIds],min:0,max:11,
    optionPrices:structuredClone(c.addonPrices),rawRecipe:Object.fromEntries(base.materials.map((m,i)=>[m.id,i+1])),hasPackage:false}
  const f=summaryPreparedMenu(base.shop,base.materials,input)
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
