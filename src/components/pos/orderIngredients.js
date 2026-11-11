import { ingredientRequirementsForCart } from '@/domain/inventory'

export function lineIngredients(item, materials) {
  try {
    const perBowl = ingredientRequirementsForCart([{ ...item, qty: 1 }], materials)
    const byBowl = new Map(perBowl.map(row => [row.materialId, row.qty]))
    return ingredientRequirementsForCart([item], materials).map(({ materialId, qty }) => {
      const { name, unit } = materials.find(row => row.id === materialId)
      return { materialId, name: name || materialId, unit, qty: byBowl.get(materialId) || 0, total: item.qty > 1 ? qty : null }
    })
  } catch {
    return null
  }
}
