import { readFile } from 'node:fs/promises'
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { doc, getDoc } from 'firebase/firestore'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { proofFixture, seedProof, saleBatch, GENERATION } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'
import { realMenuFixture } from './realMenuFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules',import.meta.url),'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it('accepts a single custom bowl with the existing domain allocation and rounding', async () => {
  const f = proofFixture()
  f.order.lines = [f.order.lines[0]]
  recomputeFromDomain(f)
  await seedProof(env,f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('accepts all four shipped menus in one eleven-material bill', async () => {
  const f = realMenuFixture(['MENU01','MENU02','MENU03','MENU04'])
  expect(f.materials).toHaveLength(11)
  await seedProof(env,f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('accepts six lines with group-priced repeated add-ons and exact shortage consent', async () => {
  const f = proofFixture()
  const pair = f.order.lines
  f.order.lines = Array.from({length:6},(_v,i) => ({ ...structuredClone(pair[i%2]),note:`bowl ${i+1}` }))
  recomputeFromDomain(f)
  await seedProof(env,f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects a seven-line bill atomically instead of splitting a sale into commits', async () => {
  const f = proofFixture()
  f.order.lines = Array.from({length:7},() => structuredClone(f.order.lines[0]))
  recomputeFromDomain(f)
  await seedProof(env,f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

for (const lines of [4,6]) {
  it(`rejects a coherent forged shortage on the ${lines}-line validation route atomically`, async () => {
    const f = proofFixture()
    const pair = f.order.lines
    f.order.lines = Array.from({length:lines},(_v,i) => structuredClone(pair[i%2]))
    recomputeFromDomain(f)
    await seedProof(env,f)
    f.order.inventory[0].shortage++
    f.order.approvedShortages[f.order.materialIds[0]]++
    const db = env.authenticatedContext('cashier').firestore()
    await assertFails(saleBatch(db,f).commit())
    expect((await getDoc(doc(db,`${GENERATION}/orders/${f.order.opId}`))).exists()).toBe(false)
    for (const m of f.materials) expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
  })
  it(`rejects the wrong immutable lot identity on the ${lines}-line validation route`, async () => {
    const f = proofFixture()
    const pair = f.order.lines
    f.order.lines = Array.from({length:lines},(_v,i) => structuredClone(pair[i%2]))
    recomputeFromDomain(f)
    await seedProof(env,f)
    f.order.inventory[0].lot0Id = 'FORGED'
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  })
}

it('does not allow child proofs to be planted without a new atomic parent sale', async () => {
  const f = proofFixture()
  await seedProof(env,f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f,{omitOrder:true,omitShop:true}).commit())
})

it('does not expose shop records without login', async () => {
  const f = proofFixture()
  await seedProof(env,f)
  await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'shops/proof-shop')))
})

it('rejects a coherently reordered floating-point cost ledger', async () => {
  const f = proofFixture()
  f.materials[0].unitCost = 0.01
  f.materials[1].unitCost = 0.02
  f.materials[2].unitCost = 0.005
  f.order.lines = [f.order.lines[0]]
  const line = f.order.lines[0]
  line.options = []
  line.catalog.recipe = {YOGURT:100,FRUIT:100,TOPPING:100,CUP:100}
  f.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
  f.order.packaging = {}
  recomputeFromDomain(f)
  expect(f.order.ingredientCostCents).toBe(3)
  await seedProof(env,f)
  const indices = [0,2,1,3]
  f.order.inventory = indices.map(i => f.order.inventory[i])
  f.order.materialIds = f.order.inventory.map(r => r.materialId)
  for (const m of f.nextMaterials) m.lastOpIndex = f.order.materialIds.indexOf(m.id)
  f.order.ingredientCostCents = Math.round(f.order.inventory.reduce((n,r) => n+r.ingredientCostBaht,0)*100)
  f.order.grossProfitCents = f.order.netCents-f.order.ingredientCostCents-f.order.packagingCostCents
  expect(f.order.ingredientCostCents).toBe(4)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects an option belonging to a detached catalog group', async () => {
  const f = proofFixture()
  for (const line of f.order.lines) {
    line.catalog.groupIds = []
    f.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
  }
  recomputeFromDomain(f)
  await seedProof(env,f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('accepts platform-specific menu and group-option prices with delivery GP', async () => {
  const f = proofFixture()
  f.order.platformId = 'PLAT02'
  for (const line of f.order.lines) for (const choice of line.options) {
    choice.unitPriceCents = line.catalog.groups[choice.groupId].included ? 0 : choice.definition.pricesCents.PLAT02
  }
  recomputeFromDomain(f)
  await seedProof(env,f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects a delivery bill coherently charged at storefront prices', async () => {
  const f = proofFixture()
  await seedProof(env,f)
  f.order.platformId = 'PLAT02'
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

const sixLineTampering = [
 ['a wrong material ordinal', f => {f.nextMaterials[2].lastOpIndex=0}],
 ['forged ingredient contribution and matching profit', f => {
   f.order.inventory[0].ingredientCostBaht+=0.01
   f.order.ingredientCostCents=Math.round(f.order.inventory.reduce((n,r)=>n+r.ingredientCostBaht,0)*100)
   f.order.grossProfitCents=f.order.netCents-f.order.ingredientCostCents-f.order.packagingCostCents
 }],
 ['a forged stock total', f => {f.nextMaterials[0].stock++}],
 ['a substituted material cost rank', f => {f.order.inventory[2].costRank=0}],
 ['an omitted middle line', _f => {}, {omitLine:2}],
 ['an omitted middle inventory witness', _f => {}, {omitWitness:1}],
 ['an omitted material', _f => {}, {omitMaterial:'FRUIT'}]
]
it.each(sixLineTampering)('rejects %s on the six-line branch',async (_label,alter,options={}) => {
 const f=proofFixture(), pair=f.order.lines
 f.order.lines=Array.from({length:6},(_,i)=>structuredClone(pair[i%2]))
 recomputeFromDomain(f)
 await seedProof(env,f)
 alter(f)
 await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f,options).commit())
})

it('accepts six shipped menu lines across all eleven materials in one commit',async()=>{
 const f=realMenuFixture(['MENU01','MENU02','MENU03','MENU04','MENU03','MENU04'])
 await seedProof(env,f)
 await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
