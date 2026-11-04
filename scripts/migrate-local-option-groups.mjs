import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { createEntityId } from '../src/domain/ids.js'

async function main([input, output, ...extra]) {
  if (!input || extra.length) throw new Error('Usage: node scripts/migrate-local-option-groups.mjs input.json [new-output.json]')
  const raw = JSON.parse(await readFile(input, 'utf8'))
  if (!Array.isArray(raw?.menus) || !Array.isArray(raw?.addons)) {
    throw new Error('Expected a Local backup containing menus and addons arrays')
  }
  const vite = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), configFile: false,
    server: { middlewareMode: true, watch: null }, appType: 'custom', logLevel: 'silent'
  })
  try {
    const { normalizeDatabase } = await vite.ssrLoadModule('/src/domain/database.js')
    const parsed = normalizeDatabase(raw)
    if (!parsed.ok) throw new Error(JSON.stringify(parsed.errors))
    const candidate = parsed.value
    const menus = candidate.menus.filter(menu => menu.addonGroupIds === undefined)
    const options = candidate.addons.filter(addon => addon.isActive !== false).map(addon => ({ addonId: addon.id }))
    const usingOptions = menus.filter(menu => menu.hasAddons && options.length)
    if (usingOptions.length) {
      const id = createEntityId('GROUP', candidate.addonGroups.map(group => group.id))
      candidate.addonGroups.push({
        id, name: 'ตัวเลือกจากเมนูเดิม', minSelections: 0, maxSelections: options.length,
        allowRepeat: false, pricingMode: 'extra', options
      })
      for (const menu of usingOptions) menu.addonGroupIds = [id]
    }
    for (const menu of menus) menu.addonGroupIds ??= []
    const checked = normalizeDatabase(candidate)
    if (!checked.ok) throw new Error(JSON.stringify(checked.errors))
    if (output) await writeFile(output, JSON.stringify(checked.value, null, 2), { flag: 'wx' })
    console.log(JSON.stringify({
      legacyMenus: menus.length, menusWithOptions: usingOptions.length,
      options: options.length, historyOrders: checked.value.orders.length,
      output: output || null
    }))
  } finally {
    await vite.close()
  }
}

main(process.argv.slice(2)).catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
