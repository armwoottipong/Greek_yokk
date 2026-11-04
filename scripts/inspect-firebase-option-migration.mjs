import { readFile } from 'node:fs/promises'
import { verifyBusinessBackup } from '../src/cloud/core/businessBackup.js'
import { decodeRehearsalValue } from './backup-rehearsal.js'

async function main([input, ...extra]) {
  if (!input || extra.length) throw new Error('Usage: node scripts/inspect-firebase-option-migration.mjs firebase-backup.json')
  const backup = await readFile(input, 'utf8')
  await verifyBusinessBackup(backup)
  const { payload } = JSON.parse(backup)
  const root = decodeRehearsalValue(payload.root)
  const catalog = root.catalog
  const profiles = new Map()
  const blockers = []
  for (const [menuId, menu] of Object.entries(catalog.menus)) {
    if (menu.groupId || menu.groupIds?.length || !menu.optionIds.length) continue
    const optionIds = menu.optionIds.filter(id => catalog.addons[id] && catalog.addons[id].active !== false)
    const max = Math.min(menu.max, optionIds.length)
    if (menu.min > max) {
      blockers.push({ menuId, reason: 'ขั้นต่ำเกินจำนวนตัวเลือกที่เปิดขาย' })
      continue
    }
    if (max === 0) {
      profiles.set(`disabled:${menuId}`, { menuIds: [menuId], action: 'clear-options' })
      continue
    }
    const prices = Object.fromEntries(catalog.platformIds.map(platform => [
      platform,
      Object.fromEntries(optionIds.map(id => [
        id, (menu.priceMode === 'addon' ? catalog.addonPrices : menu.optionPrices)[platform]?.[id]
      ]))
    ]))
    if (Object.values(prices).some(row => Object.values(row).some(value => !Number.isSafeInteger(value) || value < 0))) {
      blockers.push({ menuId, reason: 'ราคาตัวเลือกไม่ครบหรือไม่ถูกต้อง' })
      continue
    }
    const profile = { optionIds, min: menu.min, max, pricesCents: prices }
    const key = JSON.stringify(profile)
    if (!profiles.has(key)) profiles.set(key, { ...profile, menuIds: [], action: 'create-group' })
    profiles.get(key).menuIds.push(menuId)
  }
  const groups = [...profiles.values()].filter(profile => profile.action === 'create-group')
  if ((catalog.groupIds?.length || 0) + groups.length > 64) {
    blockers.push({ reason: 'จำนวนกลุ่มหลังย้ายเกิน 64 กลุ่ม' })
  }
  console.log(JSON.stringify({ revision: root.revision, profiles: [...profiles.values()], blockers }, null, 2))
  if (blockers.length) process.exitCode = 2
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
