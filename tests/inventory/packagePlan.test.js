import { describe, expect, it } from 'vitest'
import * as packageDomain from '../../src/domain/packagePlan'
import { allocateInventory } from '../../src/domain/inventory'
import { material } from '../helpers/createStore'

const materials = [
  material('YOGURT'),
  material('CUP', 3, { name: 'Cup', unit: 'piece', inventoryType: 'packaging', unitCost: 1.25 }),
  material('BAG', 10, { name: 'Bag', unit: 'piece', inventoryType: 'packaging', unitCost: 0.333 }),
]
const menu = { id: 'M', name: 'Bowl', recipe: [{ materialId: 'YOGURT', qty: 10 }, { materialId: 'CUP', qty: 1 }] }
const addon = { id: 'A', name: 'Separate topping', recipe: [{ materialId: 'YOGURT', qty: 5 }, { materialId: 'CUP', qty: 2 }] }
const cart = [{ menu, selectedAddons: [addon], qty: 2 }]
const adjustment = (overrides = {}) => ({ materialId: 'CUP', deltaQty: 1, reason: 'separate_bag', note: '', ...overrides })

describe('buildPackagePlan', () => {
  it('aggregates Menu and Add-on packaging while retaining source quantities', () => {
    expect(packageDomain.buildPackagePlan(cart, materials)).toEqual({ ok: true, issues: [], items: [{
      materialId: 'CUP', materialName: 'Cup', unit: 'piece', baselineQty: 6, adjustmentQty: 0,
      requestedQty: 6, fulfilledQty: 0, shortageQty: 0, unitCost: 1.25, fulfilledCost: 0,
      expectedShortageCost: 0, reason: null, note: '', sources: [
        { sourceType: 'menu', sourceId: 'M', sourceName: 'Bowl', qty: 2 },
        { sourceType: 'addon', sourceId: 'A', sourceName: 'Separate topping', qty: 4 },
      ],
    }] })
  })
  it('aggregates the same source across cart lines without duplicating evidence', () => {
    const result = packageDomain.buildPackagePlan([{ menu, qty: 1 }, { menu, qty: 2 }], materials)
    expect(result.items[0]).toMatchObject({ baselineQty: 3, sources: [{ sourceType: 'menu', sourceId: 'M', sourceName: 'Bowl', qty: 3 }] })
  })
  it('adds a manual-only Package from a zero baseline', () => {
    const result = packageDomain.buildPackagePlan(cart, materials, [adjustment({ materialId: 'BAG', deltaQty: 2 })])
    expect(result.ok).toBe(true)
    expect(result.items[1]).toMatchObject({ materialId: 'BAG', baselineQty: 0, adjustmentQty: 2, requestedQty: 2, sources: [], reason: 'separate_bag' })
  })
  it.each(['separate_bag', 'customer_declined', 'combined_packaging', 'package_unavailable', 'repacked', 'other'])('accepts the standard reason %s', reason => {
    expect(packageDomain.PACKAGE_ADJUSTMENT_REASONS).toContain(reason)
    expect(packageDomain.buildPackagePlan(cart, materials, [adjustment({ reason, note: 'Preparation note' })]).ok).toBe(true)
  })
  it.each([undefined, '', 'invented'])('reports missing or unsupported adjustment reason %s', reason => {
    expect(packageDomain.buildPackagePlan(cart, materials, [adjustment({ reason })])).toMatchObject({ ok: false, issues: [{ materialId: 'CUP', code: 'INVALID_ADJUSTMENT_REASON' }] })
  })
  it.each(['', '   '])('requires a nonblank note for other', note => {
    expect(packageDomain.buildPackagePlan(cart, materials, [adjustment({ reason: 'other', note })])).toMatchObject({ ok: false, issues: [{ code: 'ADJUSTMENT_NOTE_REQUIRED' }] })
  })
  it('recomputes the baseline with the original negative delta and clamps only requested quantity', () => {
    const delta = adjustment({ deltaQty: -3, reason: 'customer_declined' })
    expect(packageDomain.buildPackagePlan([{ menu, qty: 5 }], materials, [delta]).items[0]).toMatchObject({ baselineQty: 5, adjustmentQty: -3, requestedQty: 2 })
    const shrunkCart = [{ menu, qty: 1 }]
    expect(packageDomain.buildPackagePlan(shrunkCart, materials, [{ materialId: 'CUP', deltaQty: -3, reason: 'customer_declined', note: '' }]).items[0])
      .toMatchObject({ baselineQty: 1, adjustmentQty: -3, requestedQty: 0 })
    expect(packageDomain.buildPackagePlan([], materials, [delta]).items[0]).toMatchObject({ baselineQty: 0, adjustmentQty: -3, requestedQty: 0 })
  })
  it('resets adjustment evidence by omitting an adjustment', () => {
    expect(packageDomain.buildPackagePlan(cart, materials).items[0]).toMatchObject({ baselineQty: 6, adjustmentQty: 0, requestedQty: 6, reason: null, note: '' })
  })
  it.each([
    ['missing', 'MISSING', materials, 'MISSING_MATERIAL'],
    ['archived', 'CUP', materials.map(m => m.id === 'CUP' ? { ...m, isDeleted: true } : m), 'ARCHIVED_MATERIAL'],
    ['ingredient', 'YOGURT', materials, 'NOT_PACKAGING'],
  ])('reports %s adjustment targets', (_label, materialId, currentMaterials, code) => {
    const result = packageDomain.buildPackagePlan([], currentMaterials, [adjustment({ materialId })])
    expect(result).toMatchObject({ ok: false, issues: [{ materialId, code }] })
  })
  it.each([NaN, Infinity, Number.MAX_VALUE, -Number.MAX_VALUE, null, '', true])('rejects malformed adjustment quantity %s', deltaQty => {
    expect(packageDomain.buildPackagePlan(cart, materials, [adjustment({ deltaQty })])).toMatchObject({ ok: false, issues: [{ code: 'INVALID_ADJUSTMENT_QUANTITY' }] })
  })
  it('reports duplicate adjustments instead of silently choosing one', () => {
    expect(packageDomain.buildPackagePlan(cart, materials, [adjustment(), adjustment({ deltaQty: 2 })])).toMatchObject({ ok: false, issues: [{ code: 'DUPLICATE_ADJUSTMENT' }] })
  })
  it('rounds baseline, adjustment, and requested quantities to two decimals', () => {
    const result = packageDomain.buildPackagePlan([{ menu: { ...menu, recipe: [{ materialId: 'CUP', qty: 0.333 }] }, qty: 3 }], materials, [adjustment({ deltaQty: 0.126 })])
    expect(result.items[0]).toMatchObject({ baselineQty: 1, adjustmentQty: 0.13, requestedQty: 1.13 })
  })
  it('reports broken recipe references and archived Package baselines', () => {
    expect(packageDomain.buildPackagePlan([{ menu: { recipe: [{ materialId: 'MISSING', qty: 1 }] }, qty: 1 }], materials)).toMatchObject({ ok: false, issues: [{ code: 'MISSING_MATERIAL', materialId: 'MISSING' }] })
    expect(packageDomain.buildPackagePlan(cart, materials.map(m => m.id === 'CUP' ? { ...m, isDeleted: true } : m))).toMatchObject({ ok: false, issues: [{ code: 'ARCHIVED_MATERIAL', materialId: 'CUP' }] })
  })
  it('does not mutate recipes, cart, materials, or adjustment evidence', () => {
    const input = JSON.parse(JSON.stringify({ cart, materials, adjustments: [adjustment()] }))
    const before = JSON.stringify(input)
    const result = packageDomain.buildPackagePlan(input.cart, input.materials, input.adjustments)
    result.items[0].sources[0].qty = 999
    expect(JSON.stringify(input)).toBe(before)
  })
})

describe('Package allocation finalization', () => {
  it('emits aggregated requested requirements and omits clamped zero rows', () => {
    const plan = packageDomain.buildPackagePlan(cart, materials, [adjustment({ deltaQty: -10 }), adjustment({ materialId: 'BAG', deltaQty: 2 })])
    expect(packageDomain.packageRequirements(plan.items)).toEqual([{ materialId: 'BAG', qty: 2 }])
  })
  it('derives fulfilled and shortage costs from allocation using material unit cost', () => {
    const plan = packageDomain.buildPackagePlan(cart, materials)
    const allocation = allocateInventory(materials, packageDomain.packageRequirements(plan.items), { businessDate: '2026-10-12', allowShortage: true })
    expect(allocation.ok).toBe(true)
    const before = JSON.stringify({ plan, allocation })
    expect(packageDomain.finalizePackagePlan(plan.items, allocation)[0]).toMatchObject({ requestedQty: 6, fulfilledQty: 3, shortageQty: 3, unitCost: 1.25, fulfilledCost: 3.75, expectedShortageCost: 3.75 })
    expect(JSON.stringify({ plan, allocation })).toBe(before)
  })
  it('sums multiple lot allocations and rounds money after multiplication', () => {
    const plan = packageDomain.buildPackagePlan([], materials, [adjustment({ materialId: 'BAG', deltaQty: 4 })])
    expect(packageDomain.finalizePackagePlan(plan.items, { ok: true, allocations: [{ materialId: 'BAG', lotId: 'B1', qty: 1 }, { materialId: 'BAG', lotId: 'B2', qty: 2 }], shortages: [{ materialId: 'BAG', qty: 1 }] })[0])
      .toMatchObject({ fulfilledQty: 3, shortageQty: 1, fulfilledCost: 1, expectedShortageCost: 0.33 })
  })
  it('does not invent shortage records for successfully allocated Package quantities', () => {
    const plan = packageDomain.buildPackagePlan([{ menu, qty: 2 }], materials)
    const allocation = allocateInventory(materials, packageDomain.packageRequirements(plan.items), { businessDate: '2026-10-12' })
    expect(packageDomain.finalizePackagePlan(plan.items, allocation)[0]).toMatchObject({ fulfilledQty: 2, shortageQty: 0, fulfilledCost: 2.5, expectedShortageCost: 0 })
  })
  it('refuses to finalize a failed allocation', () => {
    const plan = packageDomain.buildPackagePlan(cart, materials)
    expect(() => packageDomain.finalizePackagePlan(plan.items, { ok: false, issues: [{ code: 'SHORTAGE' }] })).toThrow()
  })
})
