import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { doc, getDocFromServer, writeBatch } from 'firebase/firestore'
import { compileCoreImport } from '../../scripts/core-import.js'
import { catalogAddons, catalogGroups } from '../../src/cloud/core/catalogPresentation.js'
import { createInventoryModel } from '../../src/cloud/core/inventoryModel.js'
import { createCoreTransport } from '../../src/cloud/core/transport.js'
import { coreSource } from '../fixtures/coreSource.js'
import { createRulesTest, PROJECT_ID } from './helpers.js'

const shopId = 'greek-yogg'
const generation = 'g_trial_shared_addon_rename'
const root = `shops/${shopId}`
const displayPath = `${root}/generations/${generation}/display/catalog`
const storage = new Map()
let env

beforeAll(async () => {
  env = await createRulesTest({ rules: readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8') })
  vi.stubGlobal('sessionStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value)
  })
})

afterAll(async () => {
  await env?.cleanup()
  vi.unstubAllGlobals()
})

function sharedOptionSource() {
  const source = coreSource()
  source.platforms = Array.from({ length: 4 }, (_, index) => ({
    id: `P${index}`, name: `Platform ${index}`, gpPercent: 0, isActive: true
  }))
  const prices = { P0: 12.25, P1: 0, P2: 16, P3: 21.5 }
  source.materials[11].inventoryType = 'packaging'
  for (const menu of source.menus) menu.prices = { P0: 69, P1: 75, P2: 85, P3: 95 }
  source.addons = [{
    id: 'A', name: 'ผลไม้เดิม', emoji: '🍓', prices,
    recipe: [{ materialId: 'M0', qty: 2.5 }, { materialId: 'M11', qty: 1 }]
  }]
  source.addonGroups = [
    {
      id: 'G1', name: 'กลุ่มแรก', minSelections: 0, maxSelections: 1,
      allowRepeat: false, pricingMode: 'extra', warnLowStock: true,
      options: [{ addonId: 'A', prices: { P0: 5.75, P1: 0, P2: 7 }, unpricedPlatformIds: ['P3'] }]
    },
    {
      id: 'G2', name: 'กลุ่มที่สอง', minSelections: 0, maxSelections: 1,
      allowRepeat: false, pricingMode: 'extra', autoPauseOutOfStock: true,
      options: [{ addonId: 'A', paused: true, prices: { P0: 2, P1: 3, P2: 4, P3: 5 } }]
    }
  ]
  Object.assign(source.menus[0], { hasAddons: true, addonGroupIds: ['G1', 'G2'] })
  Object.assign(source.menus[1], { hasAddons: true, addonGroupIds: ['G2'] })
  return source
}

function account(uid) {
  const db = env.authenticatedContext(uid, {
    email: `${uid}@example.com`, email_verified: true, firebase: { sign_in_provider: 'google.com' }
  }).firestore()
  const context = { projectId: PROJECT_ID, shopId, generation, uid, deviceId: uid, online: true, ready: true, role: 'manager' }
  const api = createCoreTransport({ db, getContext: () => context })
  const load = async () => ({ ...await api.snapshot(), display: (await getDocFromServer(doc(db, displayPath))).data() })
  return { api, load }
}

it('renames a shared option through group save while preserving its recipes, prices and links under production rules', async () => {
  await env.clearFirestore()
  const imported = compileCoreImport(sharedOptionSource(), { shopId, generation, sourceSha256: 'a'.repeat(64) })
  imported.shop.allowedEmails = { 'writer@example.com': true, 'reader@example.com': true }
  imported.shop.userRoles = { 'writer@example.com': 'manager', 'reader@example.com': 'manager' }
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore()
    const batch = writeBatch(db)
    batch.set(doc(db, root), imported.shop)
    for (const row of imported.documents) batch.set(doc(db, row.path), row.data)
    await batch.commit()
  })

  const writer = account('writer')
  const reader = account('reader')
  let data = await writer.load()
  const commands = []
  const model = createInventoryModel({
    getData: () => data,
    loadServer: writer.load,
    execute: async command => {
      commands.push(command.kind)
      const result = await writer.api.commit(command)
      data = await writer.load()
      model.update(data)
      return { ok: true, value: { opId: command.opId, kind: command.kind, result } }
    },
    isReady: () => true,
    isBlocked: () => false,
    storageKey: 'shared-addon-rename'
  })

  try {
    const before = await reader.load()
    const addon = model.addons.find(row => row.name === 'ผลไม้เดิม')
    const group = model.addonGroups.find(row => row.name === 'กลุ่มแรก')
    const otherGroup = model.addonGroups.find(row => row.name === 'กลุ่มที่สอง')
    expect(group.options.map(option => option.addonId)).toEqual([addon.id])
    expect(otherGroup.options.map(option => option.addonId)).toEqual([addon.id])

    const renamed = 'ผลไม้ชื่อใหม่'
    const result = await model.saveAddonGroup({
      ...group,
      updatedAddons: [{ ...addon, name: renamed }],
      expectedCatalogRevision: model.catalogRevision
    })
    expect(result, result.message).toMatchObject({ ok: true })
    expect(commands).toEqual(['addon', 'group'])

    const after = await reader.load()
    const oldCatalog = before.shop.catalog
    const catalog = after.shop.catalog
    expect(catalog.addonIds).toEqual(oldCatalog.addonIds)
    expect(catalog.addons[addon.id]).toMatchObject({
      name: renamed, recipe: oldCatalog.addons[addon.id].recipe, pricesCents: oldCatalog.addons[addon.id].pricesCents
    })
    expect(catalogAddons(after)).toMatchObject([{ ...addon, name: renamed }])
    expect(catalog.addonPrices).toEqual(oldCatalog.addonPrices)
    expect(catalog.menus).toEqual(oldCatalog.menus)
    expect(catalog.groups[group.id]).toEqual({ ...oldCatalog.groups[group.id], revision: oldCatalog.groups[group.id].revision + 1 })
    expect(catalog.groups[otherGroup.id]).toEqual(oldCatalog.groups[otherGroup.id])
    expect(catalogGroups(after)).toEqual(catalogGroups(before))
    expect(after.materials).toEqual(before.materials)
  } finally {
    model.close()
  }
})
