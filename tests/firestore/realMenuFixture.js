import { DEFAULT_MENUS, DEFAULT_MATERIALS, DEFAULT_PLATFORMS } from '../../src/data/initialData.js'
import { inferInventoryType } from '../../src/domain/database.js'
import { proofFixture, GENERATION } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'

export function realMenuFixture(menuIds = ['MENU03','MENU04']) {
  const f = proofFixture()
  for (const platform of DEFAULT_PLATFORMS) f.records[`${GENERATION}/platforms/${platform.id}`] = {revision:1,gpBasisPoints:platform.gpPercent*100,active:platform.isActive}
  const sourceMenus = menuIds.map(id => DEFAULT_MENUS.find(m => m.id === id))
  const ids = [...new Set(sourceMenus.flatMap(m => m.recipe.map(r => r.materialId)))]
  f.materials = ids.map(id => {
    const source = DEFAULT_MATERIALS.find(m => m.id === id)
    const stock = Math.round(source.stock * 100)
    const first = Math.min(stock,100)
    return { id, revision: 1, unitCost: source.unitCost, inventoryType: source.inventoryType || inferInventoryType(source),
      deleted: false, stock, lastOpId: '', activeLotId: `${id}-0`,
      lots: [first,stock-first].map((qty,i) => ({ id: `${id}-${i}`, qty, expiryDay: 999999, receiveDay: 20000+i, isInUse: i === 0 })) }
  })
  f.order.materialIds = ids
  f.order.packaging = {}
  f.order.lines = sourceMenus.map(m => {
    const catalog = { id: m.id, revision: 1, active: true, priceCents: Math.round(m.prices.PLAT01*100), pricesCents:Object.fromEntries(Object.entries(m.prices).map(([id,p])=>[id,Math.round(p*100)])),
      recipe: Object.fromEntries(m.recipe.map(r => [r.materialId,Math.round(r.qty*100)])), groupIds: [], groups: {} }
    f.records[`${GENERATION}/menus/${m.id}`] = catalog
    return { menuId: m.id, menuRevision: 1, qty: 1, options: [], note: '', catalog: structuredClone(catalog), totalCents: catalog.priceCents }
  })
  return recomputeFromDomain(f)
}
