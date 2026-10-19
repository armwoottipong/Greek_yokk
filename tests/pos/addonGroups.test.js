import { describe, it, expect } from 'vitest'
import { createTestStore, material } from '../helpers/createStore'
import { normalizeDatabase } from '../../src/domain/database'
import { loadDatabase } from '../../src/services/localDatabase'
import { gasHarness } from '../helpers/gasHarness'

function setup() {
  const s = createTestStore()
  s.materials = [material('FRUIT', 1000)]
  s.addons = ['A', 'B', 'C', 'D'].map(id => ({ id, name: id, isActive: true, prices: { PLAT01: 15, PLAT02: 25 }, recipe: [{ materialId: 'FRUIT', qty: 10 }] }))
  s.addonGroups = [
    { id: 'FREE', name: 'เลือกผลไม้', minSelections: 3, maxSelections: 3, allowRepeat: false, pricingMode: 'included', options: s.addons.map(a => ({ addonId: a.id })) },
    { id: 'EXTRA', name: 'เพิ่มพิเศษ', minSelections: 0, maxSelections: 2, allowRepeat: true, pricingMode: 'extra', options: [{ addonId: 'A', prices: { PLAT01: 20, PLAT02: 30 } }] }
  ]
  s.menus = [{ id: 'M', name: 'Trio', prices: { PLAT01: 99, PLAT02: 149 }, recipe: [], hasPackage: false, hasAddons: true, addonGroupIds: ['FREE', 'EXTRA'] }]
  return s
}
const choose = (s, groupId, ids) => ids.map(id => ({ ...s.addons.find(a => a.id === id), groupId }))

describe('menu option groups', () => {
  it('keeps optional groups through canonical persistence and migrates old databases', () => {
    const s = setup()
    expect(s.persistLocal().ok).toBe(true)
    const loaded = loadDatabase(localStorage)
    expect(loaded.value.addonGroups).toHaveLength(2)
    expect(loaded.value.menus[0].addonGroupIds).toEqual(['FREE', 'EXTRA'])
    expect(normalizeDatabase({}).value.addonGroups).toEqual([])
  })
  it('rejects below/above limits, repeated kinds and unassigned options before changing cart', () => {
    const s = setup(), m = s.menus[0]
    for (const choices of [[], choose(s, 'FREE', ['A', 'B']), choose(s, 'FREE', ['A', 'B', 'C', 'D']), choose(s, 'FREE', ['A', 'A', 'B']), [...choose(s, 'FREE', ['A', 'B', 'C']), ...choose(s, 'EXTRA', ['B'])]]) {
      expect(s.addToCart(m, choices)).toBe(false)
      expect(s.cart).toHaveLength(0)
    }
  })
  it('resolves trusted free and group prices, consumes both recipes and keeps receipt snapshots', () => {
    const s = setup()
    const selected = [...choose(s, 'FREE', ['A', 'B', 'C']), { ...choose(s, 'EXTRA', ['A'])[0], selectionQty: 2, prices: { PLAT01: 0 } }]
    expect(s.addToCart(s.menus[0], selected, 2)).toBe(true)
    expect(s.cartSummary.subtotal).toBe(278)
    const order = s.checkout()
    expect(order.subtotal).toBe(278)
    expect(s.materials[0].stock).toBe(900)
    expect(order.items[0].selectedAddons[0]).toMatchObject({ groupId: 'FREE', groupName: 'เลือกผลไม้', price: 0 })
    expect(order.items[0].selectedAddons[3]).toMatchObject({ groupId: 'EXTRA', selectionQty: 2, price: 20 })
  })
  it('keeps free options free and refreshes extra group prices on platform change', () => {
    const s = setup()
    s.addToCart(s.menus[0], [...choose(s, 'FREE', ['A', 'B', 'C']), ...choose(s, 'EXTRA', ['A'])])
    s.setPlatform('PLAT02')
    expect(s.cartSummary.subtotal).toBe(179)
  })
  it('does not merge different group identities or quantities', () => {
    const s = setup(), free = choose(s, 'FREE', ['A', 'B', 'C'])
    s.addToCart(s.menus[0], [...free, ...choose(s, 'EXTRA', ['A'])])
    s.addToCart(s.menus[0], [...free, { ...choose(s, 'EXTRA', ['A'])[0], selectionQty: 2 }])
    expect(s.cart).toHaveLength(2)
  })
  it('blocks checkout when assigned choices become invalid', () => {
    const s = setup()
    s.addToCart(s.menus[0], choose(s, 'FREE', ['A', 'B', 'C']))
    s.addonGroups[0].options = [{ addonId: 'D' }]
    expect(s.prepareCheckout()).toMatchObject({ ok: false, code: 'INVALID_ADDON_SELECTION' })
  })
  it('rejects invalid group limits and missing references on import', () => {
    const s = setup(), raw = s.databaseSnapshot()
    raw.addonGroups[0].minSelections = 4
    expect(normalizeDatabase(raw).ok).toBe(false)
    raw.addonGroups[0].minSelections = 3
    raw.addonGroups[0].options[0].addonId = 'missing'
    expect(normalizeDatabase(raw).ok).toBe(false)
  })
  it('round trips optional groups through the existing Sheets snapshot contract', () => {
    const s = setup(), h = gasHarness(), snapshot = s.exportDatabase()
    expect(h.post('syncAll', { snapshot }, 'GROUP-ROUNDTRIP').status).toBe('success')
    expect(h.get({ action: 'getSnapshot' }).data.snapshot.addonGroups).toEqual(snapshot.addonGroups)
  })
  it('saves reusable groups and prevents deleting groups and options still in use', () => {
    const s = setup()
    expect(s.saveAddonGroup({ ...s.addonGroups[0], id: undefined, name: 'another' }).ok).toBe(true)
    expect(s.addonGroups).toHaveLength(3)
    expect(s.deleteAddonGroup('FREE').ok).toBe(false)
    expect(s.deleteAddon('A').ok).toBe(false)
    expect(s.addons).toHaveLength(4)
    const id = s.addonGroups[2].id
    expect(s.deleteAddonGroup(id).ok).toBe(true)
    expect(s.addonGroups).toHaveLength(2)
  })
  it('supports optional groups and explicitly empty menu options without falling back to all addons', () => {
    const s = setup()
    s.menus[0].addonGroupIds = ['EXTRA']
    expect(s.addToCart(s.menus[0])).toBe(true)
    s.clearCart(); s.menus[0].addonGroupIds = []
    expect(s.addToCart(s.menus[0], choose(s, 'EXTRA', ['A']))).toBe(false)
    expect(s.addToCart(s.menus[0])).toBe(true)
  })
  it.each([-1, 0, 1.5, Infinity])('rejects invalid repeated quantity %s', selectionQty => {
    const s = setup()
    expect(s.addToCart(s.menus[0], [...choose(s, 'FREE', ['A', 'B', 'C']), { ...choose(s, 'EXTRA', ['A'])[0], selectionQty }])).toBe(false)
  })
  it('does not lose free pricing when channel prices change after selection', () => {
    const s = setup()
    s.addToCart(s.menus[0], choose(s, 'FREE', ['A', 'B', 'C']))
    s.addons.forEach(a => { a.prices.PLAT02 = 999 })
    s.setPlatform('PLAT02')
    expect(s.cartSummary.subtotal).toBe(149)
  })
  it('rejects stale grouped choices after a menu switches back to legacy options', () => {
    const s = setup()
    s.addToCart(s.menus[0], choose(s, 'FREE', ['A', 'B', 'C']))
    delete s.menus[0].addonGroupIds
    expect(s.prepareCheckout()).toMatchObject({ ok: false, code: 'INVALID_ADDON_SELECTION' })
  })
  it('merges equivalent group choices after channel prices have been refreshed', () => {
    const s = setup(), choices = choose(s, 'FREE', ['A', 'B', 'C'])
    s.addToCart(s.menus[0], [...choices, ...choose(s, 'EXTRA', ['A'])])
    s.addons[0].prices.PLAT02 = 99
    s.addonGroups[1].options[0].prices.PLAT02 = 40
    s.setPlatform('PLAT02')
    s.addToCart(s.menus[0], [...choices, ...choose(s, 'EXTRA', ['A'])])
    expect(s.cart).toHaveLength(1)
    expect(s.cart[0].qty).toBe(2)
  })
  it('consumes repeated addon packaging and preserves the sold group in historical receipts', () => {
    const s = setup()
    s.materials.push(material('CUP', 100, { inventoryType: 'packaging', unit: 'pcs' }))
    s.addons[0].recipe.push({ materialId: 'CUP', qty: 1 })
    s.addToCart(s.menus[0], [...choose(s, 'FREE', ['A', 'B', 'C']), { ...choose(s, 'EXTRA', ['A'])[0], selectionQty: 2 }], 2)
    const order = s.checkout(), before = JSON.stringify(order)
    expect(s.materials.find(m => m.id === 'CUP').stock).toBe(94)
    expect(order.packagePlan[0].requestedQty).toBe(6)
    s.clearCart(); s.menus[0].addonGroupIds = []
    expect(s.deleteAddonGroup('FREE').ok).toBe(true)
    s.addons[0].name = 'renamed'; s.addons[0].prices.PLAT01 = 1000
    expect(JSON.stringify(s.orders[0])).toBe(before)
  })
})
