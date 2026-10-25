import { normalizeDatabase } from '../../src/domain/database.js'
import { encodeLegacyId as key } from '../../src/cloud/paths.js'
import { sourceSummaryFixture } from './summarySourceAdapter.js'
import { summaryPreparedMenu } from './summaryPreparedMenu.js'
import { summaryMultiGroupSale } from './summaryMultiGroupSale.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
import { aggregateRequirements } from '../../src/domain/inventory.js'
import { toScaledExact } from '../../src/cloud/conversion.js'
import { materialDetailsSnapshot,validateMaterialDetails } from './summaryMaterialDetails.js'

// Preserve display/compatibility fields in this projection without applying
// defaults. This remains a test adapter, not a full historical migration codec.
export function projectMaterialMetadata(source){
  const metadata=materialDetailsSnapshot(source)
  if(Object.keys(metadata).length)validateMaterialDetails(metadata)
  for(const [field,max] of [['name',160],['emoji',32],['unit',32]])if(Object.hasOwn(source,field)){
    if(typeof source[field]!=='string'||source[field].length>max||(field!=='emoji'&&!source[field].trim()))throw new Error('Unsupported source material metadata')
    metadata[field]=source[field]
  }
  if(Object.hasOwn(source,'minAlert')){
    const scaled=toScaledExact(source.minAlert,100)
    if(!scaled.ok||scaled.value<0||scaled.value>1000000000)throw new Error('Unsupported source material alert')
    metadata.minAlertQ=scaled.value
  }
  if(source.hasSubRecipe!==true){
    const dormant=Object.fromEntries(['hasSubRecipe','yieldQty','subRecipe'].filter(field=>Object.hasOwn(source,field)).map(field=>[field,structuredClone(source[field])]))
    if(Object.keys(dormant).length)metadata.legacyInactiveProduction=dormant
  }
  return metadata
}

// Opt-in prototype projection only. Preserve raw precision checks; no history import.
export function sourcePreparedFixture(raw,options={}){
  const result=normalizeDatabase(raw,{source:'import'})
  if(!result.ok)throw new Error('Invalid source snapshot')
  const d=result.value
  for(const menu of d.menus){
    const ids=menu.hasAddons===false?[]:menu.addonGroupIds||[]
    if(ids.length>2||ids.length===2&&ids.some(id=>d.addonGroups.find(g=>g.id===id)?.maxSelections>3))throw new Error('Unsupported multiple source group profile')
  }
  const scaffold={...raw,menus:raw.menus.map(menu=>({...menu,...(menu.addonGroupIds?.length>1?{addonGroupIds:menu.addonGroupIds.slice(0,1)}:{})}))}
  const f=sourceSummaryFixture(scaffold,{...options,repeatLimit:11}),c=f.shop.catalog
  for(const source of raw.materials)Object.assign(f.materials.find(m=>m.id===key(source.id)),projectMaterialMetadata(source))
  if(raw.categories&&Object.hasOwn(raw.categories,'material'))f.shop.legacyMaterialCategories=structuredClone(raw.categories.material)
  // Preserve the declared recipe separately from package-filtered requirements.
  // This profile still requires every declared member to have a protected role.
  for(const source of d.menus){
    const menu=c.menus[key(source.id)]
    menu.rawRecipe=Object.fromEntries(aggregateRequirements(source.recipe).map(row=>{
      const id=key(row.materialId),scaled=toScaledExact(row.qty,100)
      if(!scaled.ok||!c.summaryMaterials.includes(id))throw new Error('Unsupported declared source material profile')
      return [id,scaled.value]
    }))
    menu.hasPackage=source.hasPackage!==false
    menu.materialIds=[...new Set([...menu.materialIds,...Object.keys(menu.rawRecipe)])]
  }
  for(const source of d.menus){
    if(source.hasAddons===false||source.addonGroupIds?.length!==2)continue
    const id=key(source.id),old=c.menus[id]
    const bound=summaryPreparedMenu(f.shop,f.materials,{...old,groupIds:source.addonGroupIds.map(key)})
    c.menus[id]={...bound.nextShop.catalog.menus[id],revision:old.revision};c.groups=bound.nextShop.catalog.groups
  }
  const lines=f.order.lines.map(line=>{
    const menu=c.menus[line.menuId]
    if(!menu.groupIds?.length)return {menuId:line.menuId,qty:line.qty,optionIds:line.optionIds.flatMap(id=>Array(line.optionQuantities[id]).fill(id)),note:line.note}
    const selections=menu.groupIds.flatMap(id=>{
      const g=c.groups[id]
      return g.allowRepeat?(g.min?[{groupId:id,id:g.optionIds[0],selectionQty:g.min}]:[]):g.optionIds.slice(0,g.min).map(option=>({groupId:id,id:option,selectionQty:1}))
    })
    return {menuId:line.menuId,qty:line.qty,selections,note:line.note}
  })
  f.shop=materialRegistryShop(f.shop,f.materials)
  const sale=summaryMultiGroupSale(f.shop,f.materials,lines,{platformId:f.order.platformId,opId:f.order.opId,uid:f.order.uid})
  return {...f,order:sale.order,nextMaterials:sale.nextMaterials,nextShop:sale.nextShop}
}
