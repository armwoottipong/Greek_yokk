import { doc, setDoc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { recomputeFromDomain } from './proofDomainAdapter.js'

export const SHOP = 'proof-shop'
export const ROOT = `shops/${SHOP}`
export const GENERATION = `${ROOT}/generations/g1`
export const IDS = ['YOGURT', 'FRUIT', 'TOPPING', 'CUP']
export const OP_ID = 'SALE-001'
const clone = value => structuredClone(value)

function material(id, quantities, unitCostCents, inventoryType = 'ingredient') {
  return {
    id, revision: 1, unitCost: unitCostCents / 100, inventoryType, deleted: false,
    stock: quantities.reduce((s, n) => s + n, 0), lastOpId: '', activeLotId: `${id}-0`,
    lots: quantities.map((qty, i) => ({ id: `${id}-${i}`, qty, expiryDay: 999999, receiveDay: 20000 + i, isInUse: i === 0 }))
  }
}

export function proofFixture() {
  // Quantity is in hundredths of a unit; money in satang. Synthetic costs are
  // simple in this fixture; separate tests cover fractional/weighted costs.
  const materials = [material('YOGURT', [3000, 7000], 5), material('FRUIT', [5000, 0], 10),
    material('TOPPING', [500, 0], 20), material('CUP', [500, 0], 200, 'packaging')]
  const groups = price => ({
    extra: { min: 0, max: 3, repeat: true, included: false,
      options: { nuts: { priceCents: price, pricesCents: {PLAT01:price,PLAT02:price+200}, recipe: { TOPPING: 200 } } } },
    included: { min: 0, max: 1, repeat: false, included: true,
      options: { fruit: { priceCents: 999, pricesCents:{PLAT01:999,PLAT02:1299}, recipe: { FRUIT: 500 } } } }
  })
  const menus = [
    { id: 'BOWL', revision: 1, active: true, priceCents: 10000, pricesCents:{PLAT01:10000,PLAT02:13000},
      recipe: { YOGURT: 6000, FRUIT: 1000, CUP: 100 }, groups: groups(700) },
    { id: 'SMALL', revision: 1, active: true, priceCents: 8500, pricesCents:{PLAT01:8500,PLAT02:11000},
      recipe: { YOGURT: 4000, FRUIT: 2000, CUP: 100 }, groups: groups(300) }
  ]
  for (const menu of menus) menu.groupIds = Object.keys(menu.groups)
  const lines = [
    { menuId: 'BOWL', menuRevision: 1, qty: 1, options: [
      { groupId: 'extra', addonId: 'nuts', qty: 2 }, { groupId: 'included', addonId: 'fruit', qty: 1 }
    ], totalCents: 11400 },
    { menuId: 'SMALL', menuRevision: 1, qty: 1, options: [
      { groupId: 'extra', addonId: 'nuts', qty: 1 }
    ], totalCents: 8800 }
  ]
  for (let i = 0; i < lines.length; i++) {
    lines[i].note = ''
    lines[i].catalog = clone(menus[i])
    for (const choice of lines[i].options) {
      const group = menus[i].groups[choice.groupId]
      choice.definition = clone(group.options[choice.addonId])
      choice.unitPriceCents = group.included ? 0 : choice.definition.priceCents
    }
  }
  const order = {
    schemaVersion: 1, opId: OP_ID, uid: 'cashier', kind: 'sale', status: 'committed',
    createdAt: serverTimestamp(), lines, materialIds: [...IDS], inventory: [],
    packaging: { CUP: { adjustment: 100, reason: 'separate_bag', note: '' } },
    platformId: 'PLAT01', platformRevision: 1, subtotalCents: 20200,
    gpCents: 6060, netCents: 14140, ingredientCostCents: 970,
    packagingCostCents: 600, grossProfitCents: 12570,
    approvedShortages: { YOGURT: 0, FRUIT: 0, TOPPING: 100, CUP: 0 }
  }
  const records = {
    [ROOT]: { status: 'active', generation: 'g1', revision: 1, lastOpId: '' },
    [`${GENERATION}/platforms/PLAT01`]: { revision: 1, gpBasisPoints: 3000, active: true },
    [`${GENERATION}/platforms/PLAT02`]: { revision: 1, gpBasisPoints: 3000, active: true },
    [`${GENERATION}/orders/HISTORICAL`]: { status: 'committed', imported: true, subtotalCents: 4000 }
  }
  for (const m of materials) records[`${GENERATION}/materials/${m.id}`] = m
  for (const m of menus) records[`${GENERATION}/menus/${m.id}`] = m
  return recomputeFromDomain({ records, materials, order,
    nextShop: { status: 'active', generation: 'g1', revision: 2, lastOpId: OP_ID } })
}

export async function seedProof(env, fixture) {
  const menus = {}, platforms = {}
  for (const [path, value] of Object.entries(fixture.records)) {
    if (path.startsWith(`${GENERATION}/menus/`)) menus[path.split('/').at(-1)] = value
    if (path.startsWith(`${GENERATION}/platforms/`)) platforms[path.split('/').at(-1)] = value
  }
  fixture.records[`${GENERATION}/catalog/current`] = { menus, platforms }
  fixture.records[ROOT].catalog = structuredClone({menus,platforms})
  fixture.nextShop.lastOpKind ??= 'sale'
  fixture.nextShop.catalog = structuredClone({menus,platforms})
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore()
    await Promise.all(Object.entries(fixture.records).map(([path, data]) => setDoc(doc(db, path), data)))
  })
}

export function saleBatch(db, f, { writeTarget, omitMaterial, omitLine, omitWitness, alterLineProof = value => value, omitFourFlag = false, omitLines = false, omitOrder = false, omitShop = false } = {}) {
  const batch = writeTarget || writeBatch(db)
  if (!omitOrder) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}`), f.order)
  for (let i = 0; i < f.order.lineWitnessCount; i++) {
    if (!omitLines) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}/lineProofs/${i}`), alterLineProof({
      opId: f.order.opId, uid: f.order.uid, index: i,
      lines: f.order.lines.slice(i*f.order.lineBlockSize,(i+1)*f.order.lineBlockSize).filter((_line,j) => i*f.order.lineBlockSize+j !== omitLine),
      ...(f.order.lines.length > 4 && f.order.multiIds.length ? { multiNeeds: Object.fromEntries(f.order.multiIds.map(id => [id,
        f.order.lines.slice(0,(i+1)*f.order.lineBlockSize).reduce((sum,line) => sum +
          ((line.catalog.recipe[id] || 0) + line.options.reduce((n,c) => n + (c.definition.recipe[id] || 0) * c.qty,0)) * line.qty,0)])) } : {}),
    }, i))
  }
  let ingredientBalance = 0, packagingBalance = 0
  for (let i = 0; i < f.order.witnessCount; i++) {
    for (const row of f.order.inventory.slice(i*f.order.inventoryBlockSize,(i+1)*f.order.inventoryBlockSize)) {
      ingredientBalance += row.ingredientCostBaht
      packagingBalance += row.packagingCostCents
    }
    if (i !== omitWitness) batch.set(doc(db, `${GENERATION}/orders/${f.order.opId}/inventoryProofs/${i}`), {
      opId: f.order.opId, uid: f.order.uid, index: i, ingredientBalance, packagingBalance,
      ...(!omitFourFlag && f.order.inventoryBlockSize===1 && f.order.inventory[i]?.four ? {four:true}: {})
    })
  }
  if (!omitShop) batch.set(doc(db, ROOT), f.nextShop)
  for (const material of f.nextMaterials) {
    if (material.id !== omitMaterial) batch.set(doc(db, `${GENERATION}/materials/${material.id}`), material)
  }
  return batch
}
