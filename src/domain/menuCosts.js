import { getEffectiveRequirements } from './inventory'
import { menuGroups, selectionPrice } from './addonGroups'

const round = value => Math.round(value * 100) / 100
export function recipeCost(menu, addons, qty, materials) {
  try {
    return getEffectiveRequirements(menu, addons, qty, materials).reduce((sum, row) => {
      const cost = materials.find(m => m.id === row.materialId)?.unitCost
      if (cost === null || cost === undefined || !Number.isFinite(Number(cost)) || Number(cost) < 0) throw new Error('ไม่พบต้นทุนวัตถุดิบ')
      return sum + row.qty * Number(cost)
    }, 0)
  } catch { return null }
}

export function estimateMenuCosts(menu, groups, addons, materials) {
  const baseCost = recipeCost(menu, [], 1, materials)
  let averageCost = baseCost, worstCost = baseCost
  const estimates = menuGroups(menu, groups).filter(g => g.pricingMode === 'included').map(group => {
    const options = group.options.map(o => addons.find(a => a.id === o.addonId)).filter(a => a && a.isActive !== false)
    const count = group.maxSelections
    const costs = options.map(a => recipeCost({recipe:[]}, [a], 1, materials))
    const valid = costs.length > 0 && costs.every(c => c !== null) && (group.allowRepeat || count <= costs.length)
    const average = valid ? costs.reduce((s,c) => s+c,0) / costs.length * count : null
    const worst = valid ? group.allowRepeat ? Math.max(...costs)*count : [...costs].sort((a,b)=>b-a).slice(0,count).reduce((s,c)=>s+c,0) : null
    averageCost = averageCost === null || average === null ? null : averageCost + average
    worstCost = worstCost === null || worst === null ? null : worstCost + worst
    return {id:group.id,name:group.name,count,allowRepeat:group.allowRepeat,averageCost:average === null ? null : round(average),worstCost:worst === null ? null : round(worst)}
  })
  return {baseCost,averageCost:averageCost === null ? null : round(averageCost),worstCost:worstCost === null ? null : round(worstCost),groups:estimates}
}

export function selectedItemCosts(menu, addons, qty, materials, platform) {
  const unitPrice = menu?.prices?.[platform?.id]
  const priceValid = unitPrice !== undefined && unitPrice !== null && unitPrice !== '' && Number.isFinite(Number(unitPrice))
  const revenue = priceValid ? round((Number(unitPrice) + addons.reduce((sum,a)=>sum+selectionPrice(a,platform.id),0))*qty) : null
  const rate = Number(platform?.gpPercent ?? 0)
  const gpAmount = revenue !== null && Number.isFinite(rate) && rate >= 0 && rate <= 100 ? round(revenue*rate/100) : null
  const netRevenue = gpAmount === null ? null : round(revenue-gpAmount)
  const rawCost = recipeCost(menu, addons, qty, materials)
  const cost = rawCost === null ? null : round(rawCost)
  return {revenue,gpAmount,netRevenue,cost,profit:netRevenue === null || cost === null ? null : round(netRevenue-cost)}
}
