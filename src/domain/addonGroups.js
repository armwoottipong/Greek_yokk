export const selectionQty = addon => Number(addon.selectionQty ?? 1)
export const selectionPrice = (addon, platformId) => Number(addon.prices?.[platformId] || 0) * selectionQty(addon)
export const selectionKey = selections => JSON.stringify(selections.map(a => [
  a.groupId || '', a.id, selectionQty(a), Object.entries(a.prices || {}).sort(([a], [b]) => a.localeCompare(b)), a.recipe || []
]).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))))

export function optionStockMaterialId(addon, materialMap) {
  const recipe = addon.recipe || []
  if (recipe.length === 1) return recipe[0].materialId
  const ingredients = recipe.filter(row => materialMap[row.materialId] && materialMap[row.materialId].inventoryType !== 'packaging')
  return ingredients.length === 1 && recipe.every(row =>
    row === ingredients[0] || materialMap[row.materialId]?.inventoryType === 'packaging')
    ? ingredients[0].materialId : null
}

export function optionImageSource(addon = {}, materialMap = {}) {
  const material = materialMap[optionStockMaterialId(addon, materialMap)]
  return material
    ? { kind: 'materials', entityId: material.id, image: material.image, emoji: material.emoji }
    : { kind: 'addons', entityId: addon.isDraft ? undefined : addon.id, image: addon.image, emoji: addon.emoji }
}

export function duplicateNewStockOption(options, existingAddons, newAddons, materialMap) {
  if (!newAddons.length || !Array.isArray(options)) return ''
  const optionIds = new Set(options.map(option => option?.addonId))
  const used = new Set(existingAddons.filter(addon => optionIds.has(addon.id))
    .map(addon => optionStockMaterialId(addon, materialMap)).filter(Boolean))
  for (const addon of newAddons) {
    if (!optionIds.has(addon.id)) continue
    const materialId = optionStockMaterialId(addon, materialMap)
    if (!materialId) continue
    if (used.has(materialId)) return 'วัตถุดิบนี้อยู่ในกลุ่มแล้ว กรุณาเลือกวัตถุดิบอื่น'
    used.add(materialId)
  }
  return ''
}

export function groupError(group, addons) {
  if (!group || typeof group !== 'object' || Array.isArray(group)) return 'ข้อมูลกลุ่มตัวเลือกไม่ถูกต้อง'
  if (typeof group.name !== 'string' || !group.name.trim()) return 'กรุณาระบุชื่อกลุ่มตัวเลือก'
  if (!Number.isSafeInteger(group.minSelections) || !Number.isSafeInteger(group.maxSelections) || group.minSelections < 0 || group.maxSelections < 1 || group.minSelections > group.maxSelections) return 'กำหนดจำนวนขั้นต่ำและสูงสุดเป็นจำนวนเต็ม โดยสูงสุดต้องไม่น้อยกว่าขั้นต่ำ'
  if (typeof group.allowRepeat !== 'boolean' || !['included', 'extra'].includes(group.pricingMode)) return 'กติกากลุ่มตัวเลือกไม่ถูกต้อง'
  if (!Array.isArray(group.options) || !group.options.length) return 'เลือกตัวเลือกเสริมอย่างน้อย 1 รายการ'
  const ids = new Set()
  for (const option of group.options) {
    if (!option || !addons.some(a => a.id === option.addonId)) return 'ไม่พบตัวเลือกเสริมที่เลือก กรุณาเลือกรายการใหม่'
    if (ids.has(option.addonId)) return 'มีตัวเลือกเสริมซ้ำในกลุ่ม'
    ids.add(option.addonId)
    if (option.prices !== undefined && (!option.prices || typeof option.prices !== 'object' || Array.isArray(option.prices) || Object.values(option.prices).some(p => typeof p !== 'number' || !Number.isFinite(p) || p < 0))) return 'ราคาบวกเพิ่มต้องเป็นตัวเลขตั้งแต่ 0'
    if (option.unpricedPlatformIds !== undefined && (!Array.isArray(option.unpricedPlatformIds) || option.unpricedPlatformIds.some(id => typeof id !== 'string'))) return 'สถานะราคาของช่องทางขายไม่ถูกต้อง'
  }
  if (!group.allowRepeat && group.minSelections > group.options.length) return 'จำนวนขั้นต่ำเกินจำนวนชนิดที่มีให้เลือก'
  return ''
}

export function supportsCloudGroupPricing(groups) {
  const small = group => Number(group.maxSelections ?? group.max) <= 3
  return groups.length !== 2 || groups.every(small) ||
    groups.some(small) && groups.some(group => group.pricingMode === 'included')
}

export function cloudGroupBindingIssue(groups) {
  if (groups.length > 2) return 'เมนูหนึ่งใช้ได้สูงสุด 2 กลุ่มตัวเลือก'
  if (groups.some(group => !group || group.isActive === false)) return 'เลือกได้เฉพาะกลุ่มที่เปิดใช้งาน'
  return supportsCloudGroupPricing(groups) ? '' : 'ถ้ากลุ่มหนึ่งเลือกได้เกิน 3 รายการ อีกกลุ่มต้องเลือกได้ไม่เกิน 3 และต้องมีกลุ่มที่รวมในราคา'
}

export function menuGroups(menu, groups) {
  if (menu?.hasAddons === false) return []
  return (menu?.addonGroupIds || []).map(id => groups.find(g => g.id === id)).filter(Boolean)
}

export function optionPrices(group, option, addon, platformIds = []) {
  const prices = { ...addon.prices, ...option.prices }
  const configured = group.pricingMode === 'included'
    ? Object.fromEntries([...new Set([...Object.keys(prices), ...platformIds])].map(id => [id, 0])) : prices
  for (const id of option.unpricedPlatformIds || []) delete configured[id]
  return configured
}

export function optionAvailability(group, option, addon, materials, quantity = 1) {
  if (group.isActive === false || option?.paused || addon?.isActive === false || !addon) return 'paused'
  let low = false
  for (const { materialId, qty } of addon.recipe || []) {
    const material = materials.find(row => row.id === materialId)
    const stock = material && !material.isDeleted && !material.isArchived ? Number(material.stock) : 0
    if (group.autoPauseOutOfStock && stock < qty * quantity) return 'out'
    if (group.warnLowStock && stock <= Number(material?.minAlert ?? 0)) low = true
  }
  return low ? 'low' : 'ready'
}

export const optionAvailabilityLabel = {
  paused: 'พักขาย',
  out: 'ของหมด · พักอัตโนมัติ',
  low: 'ใกล้หมด',
  ready: 'พร้อมจำหน่าย'
}

// Resolve IDs against the catalog: callers cannot supply their own prices or recipes.
export function resolveSelections(menu, selected, groups, addons, materials, quantity = 1) {
  const fail = message => ({ ok: false, code: 'INVALID_ADDON_SELECTION', message })
  if (!Array.isArray(selected)) return fail('ตัวเลือกไม่ถูกต้อง กรุณาเลือกใหม่')
  if (!Array.isArray(menu.addonGroupIds)) return selected.some(a => a.groupId)
    ? fail('กลุ่มตัวเลือกของเมนูเปลี่ยนแล้ว กรุณานำรายการออกจากตะกร้าและเลือกใหม่')
    : { ok: true, selections: selected }
  const assigned = menuGroups(menu, groups)
  if (assigned.some(group => group.isActive === false)) return fail('กลุ่มตัวเลือกนี้พักใช้งาน กรุณาตรวจการตั้งค่าเมนู')
  if (menu.hasAddons !== false && assigned.length !== menu.addonGroupIds.length) return fail('ไม่พบกลุ่มตัวเลือก กรุณาตรวจการตั้งค่าเมนู')
  const selections = [], seen = new Set(), counts = new Map()
  for (const choice of selected) {
    const group = assigned.find(g => g.id === choice.groupId)
    const option = group?.options.find(o => o.addonId === choice.id)
    const addon = addons.find(a => a.id === choice.id && a.isActive !== false)
    if (!group || !option || !addon || option.paused) return fail('ตัวเลือกนี้พักขายในกลุ่ม กรุณาเลือกใหม่')
    const qty = selectionQty(choice), key = `${group.id}:${addon.id}`
    if (!Number.isSafeInteger(qty) || qty < 1 || (!group.allowRepeat && qty !== 1) || seen.has(key)) return fail('จำนวนตัวเลือกไม่ถูกต้องหรือมีชนิดซ้ำ กรุณาเลือกใหม่')
    if (materials && optionAvailability(group, option, addon, materials, qty * quantity) === 'out') return fail('สต็อกของตัวเลือกไม่พอ กรุณาลดจำนวนหรือเลือกใหม่')
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
