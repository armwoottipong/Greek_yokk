import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { addonVacancy } from './summaryAddonFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryAddon,summaryMenu,summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
const input=()=>({name:'New topping',active:true,recipe:{S0:250,S11:100},pricesCents:{P:1200}})
function fixture(){const base=addonVacancy();return {base,f:summaryAddon(base.shop,base.materials,'NEW',input())}}
it('creates an addon and all fifteen stock coefficients in one commit',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('attaches the new addon through a menu command then prices and deducts it',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const menu=structuredClone(f.nextShop.catalog.menus.SIMPLE);menu.optionIds.push('NEW');menu.max=11;menu.optionPrices.P.NEW=1200
  const edit=summaryMenu(f.nextShop,f.nextMaterials,menu,{opId:'ATTACH'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  const sale=summarySale(edit.nextShop,edit.nextMaterials,[{menuId:'SIMPLE',qty:2,optionIds:['NEW']}])
  expect(sale.order.subtotalCents).toBe(16200)
  expect(sale.order.inventory[0].needed).toBe(3100)
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('rejects an inactive addon even if the sale planner is bypassed',async()=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore()
  base.shop.catalog.addons.A0.active=false;await seedSetCatalog(env,base)
  const c=base.shop.catalog;c.addons.A0.active=true
  const sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0']}]);c.addons.A0.active=false
  sale.nextShop.catalog.addons.A0.active=false
  await assertFails(setSaleBatch(db,sale).commit())
})
it.each(Array.from({length:15},(_,i)=>i))('rejects omitting addon cache guard %i',async i=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitShop:true},{omitOperation:true}])('rejects an incomplete addon command %j',async omit=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['coefficient',f=>{f.nextMaterials[0].recipeIndex.addons.NEW++}],
  ['other coefficient',f=>{f.nextMaterials[0].recipeIndex.addons.A0++}],
  ['menu cache',f=>{f.nextMaterials[0].recipeIndex.menus.SIMPLE++}],
  ['sentinel price',f=>{f.nextShop.catalog.addonPrices.P._=1}],
  ['unrelated price',f=>{f.nextShop.catalog.addonPrices.P.A0++}],
  ['price cache',f=>{f.nextShop.catalog.addonPrices.P.NEW++}],
  ['counter reassignment',f=>{f.nextShop.catalog.counterIds[4]='NEW'}],
  ['stock',f=>{f.nextMaterials[0].stock++}],
  ['uid',f=>{f.operation.uid='other'}],
  ['source revision',f=>{f.operation.sourceCatalogRevision++}],
  ['snapshot',f=>{f.operation.entitySnapshot.name='Forged'}],
  ['menu change',f=>{f.nextShop.catalog.menus.SIMPLE.active=false}],
  ['negative recipe',f=>{f.nextShop.catalog.addons.NEW.recipe.S0=-1;f.operation.entitySnapshot.recipe.S0=-1;f.nextMaterials[0].recipeIndex.quantities[14]=-1;f.nextMaterials[0].recipeIndex.addons.NEW=-1}],
  ['unknown material',f=>{f.nextShop.catalog.addons.NEW.recipe.UNKNOWN=1;f.operation.entitySnapshot.recipe.UNKNOWN=1}],
])('rejects forged addon %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('allows only one competing creation from the same catalogue revision',async()=>{
  const {base,f}=fixture(),other=summaryAddon(base.shop,base.materials,'OTHER',input(),{opId:'OTHER'}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  const results=await Promise.allSettled([summaryCatalogBatch(db,f).commit(),summaryCatalogBatch(db,other).commit()])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  expect((await getDoc(doc(db,ROOT))).data().catalog.addonIds).toHaveLength(11)
})
it.each(Array.from({length:10},(_,i)=>i))('creates an addon with %i prior entries including the empty registry',async count=>{
  const base=addonVacancy({},count),f=summaryAddon(base.shop,base.materials,'NEW',input());await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('edits, disables and re-enables an addon without changing its accounting slot',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const off=summaryCatalog(f.nextShop,f.nextMaterials,c=>{c.addons.NEW.active=false;c.addons.NEW.name='Renamed';c.addons.NEW.pricesCents.P=1300;c.addons.NEW.recipe.S0=500},{opId:'DISABLE'})
  await assertSucceeds(summaryCatalogBatch(db,off).commit())
  const on=summaryCatalog(off.nextShop,off.nextMaterials,c=>{c.addons.NEW.active=true},{opId:'ENABLE'})
  await assertSucceeds(summaryCatalogBatch(db,on).commit())
  expect(on.nextShop.catalog.counterIds[14]).toBe('NEW')
  expect(on.nextMaterials[0].recipeIndex.addons.NEW).toBe(500)
})
it.each([null,'',-1,1.5,1000000001])('rejects an invalid recipe quantity %j',async qty=>{
  const {base,f}=fixture();f.nextShop.catalog.addons.NEW.recipe.S0=qty;f.operation.entitySnapshot.recipe.S0=qty;f.nextMaterials[0].recipeIndex.quantities[14]=qty;f.nextMaterials[0].recipeIndex.addons.NEW=qty
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([-1,0.5,1000000001])('rejects an invalid platform price %j',async price=>{
  const {base,f}=fixture();f.nextShop.catalog.addons.NEW.pricesCents.P=price;f.operation.entitySnapshot.pricesCents.P=price;f.nextShop.catalog.addonPrices.P.NEW=price
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('allows an independently signed-in user without a role and rejects anonymous writes',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.unauthenticatedContext().firestore(),f).commit())
  f.operation.uid='new-user'
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('new-user').firestore(),f).commit())
})
