import { allocateInventory, ingredientRequirementsForCart } from '../../src/domain/inventory.js'
import { buildPackagePlan, packageRequirements, finalizePackagePlan } from '../../src/domain/packagePlan.js'
import { GENERATION } from './proofFixture.js'
import { netAfterGp } from '../../src/domain/pricing.js'

const dayString = n => n === 999999 ? null : new Date(n * 86400000).toISOString().slice(0, 10)
const recipe = source => Object.entries(source).map(([materialId, qty]) => ({ materialId, qty: qty / 100 }))
const cents = n => Math.round(n * 100)

// Build the expected proof transaction with the existing business algorithms,
// not a second copy of the Security Rules allocation/rounding implementation.
export function recomputeFromDomain(fixture) {
  fixture.order.multiIds = fixture.materials.filter(m => m.lots.length > 2).map(m => m.id)
  fixture.materials.forEach((m,i) => { m.costRank ??= i })
  for (const line of fixture.order.lines) {
    line.totalCents = (line.catalog.pricesCents[fixture.order.platformId] + line.options.reduce((n,c) => n + c.unitPriceCents * c.qty,0)) * line.qty
  }
  fixture.order.subtotalCents = fixture.order.lines.reduce((n,l) => n + l.totalCents,0)
  const platform = fixture.records[`${GENERATION}/platforms/${fixture.order.platformId}`]
  fixture.order.netCents = cents(netAfterGp(fixture.order.subtotalCents / 100,platform.gpBasisPoints / 100))
  fixture.order.gpCents = fixture.order.subtotalCents - fixture.order.netCents
  const materials = fixture.materials.map(m => ({ ...m, stock: m.stock / 100,
    unitCost: m.unitCost, lots: m.lots.map(l => ({ ...l, qty: l.qty / 100,
      expiryDate: dayString(l.expiryDay), receiveDate: dayString(l.receiveDay) })) }))
  const cart = fixture.order.lines.map(l => ({ qty: l.qty,
    menu: { id: l.menuId, hasPackage: true, recipe: recipe(l.catalog.recipe) },
    selectedAddons: l.options.map(c => ({ id: c.addonId, selectionQty: c.qty,
      recipe: recipe(c.definition.recipe) })) }))
  const ingredientRequirements = ingredientRequirementsForCart(cart, materials)
  const ingredient = allocateInventory(materials, ingredientRequirements, { allowShortage: true })
  if (!ingredient.ok) throw new Error(`Domain fixture rejected: ${JSON.stringify(ingredient.issues)}`)
  const packages = buildPackagePlan(cart, materials, Object.entries(fixture.order.packaging).map(([materialId, adjustment]) => ({ materialId,
    deltaQty: adjustment.adjustment / 100, reason: adjustment.reason, note: adjustment.note })))
  if (!packages.ok) throw new Error(`Package fixture rejected: ${JSON.stringify(packages.issues)}`)
  const packageAllocation = allocateInventory(ingredient.materials, packageRequirements(packages.items), {
    allowShortage: true, expiredAsShortage: true
  })
  if (!packageAllocation.ok) throw new Error('Package allocation fixture rejected')
  const requirements = new Map([...ingredientRequirements, ...packageRequirements(packages.items)].map(r => [r.materialId, r.qty]))
  const allocations = [...ingredient.allocations, ...packageAllocation.allocations]
  const shortages = [...ingredient.shortages, ...packageAllocation.shortages]
  fixture.order.inventory = fixture.materials.map(m => {
    const needed = Math.round((requirements.get(m.id) || 0) * 100)
    const take = lot => Math.round(allocations.filter(r => r.materialId === m.id && r.lotId === lot.id).reduce((n, r) => n + r.qty, 0) * 100)
    const take0 = take(m.lots[0]), take1 = take(m.lots[1])
    return { materialId: m.id, revision: m.revision, costRank: m.costRank, needed,
      lot0Id: m.lots[0].id, lot1Id: m.lots[1].id, take0, take1,
      shortage: Math.round(shortages.filter(r => r.materialId === m.id).reduce((n, r) => n + r.qty, 0) * 100),
      ingredientCostBaht: m.inventoryType === 'ingredient' ? (needed / 100) * m.unitCost : 0,
      packagingCostCents: m.inventoryType === 'packaging' ? cents(allocations.filter(a => a.materialId === m.id).reduce((sum, a) => sum + a.qty, 0) * m.unitCost) : 0 }
  })
  fixture.nextMaterials = fixture.materials.map((m, i) => {
    const next = packageAllocation.materials[i]
    return { ...structuredClone(m), revision: m.revision + 1, lastOpId: fixture.order.opId, lastOpKind: 'sale', lastOpIndex: i,
      stock: Math.round(next.stock * 100), activeLotId: next.lots.find(l => l.isInUse)?.id || '',
      lots: m.lots.map(l => {
        const committed = next.lots.find(row => row.id === l.id)
        return { ...l, qty: Math.round(committed.qty * 100), isInUse: committed.isInUse }
      }) }
  })
  for (const m of fixture.materials) fixture.records[`${GENERATION}/materials/${m.id}`] = m
  fixture.order.approvedShortages = Object.fromEntries(fixture.order.inventory.map(r => [r.materialId, r.shortage]))
  fixture.order.inventoryBlockSize = fixture.order.lines.length > 4 && fixture.order.lines.some(l=>l.options.length) ? 1 : fixture.order.lines.some(l=>l.options.length) || Object.keys(fixture.order.packaging).length ? 2 : 4
  fixture.order.witnessCount = Math.ceil(fixture.order.inventory.length / fixture.order.inventoryBlockSize)
  fixture.order.lineBlockSize = fixture.order.lines.some(l => l.options.length) ? 1 : 2
  fixture.order.lineWitnessCount = Math.ceil(fixture.order.lines.length / fixture.order.lineBlockSize)
  fixture.order.shopRevision = fixture.nextShop.revision
  fixture.order.ingredientCostCents = cents([...ingredientRequirements].sort((a,b) => materials.find(m => m.id === a.materialId).costRank - materials.find(m => m.id === b.materialId).costRank).reduce((n, r) => n + r.qty * materials.find(m => m.id === r.materialId).unitCost, 0))
  fixture.order.packagingCostCents = cents(finalizePackagePlan(packages.items, packageAllocation).reduce((n, r) => n + r.fulfilledCost, 0))
  fixture.order.grossProfitCents = fixture.order.netCents - fixture.order.ingredientCostCents - fixture.order.packagingCostCents
  return fixture
}
