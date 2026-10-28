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

// Stock rows are a bounded per-bill footprint, not a shop-wide ingredient cap.
// Pad with registered zero-need rows to retain the independently proved operand
// distribution. Canonical recipes, rather than mutable leaf caches, determine use.
export function saleMaterials(shop,materials,lines,packages={}){
 const c=shop.catalog,registry=shop.materialIds||materials.map(m=>m.id),used=new Set()
 const add=(id,q)=>{
  if(!Number.isSafeInteger(q)||q<0)throw new Error('INVALID_RECIPE_QUANTITY')
  if(q===0)return
  const material=materials.find(m=>m.id===id)
  if(!registry.includes(id)||!material||material.deleted)throw new Error('INVALID_RECIPE_MATERIAL')
  used.add(id)
 }
 for(const [id,entry] of Object.entries(packages))add(id,Math.max(1,entry.quantity))
 for(const line of lines){
  const menu=c.menus[line.menuId]
  for(const [id,q] of Object.entries(menu.rawRecipe||menu.recipe)){
   const material=materials.find(m=>m.id===id)
   if(q>0&&menu.rawRecipe&&menu.hasPackage===false&&material?.inventoryType==='packaging')continue
   add(id,q)
  }
  for(const id of line.optionIds)for(const [materialId,q] of Object.entries(c.addons[id].recipe))add(materialId,q)
 }
 if(used.size>16)throw Object.assign(new Error('SALE_MATERIAL_LIMIT'),{code:'SALE_MATERIAL_LIMIT'})
 const count=Math.max(c.summaryMaterials.length,used.size)
 if(!Number.isSafeInteger(count)||count<0||count>16)throw new Error('UNSUPPORTED_MATERIAL_PROFILE')
 const ids=[...used]
 for(const id of [...c.summaryMaterials,...registry])if(ids.length<count&&!ids.includes(id)&&materials.some(m=>m.id===id&&!m.deleted))ids.push(id)
 if(ids.length!==count)throw new Error('INCOMPLETE_INVENTORY')
 return ids.map(id=>materials.find(m=>m.id===id)).sort((a,b)=>a.costRank-b.costRank)
}
