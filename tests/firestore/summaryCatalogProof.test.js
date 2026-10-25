import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { doc,setDoc,getDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it.each([
  ['base price',c=>{c.menus.SIMPLE.pricesCents.P=7000}],
  ['recipe quantity',c=>{c.addons.A0.recipe.S0=250}],
  ['included option price',c=>{c.menus.FRUIT.optionPrices.P.A0=50}],
])('changes %s atomically with all recipe indexes',async(_,change)=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,change)
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects a mismatched derived recipe quantity',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A0.recipe.S0=250})
  f.nextMaterials[0].recipeIndex.addons.A0--
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects reusing a committed catalog receipt to bump a material revision',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7000})
  await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const replay={...structuredClone(f.nextMaterials[0]),revision:f.nextMaterials[0].revision+1}
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${replay.id}`),replay))
})
it.each(Array.from({length:15},(_,i)=>i))('rejects omitting material guard %i',async i=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A0.recipe.S0=250})
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitOperation:true},{omitShop:true}])('rejects incomplete catalogue command %j',async omit=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A0.recipe.S0=250})
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['last addon recipe',c=>{c.addons.A10.recipe.S14=450}],
  ['menu recipe',c=>{c.menus.SIMPLE.recipe.S0=250}],
  ['platform GP',c=>{c.platforms.P.gpBasisPoints=1500}],
  ['global addon price',c=>{c.addons.A0.pricesCents.P=1234}],
])('accepts %s edit',async(_,change)=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,change)
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  ['negative base',c=>{c.menus.SIMPLE.pricesCents.P=-1}],
  ['negative included price',c=>{c.menus.FRUIT.optionPrices.P.A5=-1}],
  ['negative addon price',c=>{c.addons.A10.pricesCents.P=-1}],
  ['fractional recipe',c=>{c.addons.A10.recipe.S14=0.1}],
  ['negative recipe',c=>{c.menus.SIMPLE.recipe.S14=-1}],
  ['excessive GP',c=>{c.platforms.P.gpBasisPoints=10001}],
  ['invalid mode',c=>{c.menus.FRUIT.priceMode='untrusted'}],
  ['unknown ingredient',c=>{c.addons.A10.recipe.UNKNOWN=100}],
])('rejects %s',async(_,change)=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,change)
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  ['unrelated recipe index',f=>{f.nextMaterials[0].recipeIndex.quantities[14]++}],
  ['stock alteration',f=>{f.nextMaterials[0].stock--}],
  ['lot metadata alteration',f=>{f.nextMaterials[0].lots.L0.unitCost++}],
  ['unrelated addon price',f=>{f.nextShop.catalog.addonPrices.P.A1++}],
  ['wrong source revision',f=>{f.operation.sourceCatalogRevision--}],
  ['wrong UID',f=>{f.operation.uid='another-user'}],
  ['counter mapping',f=>{f.nextShop.catalog.counterIds.reverse()}],
])('rejects catalogue tampering: %s',async(_,tamper)=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A0.recipe.S0=250})
  tamper(f)
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('allows a new signed-in user to edit without any role or profile',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7000},{uid:'new-user'})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('new-user').firestore(),f).commit())
})
it('rejects a signed-out catalogue edit',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7000})
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.unauthenticatedContext().firestore(),f).commit())
})
it('records the exact changed entity for same-ID payload reconciliation',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7000})
  await seedSetCatalog(env,base)
  const db=env.authenticatedContext('cashier').firestore()
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`))).data()
  expect(saved.entitySnapshot).toEqual(f.nextShop.catalog.menus.SIMPLE)
})
it('rejects a receipt whose entity payload differs from the changed catalogue',async()=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.pricesCents.P=7000})
  f.operation.entitySnapshot.pricesCents.P=7001
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each([9999,10000])('preserves the original GP below 100 percent boundary %i',async basis=>{
  const base=summaryFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.platforms.P.gpBasisPoints=basis})
  await seedSetCatalog(env,base)
  const commit=summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit()
  if(basis===10000)await assertFails(commit)
  else await assertSucceeds(commit)
})
