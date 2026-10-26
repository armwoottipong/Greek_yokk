import { serverTimestamp } from 'firebase/firestore'

const clone=value=>structuredClone(value)
const validType=value=>value==='ingredient'||value==='packaging'

// Planner for changing a material's inventory classification.
export function summaryMaterialType(shop,materials,targetId,inventoryType,{opId='MATERIAL-TYPE',uid='cashier'}={}){
  const catalog=shop?.catalog,target=Array.isArray(materials)?materials.find(m=>m.id===targetId):null
  const ids=catalog?.summaryMaterials,menuIds=catalog?.menuIds
  if(!Array.isArray(shop?.materialIds)||!shop.materialIds.includes(targetId)||!target||target.deleted||!validType(target.inventoryType)||!validType(inventoryType)||
    target.inventoryType===inventoryType||Object.hasOwn(target,'productionRecipe')||!Array.isArray(shop.productionUsers?.[targetId])||shop.productionUsers[targetId].length!==0||
    !Array.isArray(ids)||![15,16].includes(ids.length)||new Set(ids).size!==ids.length||!Array.isArray(menuIds)||menuIds.length>64||new Set(menuIds).size!==menuIds.length)throw new Error('Invalid material type change')
  const guards=ids.map(id=>materials.find(m=>m.id===id))
  if(guards.some(m=>!m||m.deleted||!validType(m.inventoryType)||!m.recipeIndex||m.recipeIndex.catalogRevision!==shop.catalogRevision))throw new Error('Invalid protected material state')
  if(!Array.isArray(materials)||materials.filter(m=>m.id===targetId).length!==1)throw new Error('Invalid target material')
  const menus=clone(catalog.menus)
  for(const menuId of menuIds){
    const menu=menus?.[menuId]
    if(!menu||!menu.rawRecipe||typeof menu.rawRecipe!=='object'||Array.isArray(menu.rawRecipe)||typeof menu.hasPackage!=='boolean'||
      !menu.recipe||typeof menu.recipe!=='object'||Array.isArray(menu.recipe))throw new Error('Invalid raw menu recipe state')
    const rawEntries=Object.entries(menu.rawRecipe)
    if(rawEntries.some(([id,q])=>!ids.includes(id)||!Number.isSafeInteger(q)||q<0||q>1000000000))throw new Error('Invalid raw menu recipe')
    const actual=menu.recipe
    const actualEntries=Object.entries(actual)
    if(actualEntries.some(([id,q])=>!ids.includes(id)||!Number.isSafeInteger(q)||q<0||q>1000000000))throw new Error('Invalid effective menu recipe')
  }
  for(const material of guards){
    const cache=material.recipeIndex.menus
    if(!cache||typeof cache!=='object'||Array.isArray(cache)||Object.entries(cache).some(([id,q])=>id!=='_'&&!menuIds.includes(id)||!Number.isSafeInteger(q)||q<0||q>1000000000)||
      Object.keys(cache).some(id=>id==='_'?cache[id]!==0:false))throw new Error('Invalid protected menu cache')
    for(const menuId of menuIds){
      const menu=menus[menuId],rawHas=Object.hasOwn(menu.rawRecipe,material.id)
      const expected=rawHas&&(menu.hasPackage||material.inventoryType==='ingredient')?menu.rawRecipe[material.id]:0
      if((cache[menuId]||0)!==expected)throw new Error('Protected menu cache is stale')
    }
  }

  const nextShop={...clone(shop),revision:shop.revision+1,catalogRevision:shop.catalogRevision+1,lastOpId:opId,lastOpKind:'material_type'}
  const nextMaterials=guards.map((material,index)=>{
    const next={...clone(material),revision:material.revision+1,lastOpId:opId,lastOpKind:'material_type',lastOpIndex:index,
      recipeIndex:{...clone(material.recipeIndex),catalogRevision:nextShop.catalogRevision}}
    if(material.id===targetId){
      next.inventoryType=inventoryType
      next.recipeIndex.menus={_:0,...Object.fromEntries(menuIds.map(menuId=>{
        const menu=menus[menuId],rawHas=Object.hasOwn(menu.rawRecipe,targetId)
        return [menuId,rawHas&&(menu.hasPackage||inventoryType==='ingredient')?menu.rawRecipe[targetId]:0]
      }))}
    }
    return next
  })
  if(!ids.includes(targetId))nextMaterials.push({...clone(target),inventoryType,revision:target.revision+1,lastOpId:opId,lastOpKind:'material_type',lastOpIndex:nextMaterials.length})
  return {nextShop,nextMaterials,operation:{schemaVersion:2,kind:'material_type',status:'committed',opId,uid,createdAt:serverTimestamp(),
    targetId,targetRevision:target.revision,previousType:target.inventoryType,inventoryType,sourceCatalogRevision:shop.catalogRevision,
    shopRevision:nextShop.revision,materialIds:nextMaterials.map(m=>m.id)}}
}
