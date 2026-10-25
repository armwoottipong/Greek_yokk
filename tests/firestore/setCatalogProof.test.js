import { readFile } from 'node:fs/promises'
import { isDeepStrictEqual } from 'node:util'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, updateDoc, runTransaction } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT, GENERATION } from './proofFixture.js'
import { setCatalogFixture, seedSetCatalog, setSaleBatch, setOptionCodes, compileVariants } from './setCatalogFixture.js'
import { firstLot } from './setLots.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidates/set-catalog.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it.each([2, 4])('sells six lines across %i retained stock lots', async count => {
  const f = setCatalogFixture({ lines: 6, prepareMaterials: materials => {
    const m = materials[0], quantities = count === 2 ? [500, 999500] : [500, 500, 1000, 998000]
    m.lots = quantities.map((qty, i) => ({ ...m.lots[0], id: `MANY-${i}`, qty, isInUse: i === 0, receiveDay: 20000 + i }))
    m.activeLotId = m.lots[0].id
  } })
  await seedSetCatalog(env, f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('sells six lines with four retained lots on every material', async () => {
  const f = setCatalogFixture({ lines: 6, prepareMaterials: materials => {
    for (const m of materials) {
      m.lots = [500,500,1000,998000].map((qty,i) => ({ ...m.lots[0], id: `${m.id}-LOT-${i}`, qty, isInUse: i === 0, receiveDay: 20000+i }))
      m.activeLotId = m.lots[0].id
    }
  } })
  await seedSetCatalog(env,f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

function historyFixture() {
  return setCatalogFixture({ lines: 6, prepareMaterials: materials => {
    const m = materials[0], original = m.lots[0]
    m.lots = [
      ...Array.from({ length: 40 }, (_,i) => ({ ...original,id:`ARCHIVE-${i}`,qty:0,isInUse:false })),
      ...[500,500,1000,998000].map((qty,i) => ({ ...original,id:`LIVE-${i}`,qty,isInUse:i === 0,receiveDay:20000+i })),
    ]
    m.activeLotId = 'LIVE-0'
  } })
}

it('preserves depleted lot history outside the four live slots', async () => {
  const f = historyFixture()
  await seedSetCatalog(env,f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  const m = (await getDoc(doc(env.authenticatedContext('cashier').firestore(),`${GENERATION}/materials/S0`))).data()
  expect(m.lotIds).toHaveLength(44)
  expect(m.lots['ARCHIVE-39']).toEqual(f.materials[0].lots['ARCHIVE-39'])
})

it.each([
  ['wrong option code', f => { f.order.lines[0].optionCode = 0 }],
  ['altered recipe lookup', f => { f.nextMaterials[0].recipeIndex.variantQuantities.SIMPLE[2047]-- }],
  ['altered price lookup', f => { f.nextShop.catalog.menus.SIMPLE.variantPrices.P[2047]-- }],
  ['changed archive', f => { f.nextMaterials[0].lots['ARCHIVE-0'].qty = 1 }],
  ['deleted archive', f => { delete f.nextMaterials[0].lots['ARCHIVE-0'] }],
  ['reordered slots', f => { f.nextMaterials[0].slotIds.reverse() }],
  ['wrong allocation split', f => { f.order.inventory[0].lotTakes[0]--; f.order.inventory[0].lotTakes[1]++ }],
  ['changed active lot', f => { f.nextMaterials[0].activeLotId = 'LIVE-0' }],
])('rejects %s in the multi-lot sale', async (_,change) => {
  const f = historyFixture(); change(f)
  await seedSetCatalog(env,f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(setSaleBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(1)
})

it.each([{ lines: 1, fruit: true }, { lines: 1 }, { lines: 6 }, { lines: 6, menuPattern: ['SIMPLE', 'BANANA', 'CRUNCH'] }])('commits source-shaped set selections $lines / fruit=$fruit', async options => {
  const f = setCatalogFixture(options)
  await seedSetCatalog(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setSaleBatch(db, f).commit())
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
  for (const m of f.nextMaterials) expect((await getDoc(doc(db, `${GENERATION}/materials/${m.id}`))).data()).toEqual(m)
})

it.each(['material', 'order', 'shop', 'line'])('rejects missing mandatory %s atomically', async omission => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env, f)
  const options = { material: { omitMaterial: f.order.materialIds[4] }, order: { omitOrder: true }, shop: { omitShop: true }, line: { omitLine: 1 } }[omission]
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(setSaleBatch(db, f, options).commit())
})

it('preserves unused expired stock without inventing a depletion or active-lot change', async () => {
  const f = setCatalogFixture({ fruit: true })
  const before = f.materials.find(m => m.id === 'S5'), after = f.nextMaterials.find(m => m.id === 'S5')
  expect(f.order.inventory.find(row => row.materialId === 'S5').needed).toBe(0)
  firstLot(before).expiryDay = 0; firstLot(after).expiryDay = 0
  await seedSetCatalog(env, f)
  await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each(Array.from({ length: 15 }, (_, i) => i))('rejects omitted stock-chain member %i', async index => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(setSaleBatch(db, f, { omitMaterial: f.order.materialIds[index] }).commit())
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(1)
  expect((await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).exists()).toBe(false)
})

function recalculateTotals(f) {
  setOptionCodes(f.order, f.shop)
  f.order.subtotalCents = f.order.lines.reduce((n, line) => n + line.totalCents, 0)
  f.order.gpCents = Math.round(f.order.subtotalCents * .3)
  f.order.netCents = f.order.subtotalCents - f.order.gpCents
  f.order.grossProfitCents = f.order.netCents - f.order.ingredientCostCents - f.order.packagingCostCents
}

function recalculateInventoryTotals(f) {
  let ingredient = 0, packaging = 0
  f.order.inventory.forEach(row => {
    ingredient += row.ingredientCostBaht; packaging += row.packagingCostCents
  })
  f.order.ingredientCostCents = Math.round(ingredient * 100)
  f.order.packagingCostCents = packaging
  recalculateTotals(f)
}

it.each(['missing', 'zero'])('distinguishes a %s option price from explicit zero', async mode => {
  const f = setCatalogFixture(), menu = f.shop.catalog.menus.SIMPLE
  if (mode === 'missing') delete menu.optionPrices.P.A0
  else menu.optionPrices.P.A0 = 0
  compileVariants(f.shop.catalog.menus, f.shop.catalog.addonIds)
  f.nextShop.catalog = structuredClone(f.shop.catalog)
  f.order.lines[0].catalog = structuredClone(menu)
  f.order.lines[0].totalCents -= 100; recalculateTotals(f)
  await seedSetCatalog(env, f)
  const operation = setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit()
  if (mode === 'missing') await assertFails(operation)
  else await assertSucceeds(operation)
})

it('rejects selecting the reserved zero-price padding key despite coherent costs and stock', async () => {
  const f = setCatalogFixture()
  f.order.lines[0].optionIds[0] = '_'; f.order.lines[0].totalCents -= 100
  for (const id of ['S0', 'S11']) {
    const index = f.order.materialIds.indexOf(id), row = f.order.inventory[index], before = f.materials[index], next = f.nextMaterials[index]
    row.needed -= 100; row.take -= 100; row.lotTakes[0] -= 100; next.stock += 100; firstLot(next).qty += 100
    if (before.inventoryType === 'ingredient') row.ingredientCostBaht = row.needed / 100 * before.unitCost
    else row.packagingCostCents = Math.round(row.take / 100 * before.unitCost * 100)
  }
  recalculateInventoryTotals(f); await seedSetCatalog(env, f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([
  ['changed price with coherent bill totals', f => { f.order.lines[0].totalCents--; recalculateTotals(f) }],
  ['changed menu snapshot', f => { f.order.lines[0].catalog.pricesCents.P-- }],
  ['injected catalog price', f => { f.nextShop.catalog.menus.SIMPLE.pricesCents.P-- }],
  ['changed reverse recipe index', f => { f.nextMaterials[0].recipeIndex.optionQty++ }],
  ['forged intermediate material cost', f => { f.order.inventory[7].ingredientCostBaht++; recalculateInventoryTotals(f) }],
  ['skipped material index', f => { f.nextMaterials[7].lastOpIndex-- }],
  ['changed material revision', f => { f.nextMaterials[7].revision++ }],
  ['unapproved shortage', f => { f.order.approvedShortages.S0++ }],
  ['swapped material references', f => { [f.order.materialIds[0], f.order.materialIds[1]] = [f.order.materialIds[1], f.order.materialIds[0]] }],
  ['changed unit cost', f => { f.nextMaterials[0].unitCost++ }],
  ['changed lot ID', f => { firstLot(f.nextMaterials[0]).id = 'FORGED' }],
  ['wrong author', f => { f.order.uid = 'different-user' }],
  ['invalid GP with coherent net and profit', f => { f.order.gpCents++; f.order.netCents--; f.order.grossProfitCents-- }],
  ['oversized note', f => { f.order.lines[0].note = 'n'.repeat(1001) }],
])('rejects %s and preserves source data', async (_label, alter) => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env, f); alter(f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(setSaleBatch(db, f).commit())
  expect((await getDoc(doc(db, ROOT))).data()).toEqual(f.shop)
  expect((await getDoc(doc(db, `${GENERATION}/materials/S0`))).data()).toEqual(f.materials[0])
})

it('rejects coherent under-deduction with recomputed costs and shortages', async () => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env, f)
  const row = f.order.inventory[0], next = f.nextMaterials[0]
  row.needed--; row.take--; row.lotTakes[0]--; next.stock++; firstLot(next).qty++
  row.ingredientCostBaht = row.needed / 100 * f.materials[0].unitCost
  let ingredient = 0, packaging = 0
  f.order.inventory.forEach(r => {
    ingredient += r.ingredientCostBaht; packaging += r.packagingCostCents
  })
  f.order.ingredientCostCents = Math.round(ingredient * 100); f.order.packagingCostCents = packaging; recalculateTotals(f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('rejects a coherent material permutation with recomputed rounded costs', async () => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env,f)
  for (const rows of [f.order.materialIds,f.order.inventory,f.nextMaterials]) [rows[0],rows[1]] = [rows[1],rows[0]]
  f.nextMaterials.forEach((m,i) => { m.lastOpIndex = i })
  recalculateInventoryTotals(f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects receipt edits, old-operation stock replay and proof replacement after commit', async () => {
  const f = setCatalogFixture({ lines: 6 }); await seedSetCatalog(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setSaleBatch(db, f).commit())
  await assertFails(updateDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`), { grossProfitCents: 0 }))
  const next = structuredClone(f.nextMaterials[0]), take = f.order.inventory[0].take
  next.revision++; next.stock -= take; firstLot(next).qty -= take
  await assertFails(setDoc(doc(db, `${GENERATION}/materials/${next.id}`), next))
  await assertFails(setDoc(doc(db, `${GENERATION}/orders/${f.order.opId}/lineProofs/0`), { opId: f.order.opId, index: 0, lines: [] }))
  expect((await getDoc(doc(db, `${GENERATION}/materials/${next.id}`))).data()).toEqual(f.nextMaterials[0])
})

it('denies anonymous sale confirmation', async () => {
  const f = setCatalogFixture(); await seedSetCatalog(env, f)
  await assertFails(setSaleBatch(env.unauthenticatedContext().firestore(), f).commit())
})

it.each([['A0', 'A1'], ['A0', 'A1', 'A2', 'A3']])('rejects a coherent Fruit selection of %j instead of three', async (...choices) => {
  // Vitest expands array rows into positional arguments.
  const f = setCatalogFixture({ fruit: true, choices }); await seedSetCatalog(env, f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('rejects seven lines without splitting the sale', async () => {
  const f = setCatalogFixture({ lines: 7 }); await seedSetCatalog(env, f)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('commits exactly one of two signed-in users competing for the same revision', async () => {
  const a = setCatalogFixture({ lines: 6 }), b = setCatalogFixture({ lines: 6, opId: 'SET-OTHER', uid: 'new-google-user' })
  await seedSetCatalog(env, a)
  const results = await Promise.allSettled([
    setSaleBatch(env.authenticatedContext(a.order.uid).firestore(), a).commit(),
    setSaleBatch(env.authenticatedContext(b.order.uid).firestore(), b).commit(),
  ])
  expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
  const db = env.authenticatedContext(a.order.uid).firestore()
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
  const receipts = await Promise.all([a, b].map(f => getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))))
  expect(receipts.filter(receipt => receipt.exists())).toHaveLength(1)
})

// Test transport only. Product command transport remains gated. IDs/payload are
// fixed before callback retries; read every source before staging any writes.
async function submitTransaction(db, f) {
  return runTransaction(db, async transaction => {
    const existing = await transaction.get(doc(db, `${GENERATION}/orders/${f.order.opId}`))
    if (existing.exists()) {
      const payload = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'createdAt'))
      if (!isDeepStrictEqual(payload(existing.data()), payload(f.order))) throw new Error('OP_ID_REUSED')
      return { opId: f.order.opId, replayed: true }
    }
    const root = await transaction.get(doc(db, ROOT))
    if (root.data().revision !== f.shop.revision) throw new Error('SOURCE_CHANGED')
    for (const row of f.order.inventory) {
      const material = await transaction.get(doc(db, `${GENERATION}/materials/${row.materialId}`))
      if (material.data().revision !== row.revision) throw new Error('SOURCE_CHANGED')
    }
    setSaleBatch(db, f, { writeTarget: transaction })
    return { opId: f.order.opId, replayed: false }
  })
}

it('uses a real SDK transaction at six lines/fifteen materials and replays without another deduction', async () => {
  const f = setCatalogFixture({ lines: 6, menuPattern: ['SIMPLE', 'BANANA', 'CRUNCH'] })
  await seedSetCatalog(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await expect(submitTransaction(db, f)).resolves.toEqual({ opId: f.order.opId, replayed: false })
  await expect(submitTransaction(db, f)).resolves.toEqual({ opId: f.order.opId, replayed: true })
  const altered = { ...f, order: { ...f.order, approvedShortages: { ...f.order.approvedShortages, S0: 1 } } }
  await expect(submitTransaction(db, altered)).rejects.toThrow('OP_ID_REUSED')
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
  expect((await getDoc(doc(db, `${GENERATION}/materials/S0`))).data().stock).toBe(f.nextMaterials[0].stock)
})
