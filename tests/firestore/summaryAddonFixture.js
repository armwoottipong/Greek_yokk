import { summaryFixture } from './summaryFixture.js'

// Leave an unused accounting slot without changing the fifteen stock guards.
export function addonVacancy(options={},count=10) {
  const base=summaryFixture(options),c=base.shop.catalog
  const removed=c.addonIds.slice(count)
  c.addonIds=c.addonIds.slice(0,count)
  for(const id of removed){delete c.addons[id];c.counterIds[c.counterIds.indexOf(id)]='_';for(const prices of Object.values(c.addonPrices))delete prices[id]}
  for(const menu of Object.values(c.menus)){
    menu.optionIds=menu.optionIds.filter(id=>!removed.includes(id))
    menu.max=Math.min(menu.max,menu.optionIds.length)
    menu.min=Math.min(menu.min,menu.max)
    for(const id of removed){delete menu.choiceMaterials[id];for(const prices of Object.values(menu.optionPrices))delete prices[id]}
    menu.materialIds=[...new Set([...Object.keys(menu.recipe),...Object.values(menu.choiceMaterials).flat()])]
  }
  for(const m of base.materials){for(let i=4+count;i<15;i++)m.recipeIndex.quantities[i]=0;for(const id of removed)delete m.recipeIndex.addons[id]}
  return base
}
