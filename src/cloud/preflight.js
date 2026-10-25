import { normalizeDatabase } from '../domain/database.js'
import { toScaledExact } from './conversion.js'
import { encodeLegacyId } from './paths.js'

const constraintKeys = ['maxStoredLots', 'maxQuantityQ', 'maxMaterialsPerBill', 'maxProductionInputs', 'maxGroupsPerMenu', 'maxOptionsPerLine']
const blocked = (code, diagnostics, stats) => ({ ok: false, code, details: { diagnostics, ...(stats ? { stats } : {}) } })

function inspectJson(value, path, diagnostics, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return
  if (typeof value !== 'object' || ancestors.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) {
    diagnostics.push({ path, code: 'INVALID_JSON_VALUE' })
    return
  }
  ancestors.add(value)
  if (Object.getOwnPropertySymbols(value).length) diagnostics.push({ path, code: 'INVALID_JSON_VALUE' })
  if (Array.isArray(value) && Object.keys(value).some(key => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) diagnostics.push({ path, code: 'INVALID_JSON_VALUE' })
  for (const key of Array.isArray(value) ? Array.from({ length: value.length }, (_, i) => String(i)) : Object.keys(value)) {
    const childPath = Array.isArray(value) ? `${path}[${key}]` : path ? `${path}.${key}` : key
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) diagnostics.push({ path: childPath, code: 'INVALID_JSON_VALUE' })
    else inspectJson(descriptor.value, childPath, diagnostics, ancestors)
  }
  ancestors.delete(value)
}

/** Read-only preflight, not an encoder or migration permission. Bounds must be
 * supplied explicitly from the reviewed protocol; no production defaults exist.
 * Successful inspection does not certify document sizes, Rules or live services.
 */
export function inspectLegacySnapshot(raw, { constraints } = {}) {
  if (!constraints || constraintKeys.some(key => !Number.isSafeInteger(constraints[key]) || constraints[key] <= 0)) return blocked('UNPROVEN_CONSTRAINTS', [])
  if (Object.hasOwn(constraints, 'maxUnitCost') && (typeof constraints.maxUnitCost !== 'number' || !Number.isFinite(constraints.maxUnitCost) || constraints.maxUnitCost < 0 ||
    !Number.isFinite(constraints.maxUnitCost * constraints.maxQuantityQ * constraints.maxMaterialsPerBill) ||
    constraints.maxUnitCost * constraints.maxQuantityQ * constraints.maxMaterialsPerBill > Number.MAX_SAFE_INTEGER)) return blocked('UNPROVEN_CONSTRAINTS', [])
  const diagnostics = []
  inspectJson(raw, '', diagnostics)
  if (diagnostics.length) return blocked('INVALID_JSON_DATA', diagnostics)
  const normalized = normalizeDatabase(raw, { source: 'import' })
  if (!normalized.ok) return blocked('INVALID_SNAPSHOT', normalized.errors)
  const snapshot = normalized.value
  const errors = []
  const stats = { materials: snapshot.materials.length, orders: snapshot.orders.length, maxStoredLots: 0 }
  const report = (path, code, details = {}) => errors.push({ path, code, ...details })
  const limit = (path, actual, maximum, code) => { if (actual > maximum) report(path, code, { actual, limit: maximum }) }
  function quantity(value, path) {
    const converted = toScaledExact(value, 100, path)
    if (!converted.ok) { report(path, converted.code, { value }); return null }
    if (converted.value < 0 || converted.value > constraints.maxQuantityQ) report(path, 'QUANTITY_OUT_OF_RANGE', { value, limit: constraints.maxQuantityQ / 100 })
    return converted.value
  }

  function cost(value, path) {
    const aggregate = value * constraints.maxQuantityQ * constraints.maxMaterialsPerBill
    if (!Number.isFinite(aggregate) || aggregate > Number.MAX_SAFE_INTEGER) report(path, 'UNSAFE_COST_BOUND', { value })
    if (Object.hasOwn(constraints, 'maxUnitCost') && value > constraints.maxUnitCost) report(path, 'UNIT_COST_OUT_OF_RANGE', { limit: constraints.maxUnitCost })
  }

  for (let i = 0; i < snapshot.materials.length; i++) {
    const material = snapshot.materials[i], path = `materials[${i}]`
    stats.maxStoredLots = Math.max(stats.maxStoredLots, material.lots.length)
    limit(`${path}.lots`, material.lots.length, constraints.maxStoredLots, 'UNSUPPORTED_LOT_COUNT')
    const stock = quantity(material.stock, `${path}.stock`)
    const quantities = material.lots.map((lot, index) => quantity(lot.qty, `${path}.lots[${index}].qty`))
    if (stock !== null && quantities.every(q => q !== null) && quantities.reduce((sum, q) => sum + BigInt(q), 0n) !== BigInt(stock)) report(`${path}.stock`, 'EXACT_LOT_TOTAL_CONFLICT')
    cost(material.unitCost, `${path}.unitCost`)
    material.lots.forEach((lot, index) => cost(lot.unitCost, `${path}.lots[${index}].unitCost`))
    const inputs = material.subRecipe || []
    limit(`${path}.subRecipe`, new Set(inputs.map(r => r.materialId)).size, constraints.maxProductionInputs, 'UNSUPPORTED_INPUT_COUNT')
    inputs.forEach((row, index) => quantity(row.qty, `${path}.subRecipe[${index}].qty`))
  }
  for (const field of ['materials', 'menus', 'addons', 'addonGroups', 'platforms', 'orders', 'activityLogs']) {
    snapshot[field].forEach((record, i) => {
      const key = field === 'orders' ? 'orderId' : 'id'
      try { encodeLegacyId(record[key]) } catch { report(`${field}[${i}].${key}`, 'UNSUPPORTED_DOCUMENT_ID') }
    })
  }
  for (const field of ['menus', 'addons']) snapshot[field].forEach((item, i) => {
    const path = `${field}[${i}]`, recipe = item.recipe || []
    limit(`${path}.recipe`, new Set(recipe.map(row => row.materialId)).size, constraints.maxMaterialsPerBill, 'UNSUPPORTED_RECIPE_SIZE')
    recipe.forEach((row, index) => quantity(row.qty, `${path}.recipe[${index}].qty`))
    for (const [platformId, price] of Object.entries(item.prices)) {
      const converted = toScaledExact(price, 100, `${path}.prices.${platformId}`)
      if (!converted.ok) report(`${path}.prices.${platformId}`, converted.code, { value: price })
    }
    if (field === 'menus') {
      limit(`${path}.addonGroupIds`, (item.addonGroupIds || []).length, constraints.maxGroupsPerMenu, 'UNSUPPORTED_GROUP_COUNT')
      if (item.hasAddons !== false && Array.isArray(item.addonGroupIds)) {
        // Each selected group/addon pair is a record. Repeated quantity on the
        // same pair does not create another record; different groups do.
        const selectable = item.addonGroupIds.reduce((total, id) => {
          const group = snapshot.addonGroups.find(g => g.id === id)
          const activeOptions = group.options.filter(option => snapshot.addons.some(a => a.id === option.addonId && a.isActive !== false)).length
          return total + Math.min(group.maxSelections, activeOptions)
        }, 0)
        limit(`${path}.addonGroupIds`, selectable, constraints.maxOptionsPerLine, 'UNSUPPORTED_OPTION_COUNT')
      } else if (item.hasAddons === true) {
        const selectable = snapshot.addons.filter(a => a.isActive !== false)
        limit(`${path}.hasAddons`, selectable.length, constraints.maxOptionsPerLine, 'UNSUPPORTED_LEGACY_OPTION_COUNT')
        // Legacy UI permits all active addons together. Checking each recipe
        // separately misses a single valid line whose combined reads exceed the
        // material budget; do not silently cap or remove those choices.
        const materialIds = new Set([...recipe, ...selectable.flatMap(a => a.recipe || [])].map(row => row.materialId))
        limit(`${path}.recipe`, materialIds.size, constraints.maxMaterialsPerBill, 'UNSUPPORTED_MATERIAL_UNION')
      }
      for (const platform of snapshot.platforms.filter(p => p.isActive !== false)) {
        if (!Object.hasOwn(item.prices, platform.id)) diagnostics.push({ path: `${path}.prices.${platform.id}`, code: 'MISSING_PLATFORM_PRICE' })
      }
    }
  })
  snapshot.platforms.forEach((platform, i) => {
    const path = `platforms[${i}].gpPercent`
    const converted = toScaledExact(platform.gpPercent, 100, path)
    if (!converted.ok) report(path, converted.code, { value: platform.gpPercent })
    if (platform.gpPercent >= 100) report(path, 'UNSUPPORTED_GP', { value: platform.gpPercent })
  })
  snapshot.addonGroups.forEach((group, i) => group.options.forEach((option, j) => {
    for (const [id, price] of Object.entries(option.prices || {})) {
      const path = `addonGroups[${i}].options[${j}].prices.${id}`
      const converted = toScaledExact(price, 100, path)
      if (!converted.ok) report(path, converted.code, { value: price })
    }
  }))
  if (snapshot.orders.length) diagnostics.push({ code: 'HISTORICAL_UNVERIFIED', count: snapshot.orders.length })
  diagnostics.push({ code: 'COST_ROUNDING_ORDER_CHANGED' })
  if (errors.length) return blocked('CONVERSION_BLOCKED', [...errors, ...diagnostics], stats)
  return { ok: true, value: { snapshot, diagnostics, stats } }
}
