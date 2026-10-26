// Core v1 planner. Rules independently validate every persisted result.
// Declared recipes are authoritative when present. `recipe` is the legacy
// projection retained for snapshots and refreshed when that menu is authored.
export function summaryMenuQuantity(menu,material){
  if(Object.hasOwn(menu,'rawRecipe'))return menu.hasPackage===false&&material.inventoryType==='packaging'?0:menu.rawRecipe[material.id]||0
  return menu.recipe[material.id]||0
}
export function summaryEffectiveRecipe(menu,materials){
  if(!Object.hasOwn(menu,'rawRecipe'))return structuredClone(menu.recipe)
  return Object.fromEntries(Object.entries(menu.rawRecipe).filter(([id])=>menu.hasPackage!==false||materials.find(m=>m.id===id)?.inventoryType!=='packaging'))
}
