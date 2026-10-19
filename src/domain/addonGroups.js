export const selectionQty = addon => Number(addon.selectionQty ?? 1)
export const selectionPrice = (addon, platformId) => Number(addon.prices?.[platformId] || 0) * selectionQty(addon)
export const selectionKey = selections => JSON.stringify(selections.map(a => [
  a.groupId || '', a.id, selectionQty(a), Object.entries(a.prices || {}).sort(([a], [b]) => a.localeCompare(b)), a.recipe || []
]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))

export function groupError(group, addons) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return 'ข้อมูลกลุ่มตัวเลือกไม่ถูกต้อง'
  if (typeof group.name !== 'string' || !group.name.trim()) return 'กรุณาระบุชื่อกลุ่มตัวเลือก'
  if (!Number.isSafeInteger(group.minSelections) || !Number.isSafeInteger(group.maxSelections) || group.minSelections < 0 || group.maxSelections < 1 || group.minSelections > group.maxSelections) return 'กำหนดจำนวนขั้นต่ำและสูงสุดเป็นจำนวนเต็ม โดยสูงสุดต้องไม่น้อยกว่าขั้นต่ำ'
  if (typeof group.allowRepeat !== 'boolean' || !['included', 'extra'].includes(group.pricingMode)) return 'กติกากลุ่มตัวเลือกไม่ถูกต้อง'
  if (!Array.isArray(group.options) || !group.options.length) return 'เลือก Add-on อย่างน้อย 1 รายการ'
  const ids = new Set()
  for (const option of group.options) {
    if (!option || !addons.some(a => a.id === option.addonId)) return 'ไม่พบ Add-on ที่เลือก กรุณาเลือกรายการใหม่'
    if (ids.has(option.addonId)) return 'มี Add-on ซ้ำในกลุ่ม'
    ids.add(option.addonId)
    if (option.prices !== undefined && (!option.prices || typeof option.prices !== 'object' || Array.isArray(option.prices) || Object.values(option.prices).some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0))) return 'ราคาบวกเพิ่มต้องเป็นตัวเลขตั้งแต่ 0'
  }
  if (!group.allowRepeat && group.minSelections > group.options.length) return 'จำนวนขั้นต่ำเกินจำนวนชนิดที่มีให้เลือก'
  return ''
}

export function menuGroups(menu, groups) {
  if (menu?.hasAddons === false) return []
  return (menu?.addonGroupIds || []).map(id => groups.find(g => g.id === id)).filter(Boolean)
}

export function optionPrices(group, option, addon) {
  const prices = { ...addon.prices, ...option.prices }
  return group.pricingMode === 'included' ? Object.fromEntries(Object.keys(prices).map(id => [id, 0])) : prices
}

// Resolve IDs against the catalog: callers cannot supply their own prices or recipes.
export function resolveSelections(menu, selected, groups, addons) {
  const fail = message => ({ ok: false, code: 'INVALID_ADDON_SELECTION', message })
  if (!Array.isArray(selected)) return fail('ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่')
  if (!Array.isArray(menu.addonGroupIds)) return selected.some(a => a.groupId)
    ? fail('กลุ่มตัวเลือกของเมนูเปลี่ยนแล้ว กรุณานำรายการออกจากตะกร้าและเลือกใหม่')
    : { ok: true, selections: selected }
  const assigned = menuGroups(menu, groups)
  if (menu.hasAddons !== false && assigned.length !== menu.addonGroupIds.length) return fail('ไม่พบกลุ่มตัวเลือก กรุณาตรวจการตั้งค่าเมนู')
  const selections = [], seen = new Set(), counts = new Map()
  for (const choice of selected) {
    const group = assigned.find(g => g.id === choice.groupId)
    const option = group?.options.find(o => o.addonId === choice.id)
    const addon = addons.find(a => a.id === choice.id && a.isActive !== false)
    if (!group || !option || !addon) return fail('ตัวเลือกนี้ใช้กับเมนูไม่ได้แล้ว กรุณาเลือกใหม่')
    const qty = selectionQty(choice), key = `${group.id}:${addon.id}`
    if (!Number.isSafeInteger(qty) || qty < 1 || (!group.allowRepeat && qty !== 1) || seen.has(key)) return fail('จำนวนตัวเลือกไม่ถูกต้องหรือมีชนิดซ้ำ กรุณาเลือกใหม่')
    seen.add(key)
    counts.set(group.id, (counts.get(group.id) || 0) + qty)
    selections.push({ ...addon, groupId: group.id, groupName: group.name, selectionQty: qty, prices: optionPrices(group, option, addon) })
  }
  for (const group of assigned) {
    const count = counts.get(group.id) || 0
    if (count < group.minSelections || count > group.maxSelections) return fail(`${group.name}: เลือก ${group.minSelections === group.maxSelections ? `ให้ครบ ${group.maxSelections}` : `${group.minSelections}–${group.maxSelections}`} ${group.allowRepeat ? 'ที่' : 'ชนิด'}`)
  }
  return { ok: true, selections }
}
