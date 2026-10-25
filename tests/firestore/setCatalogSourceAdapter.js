import { normalizeDatabase } from '../../src/domain/database.js'
import { optionPrices } from '../../src/domain/addonGroups.js'
import { aggregateRequirements, getEffectiveRequirements } from '../../src/domain/inventory.js'
import { toScaledExact } from '../../src/cloud/conversion.js'
import { encodeLegacyId } from '../../src/cloud/paths.js'
import { planSetCatalog } from './setCatalogFixture.js'

// TEST ONLY: compile a copy of a source catalog into the isolated set experiment.
// Not a migration encoder: no historical orders, logs, URL, credentials or SDK
// initialization. Unsupported source shapes stop explicitly without dropping data.
export function sourceSetFixture(raw, { fruit = false, allOptions = false, lines = 1, platformIndex = 0, repeatProjection = false } = {}) {
  const result = normalizeDatabase(raw, { source: 'import' })
  if (!result.ok) throw new Error('Invalid source snapshot')
  const d = result.value, key = encodeLegacyId
  const scaled = value => {
    const r = toScaledExact(value, 100)
    if (!r.ok) throw new Error('Unsupported source precision')
    return r.value
  }
  // Validate the original rows: normalization/domain aggregation can round
  // quantities, which would hide an unsupported precision before compilation.
  for (const records of [raw.menus,raw.addons]) for (const entry of Array.isArray(records) ? records : []) {
    for (const row of Array.isArray(entry?.recipe) ? entry.recipe : []) scaled(row.qty)
    if (entry?.recipe === undefined && entry?.materialId && raw.schemaVersion !== 4) scaled(entry.amountUsed)
  }
  const recipe = rows => Object.fromEntries(aggregateRequirements(rows).map(r => [key(r.materialId), scaled(r.qty)]))
  const prices = values => Object.fromEntries(Object.entries(values).map(([id, price]) => [key(id), scaled(price)]))
  const day = value => value ? Math.floor(Date.parse(`${value}T00:00:00Z`) / 86400000) : 999999
  const activeAddons = d.addons.filter(a => a.isActive !== false)
  const addons = Object.fromEntries(activeAddons.map(a => [key(a.id), { recipe: recipe(a.recipe), pricesCents: prices(a.prices) }]))
  const platforms = Object.fromEntries(d.platforms.map(p => [key(p.id), { revision: 1, active: p.isActive !== false, gpBasisPoints: scaled(p.gpPercent) }]))
  const platformId = Object.keys(platforms).filter(id => platforms[id].active)[platformIndex]
  if (!platformId) throw new Error('No active source platform')
  const menus = {}
  for (const source of d.menus) {
    const groups = source.hasAddons === false ? [] : source.addonGroupIds?.map(id => d.addonGroups.find(g => g.id === id))
    if (groups && (groups.length > 1 || (groups.some(g => g.allowRepeat) && !repeatProjection))) throw new Error('Unsupported repeating/multiple-group source profile')
    const group = groups?.[0]
    const selected = source.hasAddons === false || groups?.length === 0 ? [] : group
      ? activeAddons.filter(a => group.options.some(o => o.addonId === a.id)) : source.hasAddons ? activeAddons : []
    const optionIds = selected.map(a => key(a.id))
    if (optionIds.length > 11) throw new Error('Unsupported source option count')
    const choicePrices = Object.fromEntries(selected.map(a => [key(a.id), prices(group
      ? optionPrices(group, group.options.find(o => o.addonId === a.id), a) : a.prices)]))
    const optionPriceMap = Object.fromEntries(Object.keys(platforms).map(platform => [platform, { _: 0,
      ...Object.fromEntries(optionIds.filter(id => Object.hasOwn(choicePrices[id], platform)).map(id => [id, choicePrices[id][platform]])) }]))
    const base = recipe(getEffectiveRequirements(source,[],1,d.materials))
    const choiceMaterials = Object.fromEntries(selected.map(a => [key(a.id), Object.keys(addons[key(a.id)].recipe)]))
    menus[key(source.id)] = { id: key(source.id), revision: 1, active: source.isActive !== false, recipe: base, priceMode:group?'override':'addon',
      pricesCents: prices(source.prices), optionIds, optionPrices: optionPriceMap, choiceMaterials,
      min: group?.minSelections || 0, max: group?.maxSelections || optionIds.length,
      materialIds: [...new Set([...Object.keys(base), ...Object.values(choiceMaterials).flat()])],
    }
  }
  const materials = d.materials.map((m, i) => {
    if (m.lots.length !== 1) throw new Error('Source experiment supports exactly one stored lot')
    const terms = new Map()
    for (const [id, a] of Object.entries(addons)) {
      const qty = a.recipe[key(m.id)]
      if (qty) terms.set(qty, [...(terms.get(qty) || []), id])
    }
    if (terms.size > 1) throw new Error('Unsupported multiple source recipe quantity terms')
    return { id: key(m.id), legacyId: m.id, revision: 1, costRank: i, deleted: m.isDeleted,
      inventoryType: m.inventoryType, unitCost: m.unitCost, stock: scaled(m.stock), lastOpId: '',
      packSize:Number(m.packSize)>0 ? Number(m.packSize) : 1,packCostCents:scaled(m.packCost),
      activeLotId: m.lots[0].isInUse ? key(m.lots[0].id) : '',
      lots: m.lots.map(l => ({ ...structuredClone(l), id: key(l.id), qty: scaled(l.qty), receiveDay: day(l.receiveDate), expiryDay: day(l.expiryDate) })),
      recipeIndex: { catalogRevision: 1, menus: Object.fromEntries(Object.values(menus).map(menu => [menu.id, menu.recipe[key(m.id)] || 0])),
        optionQty: [...terms.keys()][0] || 0, optionIds: [...terms.values()][0] || [] },
    }
  })
  const candidates = Object.values(menus).filter(m => m.active && (fruit ? m.min === 3 && m.max === 3 : allOptions ? m.max === 11 : true))
  if (!candidates.length) throw new Error('Requested source profile not found')
  const orderLines = Array.from({ length: lines }, (_, i) => {
    const menu = candidates[i % candidates.length], optionIds = menu.optionIds.slice(0, fruit ? 3 : allOptions ? 11 : menu.min)
    return { menuId: menu.id, qty: 1, optionIds, catalog: structuredClone(menu), note: `Local proof ${i + 1}`,
      totalCents: menu.pricesCents[platformId] + optionIds.reduce((n, id) => n + menu.optionPrices[platformId][id], 0) }
  })
  return planSetCatalog({ materials, addons, menus, platforms, orderLines, platformId })
}
