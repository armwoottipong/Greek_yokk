import { describe, it, expect } from 'vitest'
import * as database from '../../src/domain/database'
import { DEFAULT_ADDONS, DEFAULT_MATERIALS } from '../../src/data/initialData'
import { createTestStore, material } from '../helpers/createStore'

function version3Snapshot() {
  const honey = material('HONEY', 100, { name: 'Honey', category: 'Sauces' })
  const cup = material('CUP', 5, { name: 'Cup', category: 'Packaging', unit: 'pcs' })
  delete honey.inventoryType
  delete cup.inventoryType
  return {
    schemaVersion: 3,
    materials: [honey, cup],
    menus: [{ id: 'M', prices: { P: 80 }, recipe: [{ materialId: 'HONEY', qty: 20 }, { materialId: 'CUP', qty: 1 }] }],
    addons: [{ id: 'A', prices: { P: 10 }, materialId: 'HONEY', amountUsed: 15 }],
    platforms: [{ id: 'P', name: 'Store', gpPercent: 0 }],
    orders: [{ orderId: 'O', subtotal: 90, gpAmount: 0, netRevenue: 90, foodCost: 30, grossProfit: 60, items: [], stockShortages: [{ materialId: 'CUP', qty: 1 }] }],
    activityLogs: [],
    categories: { menu: [], material: [], addon: [] },
    stockShortages: [{ orderId: 'O', materialId: 'CUP', qty: 1 }, { orderId: 'OLD', materialId: 'removed', qty: 2 }]
  }
}

describe('canonical schema version 4', () => {
  it('migrates version 3 material types addon linkage and historical costs to version 4', () => {
    const raw = version3Snapshot()
    const original = structuredClone(raw)
    const result = database.normalizeDatabase(raw, { source: 'import' })
    expect(result.ok).toBe(true)
    expect(result.value.schemaVersion).toBe(4)
    expect(result.value.materials.find(x => x.id === 'CUP').inventoryType).toBe('packaging')
    expect(result.value.materials.find(x => x.id === 'HONEY').inventoryType).toBe('ingredient')
    expect(result.value.addons[0].recipe).toEqual([{ materialId: 'HONEY', qty: 15 }])
    expect(result.value.addons[0]).not.toHaveProperty('materialId')
    expect(result.value.addons[0]).not.toHaveProperty('amountUsed')
    expect(result.value.orders[0]).toMatchObject({ ingredientCost: 30, packagingCost: 0, expectedPackagingShortageCost: 0, foodCost: 30, packagePlan: [] })
    expect(raw).toEqual(original)
  })

  it('makes version 3 migration idempotent after canonical serialization', () => {
    const once = database.normalizeDatabase(version3Snapshot(), { source: 'import' }).value
    expect(once.schemaVersion).toBe(4)
    const serialized = JSON.parse(JSON.stringify(once))
    expect(database.normalizeDatabase(serialized, { source: 'canonical' }).value).toEqual(once)
  })

  it.each([
    ['Package supplies', 'Plain', 'packaging'],
    ['New packaging category', 'Plain', 'packaging'],
    ['บรรจุภัณฑ์พิเศษ', 'Plain', 'packaging'],
    ['Renamed supplies', 'ถ้วยกระดาษ', 'packaging'],
    ['Renamed supplies', 'ช้อนไม้', 'packaging'],
    ['Renamed supplies', 'ถุงหิ้ว', 'packaging'],
    ['Renamed supplies', 'แก้วใส', 'packaging'],
    ['Dairy', 'Greek yogurt', 'ingredient']
  ])('infers the legacy type for category %s and name %s', (category, name, expected) => {
    const raw = version3Snapshot()
    Object.assign(raw.materials[1], { category, name })
    expect(database.normalizeDatabase(raw).value.materials[1].inventoryType).toBe(expected)
  })

  it('exports the inventory inference used by migration', () => {
    expect(typeof database.inferInventoryType).toBe('function')
    expect(database.inferInventoryType({ category: 'Packaging', name: 'Plain' })).toBe('packaging')
    expect(database.inferInventoryType({})).toBe('ingredient')
  })

  it('preserves a persisted type through category and name changes', () => {
    const raw = version3Snapshot()
    raw.materials[1].inventoryType = 'ingredient'
    const migrated = database.normalizeDatabase(raw).value
    migrated.materials[1].category = 'บรรจุภัณฑ์'
    expect(database.normalizeDatabase(migrated).value.materials[1].inventoryType).toBe('ingredient')
  })

  it.each(['Package', '', null, 1, false])('rejects invalid inventoryType %s', inventoryType => {
    const raw = version3Snapshot()
    raw.materials[1].inventoryType = inventoryType
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ path: 'materials[1].inventoryType', code: 'INVALID_INVENTORY_TYPE' }))
  })

  it('normalizes unlinked legacy addons to an empty recipe', () => {
    const raw = version3Snapshot()
    raw.addons[0].materialId = ''
    expect(database.normalizeDatabase(raw).value.addons[0]).toMatchObject({ recipe: [] })
  })

  it('rejects a missing addon recipe material in version 4', () => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    raw.addons = [{ id: 'A', recipe: [{ materialId: 'missing', qty: 1 }] }]
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ path: 'addons[0].recipe[0]', code: 'MISSING_MATERIAL' }))
  })

  it.each([0, -1, NaN, Infinity, true, null, ''])('rejects non-positive or invalid addon recipe quantity %s', qty => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    raw.addons = [{ id: 'A', recipe: [{ materialId: 'HONEY', qty }] }]
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors.some(error => error.path === 'addons[0].recipe[0].qty')).toBe(true)
  })

  it('rejects a non-positive legacy addon linkage quantity', () => {
    const raw = version3Snapshot()
    raw.addons[0].amountUsed = 0
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors.some(error => error.path === 'addons[0].recipe[0].qty')).toBe(true)
  })

  it('aggregates duplicate addon material rows into one canonical requirement', () => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    raw.addons = [{ id: 'A', recipe: [{ materialId: 'HONEY', qty: 2 }, { materialId: 'HONEY', qty: 3 }, { materialId: 'CUP', qty: 1 }] }]
    expect(database.normalizeDatabase(raw).value.addons[0].recipe).toEqual([{ materialId: 'HONEY', qty: 5 }, { materialId: 'CUP', qty: 1 }])
  })

  it.each(['ingredientCost', 'packagingCost', 'expectedPackagingShortageCost'])('rejects negative %s', key => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    raw.orders[0][key] = -1
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ path: `orders[0].${key}`, code: 'INVALID_NUMBER' }))
  })

  it('preserves canonical split costs and package evidence through a round trip', () => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    Object.assign(raw.orders[0], { ingredientCost: 25, packagingCost: 5, expectedPackagingShortageCost: 2, packagePlan: [{ materialId: 'CUP', baselineQty: 2, adjustmentQty: -1, requestedQty: 1, fulfilledQty: 1, shortageQty: 0, fulfilledCost: 5, expectedShortageCost: 0, reason: 'customer_declined', note: '', sources: [] }] })
    const once = database.normalizeDatabase(raw)
    expect(once.ok).toBe(true)
    expect(once.value.orders[0]).toMatchObject({ foodCost: 30, ingredientCost: 25, packagingCost: 5, expectedPackagingShortageCost: 2, packagePlan: raw.orders[0].packagePlan })
    expect(database.normalizeDatabase(JSON.parse(JSON.stringify(once.value)), { source: 'canonical' }).value).toEqual(once.value)
  })

  it('rejects canonical split costs that conflict with foodCost', () => {
    const raw = version3Snapshot()
    raw.schemaVersion = 4
    Object.assign(raw.orders[0], { ingredientCost: 30, packagingCost: 5 })
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(false)
    expect(result.errors).toContainEqual(expect.objectContaining({ path: 'orders[0].foodCost', code: 'COST_TOTAL_CONFLICT' }))
  })

  it('tags top-level and order shortages without rejecting orphaned history', () => {
    const result = database.normalizeDatabase(version3Snapshot())
    expect(result.ok).toBe(true)
    expect(result.value.stockShortages).toEqual([{ orderId: 'O', materialId: 'CUP', qty: 1, inventoryType: 'packaging' }, { orderId: 'OLD', materialId: 'removed', qty: 2, inventoryType: 'ingredient' }])
    expect(result.value.orders[0].stockShortages[0].inventoryType).toBe('packaging')
  })

  it('preserves version 3 menu recipes quantities totals and historical gross profit', () => {
    const raw = version3Snapshot()
    raw.orders[0].grossProfit = -7
    const result = database.normalizeDatabase(raw)
    expect(result.ok).toBe(true)
    expect(result.value.menus[0].recipe).toEqual(raw.menus[0].recipe)
    expect(result.value.materials.map(item => ({ stock: item.stock, lots: item.lots }))).toEqual(raw.materials.map(item => ({ stock: item.stock, lots: item.lots.map(lot => ({ ...lot, packCost: 1000, receiveDate: lot.receiveDate, expiryDate: lot.expiryDate })) })))
    expect(result.value.orders[0]).toMatchObject({ subtotal: 90, gpAmount: 0, netRevenue: 90, foodCost: 30, ingredientCost: 30, grossProfit: -7 })
  })

  it('exports canonical demo types recipes and schema version', () => {
    expect(DEFAULT_MATERIALS.every(item => ['ingredient', 'packaging'].includes(item.inventoryType))).toBe(true)
    expect(DEFAULT_MATERIALS.find(item => item.id === 'MAT010').inventoryType).toBe('packaging')
    expect(DEFAULT_ADDONS[0].recipe).toEqual([{ materialId: 'MAT004', qty: 30 }])
    expect(DEFAULT_ADDONS[0]).not.toHaveProperty('materialId')
    const store = createTestStore()
    expect(store.resetDemoData().ok).toBe(true)
    expect(store.databaseSnapshot().schemaVersion).toBe(4)
    expect(database.normalizeDatabase(store.exportDatabase(), { source: 'canonical' }).ok).toBe(true)
  })
})
