// Group display metadata is saved alongside the canonical catalog command.
const prefix = 'yoggie-option-availability:'

export function encodeGroupAvailability(group, platformIds) {
  return prefix + JSON.stringify({
    warnLowStock: group.warnLowStock === true,
    autoPauseOutOfStock: group.autoPauseOutOfStock === true,
    paused: group.options.flatMap((option, index) => option.paused ? [index] : []),
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
    return {
      warnLowStock: settings.warnLowStock === true,
      autoPauseOutOfStock: settings.autoPauseOutOfStock === true,
      pausedIds: new Set((settings.paused || []).map(index => group.optionIds[index])),
      unpricedById: Object.fromEntries(group.optionIds.map((id,index) => [id, Object.entries(settings.unpriced || {}).filter(([platformIndex,indices]) => data.shop.catalog.platformIds[platformIndex] && Array.isArray(indices) && indices.includes(index)).map(([platformIndex]) => data.shop.catalog.platformIds[platformIndex])]))
    }
  } catch {
    return {}
  }
}
