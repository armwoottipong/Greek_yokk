// @vitest-environment node
import { expect, it } from 'vitest'
import { inspectLegacySnapshot } from '../../src/cloud/preflight.js'
import { DEFAULT_MATERIALS, DEFAULT_MENUS, DEFAULT_ADDONS, DEFAULT_PLATFORMS, DEFAULT_CATEGORIES } from '../../src/data/initialData.js'

const constraints = { maxStoredLots: 4, maxQuantityQ: 1000000000, maxMaterialsPerBill: 12, maxProductionInputs: 3, maxGroupsPerMenu: 4, maxOptionsPerLine: 2 }
const snapshot = () => ({ schemaVersion: 4, revision: 0,
  materials: [{ id: 'โยเกิร์ต/1', name: 'Greek', stock: 1.25, unitCost: 0.2075, inventoryType: 'ingredient', lots: [{ id: 'L1', qty: 1.25, isInUse: true }] }],
  menus: [{ id: 'M1', prices: { P: 0 }, recipe: [{ materialId: 'โยเกิร์ต/1', qty: 0.5 }] }],
  addons: [], addonGroups: [], platforms: [{ id: 'P', gpPercent: 30, isActive: true }],
  orders: [], activityLogs: [], stockShortages: [], categories: { menu: [], material: [], addon: [] }, gasApiUrl: '',
})
const inspect = raw => inspectLegacySnapshot(raw, { constraints })

it('preserves fractional unit costs and explicit zero prices without editing the source', () => {
  const raw = snapshot(), original = structuredClone(raw)
  const result = inspect(raw)
  expect(result.ok).toBe(true)
  expect(result.value.snapshot.materials[0].unitCost).toBe(0.2075)
  expect(result.value.snapshot.menus[0].prices.P).toBe(0)
  expect(result.value.stats).toMatchObject({ materials: 1, orders: 0, maxStoredLots: 1 })
  expect(raw).toEqual(original)
})

it('reports stored lot limits including empty history; never drops or merges it', () => {
  const raw = snapshot()
  raw.materials[0].lots.push(...Array.from({ length: 4 }, (_, i) => ({ id: `old-${i}`, qty: 0, isInUse: false })))
  const original = structuredClone(raw)
  const result = inspect(raw)
  expect(result).toMatchObject({ ok: false, code: 'CONVERSION_BLOCKED' })
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ path: 'materials[0].lots', code: 'UNSUPPORTED_LOT_COUNT', actual: 5, limit: 4 }))
  expect(raw).toEqual(original)
})

it('reports unsupported quantity precision at the exact source paths', () => {
  const raw = snapshot()
  raw.materials[0].stock = 0.333
  raw.materials[0].lots[0].qty = 0.333
  const result = inspect(raw)
  expect(result.details.diagnostics).toEqual(expect.arrayContaining([
    expect.objectContaining({ path: 'materials[0].stock', code: 'UNSUPPORTED_PRECISION' }),
    expect.objectContaining({ path: 'materials[0].lots[0].qty', code: 'UNSUPPORTED_PRECISION' }),
  ]))
})

it('adds lot quantities as integers, accepting 0.1 plus 0.2 with stock 0.3', () => {
  const raw = snapshot()
  raw.materials[0].stock = 0.3
  raw.materials[0].lots = [{ id: 'a', qty: 0.1, isInUse: true }, { id: 'b', qty: 0.2, isInUse: false }]
  expect(inspect(raw).ok).toBe(true)
})

it('rejects malformed source data and broken references using domain diagnostics', () => {
  const raw = snapshot()
  raw.menus[0].recipe[0].materialId = 'missing'
  expect(inspect(raw)).toMatchObject({ ok: false, code: 'INVALID_SNAPSHOT', details: { diagnostics: expect.arrayContaining([expect.objectContaining({ code: 'MISSING_MATERIAL' })]) } })
})

it('rejects source values lost by JSON serialization before domain normalization', () => {
  const raw = snapshot()
  raw.materials[0].unitCost = NaN
  expect(inspect(raw)).toMatchObject({ ok: false, code: 'INVALID_JSON_DATA', details: { diagnostics: expect.arrayContaining([expect.objectContaining({ path: 'materials[0].unitCost' })]) } })
})

it('blocks values beyond quantity or safe aggregate cost bounds', () => {
  const raw = snapshot()
  raw.materials[0].stock = 100000000
  raw.materials[0].lots[0].qty = 100000000
  expect(inspect(raw).details.diagnostics).toContainEqual(expect.objectContaining({ code: 'QUANTITY_OUT_OF_RANGE' }))
  const cost = snapshot()
  cost.materials[0].unitCost = 1e100
  expect(inspect(cost).details.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSAFE_COST_BOUND', path: 'materials[0].unitCost' }))
})

it('preserves historical totals, negative profit, timestamps and long bills as legacy data', () => {
  const raw = snapshot()
  raw.orders.push({ orderId: 'old/sale', createdAt: '2026-10-20T10:00:00+07:00', foodCost: 0.2075, ingredientCost: 0.2075,
    packagingCost: 0, grossProfit: -0.2075, items: Array.from({ length: 10 }, () => ({ name: 'old' })) })
  const result = inspect(raw)
  expect(result.ok).toBe(true)
  expect(result.value.snapshot.orders[0]).toMatchObject(raw.orders[0])
  expect(result.value.diagnostics).toContainEqual(expect.objectContaining({ code: 'HISTORICAL_UNVERIFIED', count: 1 }))
})

it('distinguishes a missing platform price from an explicit zero', () => {
  const raw = snapshot()
  delete raw.menus[0].prices.P
  const result = inspect(raw)
  expect(result.value.snapshot.menus[0].prices).not.toHaveProperty('P')
  expect(result.value.diagnostics).toContainEqual(expect.objectContaining({ code: 'MISSING_PLATFORM_PRICE', path: 'menus[0].prices.P' }))
  expect(inspect(snapshot()).value.diagnostics.some(d => d.code === 'MISSING_PLATFORM_PRICE')).toBe(false)
})

it('refuses an implicit or invalid protocol bound configuration', () => {
  expect(inspectLegacySnapshot(snapshot()).code).toBe('UNPROVEN_CONSTRAINTS')
  expect(inspectLegacySnapshot(snapshot(), { constraints: { ...constraints, maxStoredLots: 0 } }).code).toBe('UNPROVEN_CONSTRAINTS')
})

it('inspects the shipped catalog without inventing lots or changing unit costs', () => {
  const raw = { ...snapshot(), materials: structuredClone(DEFAULT_MATERIALS), menus: structuredClone(DEFAULT_MENUS), addons: structuredClone(DEFAULT_ADDONS), platforms: structuredClone(DEFAULT_PLATFORMS), categories: structuredClone(DEFAULT_CATEGORIES) }
  const result = inspectLegacySnapshot(raw, { constraints: { ...constraints, maxOptionsPerLine: DEFAULT_ADDONS.length } })
  expect(result.ok).toBe(true)
  expect(result.value.snapshot.materials.map(m => m.unitCost)).toEqual(raw.materials.map(m => m.unitCost))
})

function groupedSnapshot({ groups = 1, repeat = false, count = 3, options = 3 } = {}) {
  const raw = snapshot()
  raw.addons = Array.from({ length: options }, (_, i) => ({ id: `A${i}`, prices: { P: 1 }, recipe: [] }))
  raw.addonGroups = Array.from({ length: groups }, (_, i) => ({ id: `G${i}`, name: 'Fruit choices', minSelections: count, maxSelections: count,
    allowRepeat: repeat, pricingMode: 'included', options: raw.addons.map(a => ({ addonId: a.id })) }))
  raw.menus[0].addonGroupIds = raw.addonGroups.map(g => g.id)
  return raw
}

it('blocks a Fruit Trio shape needing three distinct selections without editing its rules', () => {
  const raw = groupedSnapshot(), before = structuredClone(raw)
  const result = inspect(raw)
  expect(result).toMatchObject({ ok: false, code: 'CONVERSION_BLOCKED' })
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ path: 'menus[0].addonGroupIds', code: 'UNSUPPORTED_OPTION_COUNT', actual: 3, limit: 2 }))
  expect(raw).toEqual(before)
})

it('adds the selectable option-record bounds across all assigned groups', () => {
  const result = inspect(groupedSnapshot({ groups: 3, count: 1, options: 1 }))
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_OPTION_COUNT', actual: 3 }))
})

it('counts repeated quantities as one option record when the group has one choice', () => {
  expect(inspect(groupedSnapshot({ repeat: true, options: 1 })).ok).toBe(true)
})

it('blocks legacy unrestricted menus when their selectable addon count exceeds the bound', () => {
  const raw = groupedSnapshot()
  delete raw.menus[0].addonGroupIds
  raw.menus[0].hasAddons = true
  const result = inspect(raw)
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ path: 'menus[0].hasAddons', code: 'UNSUPPORTED_LEGACY_OPTION_COUNT', actual: 3, limit: 2 }))
})

it('does not block disabled addons or explicit empty assigned groups', () => {
  const raw = groupedSnapshot()
  raw.menus[0].hasAddons = false
  expect(inspect(raw).ok).toBe(true)
  raw.menus[0].hasAddons = true
  raw.menus[0].addonGroupIds = []
  expect(inspect(raw).ok).toBe(true)
})

it('requires an explicit selectable-option bound instead of silently assuming two', () => {
  const incomplete = { ...constraints }
  delete incomplete.maxOptionsPerLine
  expect(inspectLegacySnapshot(snapshot(), { constraints: incomplete }).code).toBe('UNPROVEN_CONSTRAINTS')
})

it('checks the combined material set of a legacy menu and its selectable addons', () => {
  const raw = snapshot()
  raw.menus[0].hasAddons = true
  raw.materials.push(...Array.from({ length: 3 }, (_, i) => ({ ...structuredClone(raw.materials[0]), id: `M${i}` })))
  raw.addons = raw.materials.slice(1).map(m => ({ id: `A-${m.id}`, prices: { P: 1 }, recipe: [{ materialId: m.id, qty: 0.1 }] }))
  const result = inspectLegacySnapshot(raw, { constraints: { ...constraints, maxOptionsPerLine: 3, maxMaterialsPerBill: 3 } })
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ path: 'menus[0].recipe', code: 'UNSUPPORTED_MATERIAL_UNION', actual: 4, limit: 3 }))
})

it('blocks group-specific prices with unsupported precision', () => {
  const raw = snapshot()
  raw.addons = [{ id: 'A', prices: { P: 1 }, recipe: [{ materialId: 'โยเกิร์ต/1', qty: 0.1 }] }]
  raw.addonGroups = [{ id: 'G', name: 'Extra', minSelections: 0, maxSelections: 2, allowRepeat: true, pricingMode: 'extra', options: [{ addonId: 'A', prices: { P: 0.001 } }] }]
  raw.menus[0].addonGroupIds = ['G']
  const result = inspect(raw)
  expect(result.ok).toBe(false)
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_PRECISION', path: 'addonGroups[0].options[0].prices.P' }))
})

it('blocks GP values not representable by the proven basis-point rule', () => {
  const raw = snapshot()
  raw.platforms[0].gpPercent = 30.001
  expect(inspect(raw).details.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_PRECISION', path: 'platforms[0].gpPercent' }))
  raw.platforms[0].gpPercent = 100
  expect(inspect(raw).details.diagnostics).toContainEqual(expect.objectContaining({ code: 'UNSUPPORTED_GP', path: 'platforms[0].gpPercent' }))
})

it('fails closed on array properties that JSON serialization would discard', () => {
  const raw = snapshot()
  raw.orders.extra = 'silently lost'
  expect(inspect(raw).code).toBe('INVALID_JSON_DATA')
})

it('checks safe costs on depleted historical lots as well as material averages',()=>{
  const raw=snapshot();raw.materials[0].lots.push({id:'depleted',qty:0,isInUse:false,unitCost:1e100})
  const original=structuredClone(raw),result=inspect(raw)
  expect(result.ok).toBe(false)
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({code:'UNSAFE_COST_BOUND',path:'materials[0].lots[1].unitCost'}))
  expect(raw).toEqual(original)
})
it.each(['material','lot'])('honors an explicit narrower unit cost envelope for %s',kind=>{
  const raw=snapshot()
  if(kind==='material')raw.materials[0].unitCost=100000.0001
  else raw.materials[0].lots[0].unitCost=100000.0001
  const result=inspectLegacySnapshot(raw,{constraints:{...constraints,maxUnitCost:100000}})
  expect(result.ok).toBe(false)
  expect(result.details.diagnostics).toContainEqual(expect.objectContaining({code:'UNIT_COST_OUT_OF_RANGE',limit:100000}))
})
it('accepts the exact explicit cost boundary without rounding the source',()=>{
  const raw=snapshot();raw.materials[0].unitCost=100000
  const result=inspectLegacySnapshot(raw,{constraints:{...constraints,maxUnitCost:100000}})
  expect(result.ok).toBe(true);expect(result.value.snapshot.materials[0].unitCost).toBe(100000)
})
it.each([-1,Infinity,'100000',1000000])('rejects an invalid or arithmetically unsafe cost envelope %j',maxUnitCost=>{
  expect(inspectLegacySnapshot(snapshot(),{constraints:{...constraints,maxUnitCost}}).code).toBe('UNPROVEN_CONSTRAINTS')
})
