import { readFile } from 'node:fs/promises'
import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore'
import { createRulesTest, assertEmulatorTarget } from './helpers.js'
import { proofFixture, seedProof, saleBatch, ROOT, GENERATION, IDS } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'

let env
let fixture
beforeAll(async () => {
  const rules = await readFile(new URL('./candidate.rules', import.meta.url), 'utf8')
  env = await createRulesTest({ rules })
})
beforeEach(async () => { await env.clearFirestore(); fixture = proofFixture(); await seedProof(env, fixture) })
afterAll(async () => { await env?.cleanup() })

describe('Spark security proof (synthetic data, no production access)', () => {
  it('refuses non-demo projects and non-local emulator targets', () => {
    expect(() => assertEmulatorTarget('yoggie-db', '127.0.0.1:8088')).toThrow('demo-')
    expect(() => assertEmulatorTarget('demo-greek-yogg', 'example.com:8088')).toThrow('local')
  })

  it('accepts a complete two-menu sale with group prices, repeated add-ons, packaging adjustment, split lots, GP and exact shortage consent', async () => {
    const db = env.authenticatedContext('cashier').firestore()
    await assertSucceeds(saleBatch(db, fixture).commit())
    const saved = (await getDoc(doc(db, `${GENERATION}/orders/${fixture.order.opId}`))).data()
    expect(saved.subtotalCents).toBe(20200)
    expect(saved.createdAt.toMillis()).toBeGreaterThan(0)
    for (let i = 0; i < IDS.length; i++) {
      const material = (await getDoc(doc(db, `${GENERATION}/materials/${IDS[i]}`))).data()
      expect(material.stock).toBe(fixture.nextMaterials[i].stock)
    }
  })

  it.each(['outsider', 'another-shop-member'])('accepts a sale from any signed-in account: %s', async uid => {
    const db = env.authenticatedContext(uid).firestore()
    fixture.order.uid = uid
    await assertSucceeds(saleBatch(db, fixture).commit())
  })

  it('rejects an unauthenticated sale', async () => {
    await assertFails(saleBatch(env.unauthenticatedContext().firestore(), fixture).commit())
  })

  it('ignores role claims because login is the only access gate', async () => {
    fixture.order.uid = 'outsider'
    await assertSucceeds(saleBatch(env.authenticatedContext('outsider', { role: 'owner' }).firestore(), fixture).commit())
  })

  const tampering = [
    ['wrong author', f => { f.order.uid = 'owner' }],
    ['forged subtotal', f => { f.order.subtotalCents = 1 }],
    ['forged line price', f => { f.order.lines[0].totalCents = 1 }],
    ['wrong GP', f => { f.order.gpCents = 0 }],
    ['wrong net', f => { f.order.netCents++ }],
    ['wrong ingredient cost', f => { f.order.ingredientCostCents++ }],
    ['wrong package cost', f => { f.order.packagingCostCents++ }],
    ['forged ingredient cost contribution', f => { f.order.inventory[0].ingredientCostBaht++ }],
    ['forged package cost contribution', f => { f.order.inventory[3].packagingCostCents++ }],
    ['wrong profit', f => { f.order.grossProfitCents++ }],
    ['client-supplied recipe', f => { f.order.lines[0].recipe = [] }],
    ['stale menu approval', f => { f.order.lines[0].menuRevision = 0 }],
    ['stale platform approval', f => { f.order.platformRevision = 0 }],
    ['duplicate material reference', f => { f.order.materialIds[3] = f.order.materialIds[0] }],
    ['omitted recipe component', f => { f.order.inventory[0].needed-- }],
    ['wrong lot allocation', f => { f.order.inventory[0].take0--; f.order.inventory[0].take1++ }],
    ['wrong shortage approval', f => { f.order.approvedShortages.TOPPING = 0 }],
    ['unapproved package adjustment', f => { f.order.packaging.CUP.reason = 'unknown' }],
    ['extra top-level field', f => { f.order.admin = true }],
    ['extra selection field', f => { f.order.lines[0].options[0].priceCents = 0 }],
    ['unauthorized option', f => { f.order.lines[0].options[0].addonId = 'not-offered' }],
    ['excess repeated selections', f => { f.order.lines[0].options[0].qty = 4 }],
    ['duplicate option', f => { f.order.lines[0].options[1] = { ...f.order.lines[0].options[0] } }],
    ['non-integer quantity', f => { f.order.lines[0].qty = 1.5 }],
    ['negative stock', f => { f.nextMaterials[0].stock = -1 }],
    ['unrelated material edit', f => { f.nextMaterials[0].unitCost += 0.01 }],
    ['extra lot field', f => { f.nextMaterials[0].lots[0].injected = true }],
    ['extra material field', f => { f.nextMaterials[0].injected = true }],
    ['stale inventory revision', f => { f.order.inventory[0].revision = 0 }],
    ['wrong shop revision', f => { f.nextShop.revision = 10 }]
  ]
  it.each(tampering)('rejects %s without partially committing stock', async (_name, alter) => {
    alter(fixture)
    const db = env.authenticatedContext('cashier').firestore()
    await assertFails(saleBatch(db, fixture).commit())
    const original = (await getDoc(doc(db, `${GENERATION}/materials/YOGURT`))).data()
    expect(original.stock).toBe(10000)
  })

  it.each(IDS)('rejects an omitted %s material write', async omitMaterial => {
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture, { omitMaterial }).commit())
  })
  it.each([0, 1])('rejects an omitted order line %i write', async omitLine => {
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture, { omitLine }).commit())
  })
  it('rejects an omitted inventory witness', async () => {
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture, { omitWitness: 0 }).commit())
  })
  it.each(['omitOrder', 'omitShop'])('rejects %s', async omission => {
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture, { [omission]: true }).commit())
  })

  it('requires a structured command for direct price edits', async () => {
    const db = env.authenticatedContext('cashier').firestore()
    await assertFails(updateDoc(doc(db, `${GENERATION}/menus/BOWL`), { priceCents: 1 }))
  })

  it('rejects writes in maintenance or an inactive generation', async () => {
    const db = env.authenticatedContext('cashier').firestore()
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), ROOT), { status: 'maintenance' }))
    await assertFails(saleBatch(db, fixture).commit())
    await env.withSecurityRulesDisabled(ctx => updateDoc(doc(ctx.firestore(), ROOT), { status: 'active', generation: 'g2' }))
    await assertFails(saleBatch(db, fixture).commit())
  })

  it('rejects edits to imported historical orders', async () => {
    await assertFails(setDoc(doc(env.authenticatedContext('owner').firestore(), `${GENERATION}/orders/HISTORICAL`), fixture.order))
  })

  it('rejects a second commit with an existing operation ID', async () => {
    const db = env.authenticatedContext('cashier').firestore()
    await assertSucceeds(saleBatch(db, fixture).commit())
    await assertFails(saleBatch(db, fixture).commit())
    fixture.order.subtotalCents++
    await assertFails(saleBatch(db, fixture).commit())
  })

  // These are measurements of this candidate, not acceptable product limits.
  // They must not be exported as CLOUD_LIMITS while existing menus do not fit.
  it.each([
    ['removed line without recomputing totals', f => { f.order.lines.pop() }],
    ['added line without recomputing totals', f => { f.order.lines.push(structuredClone(f.order.lines[0])) }],
    ['removed material without recomputing witnesses', f => { f.order.materialIds.pop(); f.order.inventory.pop() }],
    ['added material without its protected stock update', f => { f.order.materialIds.push('EXTRA'); f.order.inventory.push({ ...f.order.inventory[0], materialId: 'EXTRA' }) }],
    ['three options', f => { f.order.lines[0].options.push(structuredClone(f.order.lines[0].options[0])) }],
    ['quantity 1000001', f => { f.order.lines[0].qty = 1000001 }],
    ['a third lot', f => { f.nextMaterials[0].lots.push({ id: 'YOGURT-2', qty: 0, expiryDay: 999999, priority: 2 }) }]
  ])('rejects an inconsistent or unsupported candidate payload: %s', async (_name, alter) => {
    alter(fixture)
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('preserves fractional and weighted production unit costs using the domain arithmetic', async () => {
    fixture.materials[0].unitCost = (70 * 0.2075 + 5.678) / 90
    fixture.materials[1].unitCost = 0.045
    recomputeFromDomain(fixture)
    await seedProof(env, fixture)
    await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('selects the active lot by identity even when it is not at array position zero', async () => {
    fixture.order.lines[0].catalog.recipe.YOGURT = 1000
    fixture.order.lines[1].catalog.recipe.YOGURT = 0
    fixture.records[`${GENERATION}/menus/BOWL`] = structuredClone(fixture.order.lines[0].catalog)
    fixture.records[`${GENERATION}/menus/SMALL`] = structuredClone(fixture.order.lines[1].catalog)
    fixture.materials[0].lots[0].isInUse = false
    fixture.materials[0].lots[1].isInUse = true
    fixture.materials[0].activeLotId = fixture.materials[0].lots[1].id
    recomputeFromDomain(fixture)
    expect(fixture.order.inventory[0]).toMatchObject({ take0: 0, take1: 1000, lot1Id: 'YOGURT-1' })
    await seedProof(env, fixture)
    await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('rounds packaging costs per material before summing, as the existing POS does', async () => {
    fixture.materials[1].inventoryType = 'packaging'
    fixture.materials[1].unitCost = 0.005
    fixture.materials[3].unitCost = 0.005
    recomputeFromDomain(fixture)
    expect(fixture.order.packagingCostCents).toBe(20)
    await seedProof(env, fixture)
    await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('supports arbitrary owner-authored group IDs with the same constraints', async () => {
    for (const line of fixture.order.lines) {
      line.catalog.groups = { toppings: line.catalog.groups.extra, 'fruit-choice': line.catalog.groups.included }
      line.catalog.groupIds = ['toppings','fruit-choice']
      for (const c of line.options) c.groupId = c.groupId === 'extra' ? 'toppings' : 'fruit-choice'
      fixture.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
    }
    recomputeFromDomain(fixture)
    await seedProof(env, fixture)
    await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('enforces a minimum on an additional arbitrary group instead of trusting its name', async () => {
    const line = fixture.order.lines[0]
    line.catalog.groups.custom = { ...structuredClone(line.catalog.groups.included), min: 2, max: 2, repeat: true }
    line.catalog.groupIds.push('custom')
    line.options[1].groupId = 'custom'
    fixture.records[`${GENERATION}/menus/${line.menuId}`] = structuredClone(line.catalog)
    recomputeFromDomain(fixture)
    await seedProof(env, fixture)
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('rejects a forged option price even when every dependent financial total is consistent', async () => {
    fixture.order.lines[0].options[0].unitPriceCents = 0
    recomputeFromDomain(fixture)
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('allows a newly signed-in account without a membership record to read and sell', async () => {
    const db = env.authenticatedContext('brand-new-google-user').firestore()
    fixture.order.uid = 'brand-new-google-user'
    await assertSucceeds(getDoc(doc(db,ROOT)))
    await assertSucceeds(saleBatch(db,fixture).commit())
  })

  it('accepts a quantity of 100 without imposing the prototype-only 99-item cap', async () => {
    fixture.order.lines[0].qty = 100
    recomputeFromDomain(fixture)
    await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })

  it('rejects unrelated root metadata in a sale command', async () => {
    fixture.nextShop.injected = true
    await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), fixture).commit())
  })
})
