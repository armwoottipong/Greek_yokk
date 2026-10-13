export const MATERIAL_KIND_OPTIONS = [
  { id: 'produced', label: 'วัตถุดิบที่มีการผลิต' },
  { id: 'normal', label: 'วัตถุดิบปกติ' },
  { id: 'packaging', label: 'บรรจุภัณฑ์' }
]
export const MATERIAL_ROLE_OPTIONS = [
  { id: 'production', label: 'ใช้ในการผลิต' },
  { id: 'addon', label: 'ใช้ใน Add-on' },
  { id: 'menu', label: 'ใช้ในเมนู' }
]
export function getMaterialKind(material) {
  return material?.inventoryType === 'packaging' ? 'packaging' : material?.hasSubRecipe ? 'produced' : 'normal'
}
export function getMaterialKindLabel(material) {
  return MATERIAL_KIND_OPTIONS.find(option => option.id === getMaterialKind(material)).label
}
export function buildMaterialUsage({ materials = [], menus = [], addons = [] }) {
  const materialMap = new Map(materials.map(m => [m.id, m]))
  const index = new Map(materials.map(m => [m.id, { production: [], addon: [], menu: [] }]))
  const addSource = (source, role, recipe) => {
    if (source.isDeleted || source.isArchived) return
    const quantities = new Map()
    for (const row of recipe || []) {
      const qty = Number(row.qty)
      if (!materialMap.has(row.materialId) || !Number.isFinite(qty) || qty <= 0) continue
      quantities.set(row.materialId, (quantities.get(row.materialId) || 0) + qty)
    }
    for (const [id, qty] of quantities) {
      index.get(id)[role].push({ sourceId: source.id, sourceName: source.name || '', qty, unit: materialMap.get(id).unit || '' })
    }
  }
  for (const m of materials) if (getMaterialKind(m) === 'produced') addSource(m, 'production', m.subRecipe)
  for (const a of addons) addSource(a, 'addon', a.recipe)
  for (const m of menus) addSource(m, 'menu', m.recipe)
  return index
}
export function matchesMaterialFilter(material, usage, { kind = 'all', role = 'all' } = {}) {
  return (kind === 'all' || getMaterialKind(material) === kind) &&
    (role === 'all' || Boolean(usage?.[role]?.length))
}
