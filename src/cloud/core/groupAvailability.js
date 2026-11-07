// Group display metadata is saved alongside the canonical catalog command.
const prefix = 'yoggie-option-availability:'

export function encodeGroupAvailability(group, platformIds, legacyPlatformIds) {
  return prefix + JSON.stringify({
    warnLowStock: group.warnLowStock === true,
    autoPauseOutOfStock: group.autoPauseOutOfStock === true,
    paused: group.options.flatMap((option, index) => option.paused ? [index] : []),
    ...(legacyPlatformIds ? {platformIds} : {}),
    unpriced: Object.fromEntries(platformIds.flatMap((platformId,platformIndex) => {
      const indices=group.options.flatMap((option,index) => option.unpricedPlatformIds?.includes(platformId) ? [index] : [])
      return indices.length ? [[platformIndex,indices]] : []
    }))
  })
}

export function groupAvailability(data, group) {
  const description = data.display?.groups?.[group.id]?.description
  if (!description?.startsWith(prefix)) return {}
  try {
    const settings = JSON.parse(description.slice(prefix.length))
    const order = settings.platformIds || data.display.platformAvailabilityOrder || data.shop.catalog.platformIds
    const channelIds = data.shop.catalog.platformIds
    const findPriceSource = id => {
      const visited = new Set()
      while (id && !visited.has(id)) {
        const index = order.indexOf(id)
        if (index >= 0) return index
        visited.add(id)
        id = data.display.platforms?.[id]?.sourcePlatformId
      }
      return -1
    }
    const sources = channelIds.map(findPriceSource)
    return {
      warnLowStock: settings.warnLowStock === true,
      autoPauseOutOfStock: settings.autoPauseOutOfStock === true,
      pausedIds: new Set((settings.paused || []).map(index => group.optionIds[index])),
      unpricedById: Object.fromEntries(group.optionIds.map((id,index) => [id, channelIds.filter((_,i) => {
        const unset=settings.unpriced?.[sources[i]]
        return Array.isArray(unset)&&unset.includes(index)
      })]))
    }
  } catch {
    return {}
  }
}
