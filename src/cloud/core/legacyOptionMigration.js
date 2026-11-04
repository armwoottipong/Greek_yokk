export function planLegacyOptionMigration(data) {
  const catalog = data.shop.catalog
  const profiles = new Map()
  const blockers = []
  for (const menu of Object.values(catalog.menus)) {
    if (!menu.active || menu.groupId || menu.groupIds?.length || !menu.optionIds?.length) continue
    const optionIds = menu.optionIds.filter(id => catalog.addons[id]?.active !== false && catalog.addons[id])
    const min = menu.min
    const max = Math.min(menu.max, optionIds.length)
    if (min > max) {
      blockers.push(menu.id)
      continue
    }
    const optionPrices = Object.fromEntries(catalog.platformIds.map(platform => [
      platform, { _: 0, ...Object.fromEntries(optionIds.map(id => [
        id, (menu.priceMode === 'addon' ? catalog.addonPrices : menu.optionPrices)?.[platform]?.[id]
      ])) }
    ]))
    if (Object.values(optionPrices).some(row => Object.values(row).some(price => !Number.isSafeInteger(price) || price < 0))) {
      blockers.push(menu.id)
      continue
    }
    const key = max ? JSON.stringify([optionIds, min, max, optionPrices]) : 'disabled'
    if (!profiles.has(key)) profiles.set(key, { optionIds, min, max, optionPrices, menus: [] })
    profiles.get(key).menus.push(menu.id)
  }
  return { profiles: [...profiles.values()], blockers }
}
