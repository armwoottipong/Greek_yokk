import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'

export const SHOP = 'proof-shop'
export const ROOT = `shops/${SHOP}`
export const GENERATION = `${ROOT}/generations/g1`
export const IDS = ['YOGURT', 'FRUIT', 'TOPPING', 'CUP']
export const OP_ID = 'SALE-001'
const clone = value => structuredClone(value)

function material(id, quantities, unitCostCents, inventoryType = 'ingredient') {
  return {
    id, revision: 1, unitCostCents, inventoryType, deleted: false,
    stock: quantities.reduce((s, n) => s + n, 0), lastOpId: '',
    lots: quantities.map((qty, i) => ({ id: `${id}-${i}`, qty, expiryDay: 999999, priority: i }))
  }
}

export function proofFixture() {
  // Quantity is in hundredths of a unit; money in satang. Synthetic costs are
  // integral per unit for this proof; production precision is not certified.
  const materials = [material('YOGURT', [3000, 7000], 5), material('FRUIT', [5000, 0], 10),
    material('TOPPING', [500, 0], 20), material('CUP', [500, 0], 200, 'packaging')]
  const groups = price => ({
    extra: { min: 0, max: 3, repeat: true, included: false,
      options: { nuts: { priceCents: price, recipe: { TOPPING: 200 } } } },
    included: { min: 0, max: 1, repeat: false, included: true,
      options: { fruit: { priceCents: 999, recipe: { FRUIT: 500 } } } }
  })
  const menus = [
    { id: 'BOWL', revision: 1, active: true, priceCents: 10000,
      recipe: { YOGURT: 6000, FRUIT: 1000, CUP: 100 }, groups: groups(700) },
    { id: 'SMALL', revision: 1, active: true, priceCents: 8500,
      recipe: { YOGURT: 4000, FRUIT: 2000, CUP: 100 }, groups: groups(300) }
  ]
  const lines = [
    { menuId: 'BOWL', menuRevision: 1, qty: 1, options: [
      { groupId: 'extra', addonId: 'nuts', qty: 2 }, { groupId: 'included', addonId: 'fruit', qty: 1 }
    ], totalCents: 11400 },
    { menuId: 'SMALL', menuRevision: 1, qty: 1, options: [
      { groupId: 'extra', addonId: 'nuts', qty: 1 }
    ], totalCents: 8800 }
  ]
  for (let i = 0; i < lines.length; i++) {
    lines[i].catalog = clone(menus[i])
    for (const choice of lines[i].options) {
      const group = menus[i].groups[choice.groupId]
      choice.definition = clone(group.options[choice.addonId])
      choice.unitPriceCents = group.included ? 0 : choice.definition.priceCents
    }
  }
  const needed = [10000, 3500, 600, 300]
  const inventory = materials.map((m, i) => {
    const take0 = Math.min(m.lots[0].qty, needed[i])
    const take1 = Math.min(m.lots[1].qty, needed[i] - take0)
    return { materialId: m.id, revision: m.revision, needed: needed[i], take0, take1,
      shortage: needed[i] - take0 - take1,
      rawIngredientCost: m.inventoryType === 'ingredient' ? needed[i] * m.unitCostCents : 0,
      rawPackagingCost: m.inventoryType === 'packaging' ? (take0 + take1) * m.unitCostCents : 0 }
  })
  const order = {
    schemaVersion: 1, opId: OP_ID, uid: 'cashier', kind: 'sale', status: 'committed',
    createdAt: serverTimestamp(), lines, materialIds: [...IDS], inventory,
    packaging: { materialId: 'CUP', adjustment: 100, reason: 'separate_bag', note: '' },
    platformId: 'PLAT01', platformRevision: 1, subtotalCents: 20200,
    gpCents: 6060, netCents: 14140, ingredientCostCents: 970,
    packagingCostCents: 600, grossProfitCents: 12570,
    approvedShortages: { YOGURT: 0, FRUIT: 0, TOPPING: 100, CUP: 0 }
  }
  const nextMaterials = materials.map((m, i) => ({ ...clone(m), revision: 2,
    stock: m.stock - inventory[i].take0 - inventory[i].take1, lastOpId: OP_ID,
    lots: m.lots.map((l, j) => ({ ...l, qty: l.qty - inventory[i][`take${j}`] })) }))
  const records = {
    [ROOT]: { status: 'active', generation: 'g1', revision: 1, lastOpId: '' },
    [`${ROOT}/members/owner`]: { role: 'owner', active: true },
    [`${ROOT}/members/cashier`]: { role: 'cashier', active: true },
    [`${GENERATION}/platforms/PLAT01`]: { revision: 1, gpBasisPoints: 3000, active: true },
    [`${GENERATION}/orders/HISTORICAL`]: { status: 'committed', imported: true, subtotalCents: 4000 }
  }
  for (const m of materials) records[`${GENERATION}/materials/${m.id}`] = m
  for (const m of menus) records[`${GENERATION}/menus/${m.id}`] = m
  return { records, materials, nextMaterials, order,
    nextShop: { status: 'active', generation: 'g1', revision: 2, lastOpId: OP_ID } }
}

export async function seedProof(env, fixture) {
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await Promise.all(Object.entries(fixture.records).map(([path, data]) => setDoc(doc(db, path), data)))
  })
}

export function saleBatch(db, f, { omitMaterial, omitLine, omitLines = false, omitOrder = false, omitShop = false } = {}) {
  const batch = writeBatch(db)
  if (!omitOrder) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}`), f.order)
  for (let i = 0; i < f.order.lines.length; i++) {
    if (!omitLines && i !== omitLine) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}/lines/${i}`), {
      opId: f.order.opId, uid: f.order.uid, index: i, line: f.order.lines[i]
    })
  }
  if (!omitShop) batch.set(doc(db, ROOT), f.nextShop)
  for (const material of f.nextMaterials) {
    if (material.id !== omitMaterial) batch.set(doc(db, `${GENERATION}/materials/${material.id}`), material)
  }
  return batch
}
