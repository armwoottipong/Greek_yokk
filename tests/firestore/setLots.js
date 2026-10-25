// Canonical map used only by the isolated Rules experiment. Original insertion
// order/metadata remain available; allocation order may change without losing IDs.
export function installLotMap(material) {
  if (!Array.isArray(material.lots)) return material
  material.lotIds = material.lots.map(lot => lot.id)
  material.lots = Object.fromEntries(material.lots.map((lot, ordinal) => [lot.id, { ...lot, ordinal }]))
  material.allocationIds = sortedAllocationIds(material)
  if (material.allocationIds.length > 4) throw new Error('Unsupported live-lot count')
  material.lots._ = { id: '_', qty: 0, isInUse: false, expiryDay: 999999, receiveDay: 999999, ordinal: 999999 }
  material.slotIds = material.allocationIds.concat(Array(4 - material.allocationIds.length).fill('_'))
  return material
}

export function sortedAllocationIds(material) {
  return material.lotIds.filter(id => material.lots[id].qty > 0 || material.lots[id].isInUse).sort((a, b) => {
    const x = material.lots[a], y = material.lots[b]
    return Number(y.isInUse) - Number(x.isInUse) || x.expiryDay - y.expiryDay || x.receiveDay - y.receiveDay || x.ordinal - y.ordinal
  })
}

export function firstLot(material) { return material.lots[material.lotIds[0]] }
