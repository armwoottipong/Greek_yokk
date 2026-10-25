import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { allocateInventory } from '../../src/domain/inventory.js'
import { ROOT, GENERATION } from './proofFixture.js'
import { installLotMap } from './setLots.js'

// Synthetic source-shaped data. No user backup contents, IDs or URL in fixtures.
export function setCatalogFixture({ lines = 1, fruit = false, choices, prepareMaterials, menuPattern = ['SIMPLE', 'FRUIT', 'BANANA', 'CRUNCH'], opId = 'SET-SALE', uid = 'cashier' } = {}) {
  const materials = Array.from({ length: 15 }, (_, i) => ({
    id: `S${i}`, revision: 1, costRank: i, deleted: false,
    inventoryType: i >= 11 && i !== 12 ? 'packaging' : 'ingredient',
    unitCost: i % 2 ? 0.045 : 0.2075, stock: 1000000,
    activeLotId: `L${i}`, lastOpId: '',
    lots: [{ id: `L${i}`, qty: 1000000, isInUse: true, receiveDay: 20000, expiryDay: 999999 }],
  }))
  const addons = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`A${i}`, {
    recipe: { [`S${i}`]: (i + 1) * 100, ...(i < 9 ? { S11: 100 } : {}) },
    pricesCents: { P: (i + 1) * 100 },
  }]))
  const menus = Object.fromEntries(['SIMPLE', 'FRUIT', 'BANANA', 'CRUNCH'].map(id => {
    const optionIds = Object.keys(addons).slice(0, id === 'FRUIT' ? 6 : 11)
    return [id, { id, revision: 1, active: true, pricesCents: { P: 6900 },
      recipe: { S12: 6000, S13: 100, S14: 100, S0: 1300, S1: 1000 },
      optionIds, min: id === 'FRUIT' ? 3 : 0, max: id === 'FRUIT' ? 3 : 11,
      optionPrices: { P: { _: 0, ...Object.fromEntries(optionIds.map(key => [key, id === 'FRUIT' ? 0 : addons[key].pricesCents.P])) } },
      choiceMaterials: Object.fromEntries(optionIds.map(key => [key, Object.keys(addons[key].recipe)])),
    }]
  }))
  for (const menu of Object.values(menus)) menu.materialIds = [...new Set([...Object.keys(menu.recipe), ...Object.values(menu.choiceMaterials).flat()])]
  for (const material of materials) {
    const terms = new Map()
    for (const [id, addon] of Object.entries(addons)) {
      const qty = addon.recipe[material.id]
      if (qty) terms.set(qty, [...(terms.get(qty) || []), id])
    }
    material.recipeIndex = { catalogRevision: 1,
      menus: Object.fromEntries(Object.values(menus).map(m => [m.id, m.recipe[material.id] || 0])),
      optionQty: [...terms.keys()][0] || 0, optionIds: [...terms.values()][0] || [],
    }
    if (terms.size > 1) throw new Error('Set proof requires one quantity term per material')
  }
  const orderLines = Array.from({ length: lines }, (_, i) => {
    const menu = menus[fruit ? 'FRUIT' : menuPattern[i % menuPattern.length]]
    const optionIds = choices || menu.optionIds.slice(0, menu.id === 'FRUIT' ? 3 : 11)
    return { menuId: menu.id, qty: 1, optionIds, catalog: structuredClone(menu), note: '',
      totalCents: menu.pricesCents.P + optionIds.reduce((n, id) => n + menu.optionPrices.P[id], 0) }
  })
  prepareMaterials?.(materials)
  return planSetCatalog({ materials, addons, menus, platforms: { P: { revision: 1, active: true, gpBasisPoints: 3000 } }, orderLines, platformId: 'P', opId, uid })
}

export function planSetCatalog({ materials, addons, menus, platforms, orderLines, platformId, opId = 'SET-SOURCE', uid = 'cashier', shopState }) {
  materials.forEach(installLotMap)
  const menuIds = Object.keys(menus), addonIds = Object.keys(addons)
  if (menuIds.length > 4 || addonIds.length > 11) throw new Error('Unsupported set catalog dimensions')
  compileVariants(menus, addonIds)
  for (const m of materials) m.recipeIndex.optionQuantities = Array.from({ length: 2048 }, (_, code) =>
    addonIds.reduce((sum, id, i) => sum + ((code & (2 ** i)) && m.recipeIndex.optionIds.includes(id) ? m.recipeIndex.optionQty : 0), 0))
  for (const m of materials) m.recipeIndex.variantQuantities = Object.fromEntries(menuIds.map(id => [id,
    m.recipeIndex.optionQuantities.map(qty => qty + (m.recipeIndex.menus[id] || 0))]))
  for (const line of orderLines) line.catalog = structuredClone(menus[line.menuId])
  const platform = platforms[platformId]
  const quantities = new Map()
  for (const line of orderLines) {
    for (const [id, qty] of Object.entries(menus[line.menuId].recipe)) quantities.set(id, (quantities.get(id) || 0) + qty * line.qty)
    for (const choice of line.optionIds) for (const [id, qty] of Object.entries(addons[choice].recipe)) quantities.set(id, (quantities.get(id) || 0) + qty * line.qty)
  }
  const included = new Set(orderLines.flatMap(l => l.catalog.materialIds))
  const touched = materials.filter(m => included.has(m.id))
  const domainMaterials = touched.map(m => ({ ...m, stock: m.stock / 100,
    lots: m.lotIds.map(id => m.lots[id]).map(l => ({ ...l, qty: l.qty / 100, expiryDate: l.expiryDay === 999999 ? null : new Date(l.expiryDay * 86400000).toISOString().slice(0, 10),
      receiveDate: new Date(l.receiveDay * 86400000).toISOString().slice(0, 10) })) }))
  const requirements = [...quantities].map(([materialId, qty]) => ({ materialId, qty: qty / 100 }))
  const kind = id => touched.find(m => m.id === id).inventoryType
  const ingredients = allocateInventory(domainMaterials, requirements.filter(r => kind(r.materialId) === 'ingredient'), { allowShortage: true })
  if (!ingredients.ok) throw new Error('Invalid set ingredient allocation')
  const allocation = allocateInventory(ingredients.materials, requirements.filter(r => kind(r.materialId) === 'packaging'), { allowShortage: true, expiredAsShortage: true })
  if (!allocation.ok) throw new Error('Invalid set packaging allocation')
  const order = { schemaVersion: 2, kind: 'sale_set', status: 'committed', opId, uid, createdAt: serverTimestamp(),
    lines: orderLines, materialIds: touched.map(m => m.id), inventory: [], approvedShortages: {},
    platformId, platformRevision: platform.revision, subtotalCents: orderLines.reduce((n, l) => n + l.totalCents, 0), shopRevision: 2,
    lineWitnessCount: Math.ceil(orderLines.length / 2),
  }
  let ingredientBalance = 0, packagingBalance = 0
  const nextMaterials = touched.map((m, i) => {
    const next = allocation.materials[i], needed = quantities.get(m.id) || 0
    const take = m.stock - Math.round(next.stock * 100), shortage = needed - take
    const ingredientCostBaht = m.inventoryType === 'ingredient' ? (needed / 100) * m.unitCost : 0
    const packagingCostCents = m.inventoryType === 'packaging' ? Math.round(((take / 100) * m.unitCost) * 100) : 0
    const lotTakes = Array.from({ length: 4 }, (_, index) => {
      const id = m.allocationIds[index]
      return id ? m.lots[id].qty - Math.round(next.lots.find(lot => lot.id === id).qty * 100) : 0
    })
    order.inventory.push({ materialId: m.id, revision: m.revision, costRank: m.costRank, needed, take, shortage, ingredientCostBaht, packagingCostCents,
      lotIds: [...m.allocationIds], lotTakes })
    order.approvedShortages[m.id] = shortage
    ingredientBalance += ingredientCostBaht; packagingBalance += packagingCostCents
    return { ...structuredClone(m), stock: Math.round(next.stock * 100), revision: m.revision + 1,
      lots: needed === 0 ? structuredClone(m.lots) : { _: structuredClone(m.lots._), ...Object.fromEntries(m.lotIds.map(id => {
        const lot = next.lots.find(l => l.id === id)
        return [id, { ...structuredClone(m.lots[id]), qty: Math.round(lot.qty * 100), isInUse: lot.isInUse }]
      })) },
      activeLotId: needed === 0 ? m.activeLotId : next.lots.find(lot => lot.isInUse)?.id || '', lastOpId: order.opId, lastOpKind: order.kind, lastOpIndex: i,
    }
  })
  order.gpCents = Math.round(order.subtotalCents * platform.gpBasisPoints / 10000); order.netCents = order.subtotalCents - order.gpCents
  order.ingredientCostCents = Math.round(ingredientBalance * 100); order.packagingCostCents = packagingBalance
  order.grossProfitCents = order.netCents - order.ingredientCostCents - order.packagingCostCents
  const shop = shopState || { status: 'active', generation: 'g1', revision: 1, lastOpId: '', catalogRevision: 1,
    catalog: { menus, platforms, menuIds, addonIds } }
  order.shopRevision = shop.revision + 1
  setOptionCodes(order, shop)
  return { shop, materials, addons, order, nextMaterials, nextShop: { ...structuredClone(shop), revision: shop.revision + 1, lastOpId: order.opId, lastOpKind: order.kind } }
}

export function compileVariants(menus, addonIds) {
  for (const m of Object.values(menus)) {
    m.optionBits = { _: 0, ...Object.fromEntries(addonIds.map((id, i) => [id, 2 ** i])) }
    m.variantPrices = Object.fromEntries(Object.entries(m.pricesCents).map(([platform, base]) => [platform, Array.from({ length: 2048 }, (_, code) => {
      const selected = addonIds.filter((id, i) => code & (2 ** i))
      if (selected.some(id => !m.optionIds.includes(id) || !Number.isInteger(m.optionPrices[platform]?.[id]))) return -1
      return base + selected.reduce((sum, id) => sum + m.optionPrices[platform][id], 0)
    })]))
  }
}

export function setOptionCodes(order, shop) {
  for (const line of order.lines) {
    line.optionCode = line.optionIds.reduce((sum, id) => sum + (shop.catalog.menus[line.menuId].optionBits[id] || 0), 0)
  }
}

export async function seedSetCatalog(env, f) {
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    await setDoc(doc(db, ROOT), f.shop)
    for (const m of f.materials) await setDoc(doc(db, `${GENERATION}/materials/${m.id}`), m)
  })
}

export function setSaleBatch(db, f, { writeTarget, omitMaterial, omitLine, omitOrder = false, omitShop = false } = {}) {
  const batch = writeTarget || writeBatch(db)
  if (!omitOrder) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}`), f.order)
  if (!omitShop) batch.set(doc(db, ROOT), f.nextShop)
  for (const m of f.nextMaterials) if (m.id !== omitMaterial) batch.set(doc(db, `${GENERATION}/materials/${m.id}`), m)
  for (let i = 0; i < f.order.lineWitnessCount; i++) if (i !== omitLine) {
    batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}/lineProofs/${i}`), { opId: f.order.opId, index: i, ...(!f.order.lineOptionQuantities?{lines:f.order.lines.slice(i*2,i*2+2)}:{}) })
  }
  return batch
}
