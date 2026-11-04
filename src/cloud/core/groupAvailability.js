// Group display metadata is saved alongside the canonical catalog command.
const prefix = 'yoggie-option-availability:'

export function encodeGroupAvailability(group) {
  return prefix + JSON.stringify({
    warnLowStock: group.warnLowStock === true,
    autoPauseOutOfStock: group.autoPauseOutOfStock === true,
    paused: group.options.flatMap((option, index) => option.paused ? [index] : [])
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
      pausedIds: new Set((settings.paused || []).map(index => group.optionIds[index]))
    }
  } catch {
    return {}
  }
}
