// Historical prices come from the confirmed line snapshot, never today's catalog.
export function projectReceiptItems(receipt, data) {
 return (receipt.lines || []).map(line => {
  const choices = line.groupSelections
   ? Object.entries(line.groupSelections).flatMap(([groupId, options]) => Object.entries(options).filter(([id, qty]) => id !== '_' && qty > 0).map(([id, selectionQty]) => ({id, groupId, selectionQty})))
   : [...new Set(line.optionIds || [])].map(id => ({id, selectionQty: line.optionQuantities?.[id] || 1}))
  return {
   menuId: line.menuId,
   menuName: line.catalog?.name || `${data.display?.menus?.[line.menuId]?.name || line.menuId} (ชื่อปัจจุบัน)`,
   qty: line.qty, note: line.note || '', totalPrice: line.totalCents / 100,
   selectedAddons: choices.map(choice => {
    const group = choice.groupId ? line.groups?.[choice.groupId] : line.group?.id ? line.group : null
    const prices = group?.optionPrices?.[receipt.platformId] || (line.catalog?.priceMode === 'override' ? line.catalog.optionPrices?.[receipt.platformId] : null)
    const cents = group?.pricingMode === 'included' ? 0 : prices?.[choice.id]
    return {...choice, name: data.display?.addons?.[choice.id]?.name || choice.id, groupName: group?.name, price: Number.isSafeInteger(cents) ? cents / 100 : null}
   })
  }
 })
}
