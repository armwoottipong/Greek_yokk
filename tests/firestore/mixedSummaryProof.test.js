import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION, seedProof, saleBatch } from './proofFixture.js'
import { mixedLotFixture } from './mixedLotFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

function distinctMenus(f) {
  f.order.lines.forEach((line, i) => {
    line.menuId = `MENU_${i}`
    line.catalog.id = line.menuId
    f.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
  })
  return f
}

it('accepts the independent six-menu control before group/note tampering', async () => {
  const f = distinctMenus(mixedLotFixture({ multiMaterials: 3 }))
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

for (let index = 0; index < 6; index++) {
  it(`rejects a group minimum violation only on line ${index}, across complementary guards`, async () => {
    const f = distinctMenus(mixedLotFixture())
    const line = f.order.lines[index]
    line.catalog.groups.extra.min = 3
    f.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
    await seedProof(env, f)
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
  })
  it(`rejects an overlong note only on line ${index}`, async () => {
    const f = mixedLotFixture()
    f.order.lines[index].note = 'x'.repeat(1001)
    await seedProof(env, f)
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
  })
}

it.each([0, 2, 5])('rejects a forged cumulative requirement at line proof %i', async changed => {
  const f = mixedLotFixture({ multiMaterials: 3 })
  await seedProof(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(saleBatch(db, f, { alterLineProof: (proof, i) => {
    if (i >= changed) proof.multiNeeds.YOGURT++
    return proof
  } }).commit())
  expect((await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).exists()).toBe(false)
})

it('rejects coherently overstating the last required quantity and shortage', async () => {
  const f = mixedLotFixture({ multiMaterials: 3 })
  const row = f.order.inventory[0]
  row.needed++; row.shortage++; f.order.approvedShortages[row.materialId]++
  row.ingredientCostBaht = row.needed / 100 * f.materials[0].unitCost
  f.order.ingredientCostCents = Math.round(f.order.inventory.reduce((n, r) => n + r.ingredientCostBaht, 0) * 100)
  f.order.grossProfitCents = f.order.netCents - f.order.ingredientCostCents - f.order.packagingCostCents
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f, { alterLineProof: (proof, i) => {
    if (i === 5) proof.multiNeeds.YOGURT++
    return proof
  } }).commit())
})

it.each([
  ['missing first multi material', f => { f.order.multiIds.shift() }],
  ['substituted two-lot material', f => { f.order.multiIds[0] = 'CUP' }],
  ['duplicate multi material', f => { f.order.multiIds.push(f.order.multiIds[0]) }],
])('rejects %s instead of skipping a complementary guard', async (_name, alter) => {
  const f = mixedLotFixture({ multiMaterials: 2 })
  alter(f)
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('keeps complementary group checks when multi material order is changed', async () => {
  const f = distinctMenus(mixedLotFixture({ multiMaterials: 2 }))
  f.order.multiIds.reverse()
  f.order.lines[0].catalog.groups.extra.min = 3
  f.records[`${GENERATION}/menus/${f.order.lines[0].menuId}`] = structuredClone(f.order.lines[0].catalog)
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([0, 5])('rejects a missing required summary at line %i', async index => {
  const f = mixedLotFixture()
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f, { alterLineProof: (proof, i) => {
    if (i === index) delete proof.multiNeeds
    return proof
  } }).commit())
})
