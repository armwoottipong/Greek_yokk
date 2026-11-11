import {groupAvailability} from './groupAvailability.js'
import {applyDisplayOrder} from '../../domain/catalogOrdering.js'
export const recipeRows=recipe=>Object.entries(recipe||{}).filter(([,q])=>q>0).map(([materialId,q])=>({materialId,qty:q/100}))
const prices=values=>Object.fromEntries(Object.entries(values||{}).map(([id,v])=>[id,v/100]))
const visible=(data,collection,id)=>!data.display?.[collection]?.[id]?.deleted
export function catalogMenus(data){
 const c=data?.shop.catalog;if(!c)return []
 const rows=(c.menuIds||Object.keys(c.menus||{})).filter(id=>visible(data,'menus',id)).map(id=>{const m=c.menus[id],groups=m.groupIds?.length?m.groupIds:m.groupId?[m.groupId]:[];return {id,...data.display?.menus?.[id],name:data.display?.menus?.[id]?.name||m.name||id,isActive:m.active,recipe:recipeRows(m.rawRecipe||m.recipe),hasPackage:m.hasPackage!==false,hasAddons:!!(groups.length||m.optionIds?.length),...(groups.length?{addonGroupIds:[...groups]}:m.optionIds?.length?{}:{addonGroupIds:[]}),prices:prices(m.pricesCents)}})
 return applyDisplayOrder(rows,data.display?.menuOrder)
}
export function catalogAddons(data){
 const c=data?.shop.catalog;if(!c)return []
 return (c.addonIds||Object.keys(c.addons||{})).filter(id=>visible(data,'addons',id)).map(id=>({id,...data.display?.addons?.[id],name:data.display?.addons?.[id]?.name||c.addons[id].name||id,isActive:c.addons[id].active!==false,recipe:recipeRows(c.addons[id].recipe),prices:prices(c.addons[id].pricesCents)}))
}
export function catalogGroups(data){
 const c=data?.shop.catalog;if(!c)return []
 return (c.groupIds||[]).filter(id=>visible(data,'groups',id)).map(id=>{const g=c.groups[id];const {pausedIds,unpricedById,...availability}=groupAvailability(data,g);return {id,...availability,name:data.display?.groups?.[id]?.name||g.name||id,isActive:g.active,minSelections:g.min,maxSelections:g.max,allowRepeat:g.allowRepeat,pricingMode:g.pricingMode,options:g.optionIds.map(addonId=>{
  const override=Object.fromEntries(c.platformIds.filter(p=>Object.hasOwn(g.optionPrices?.[p]||{},addonId)).map(p=>[p,g.optionPrices[p][addonId]/100]))
  return {addonId,...(pausedIds?.has(addonId)?{paused:true}:{}),...(unpricedById?.[addonId]?.length?{unpricedPlatformIds:unpricedById[addonId]}:{}),...(Object.keys(override).length?{prices:override}:{})}
 })}})
}
export function catalogPlatforms(data){const c=data?.shop.catalog;return c?(c.platformIds||[]).map(id=>({id,...data.display?.platforms?.[id],name:data.display?.platforms?.[id]?.name||id,isActive:c.platforms[id]?.active!==false,gpPercent:(c.platforms[id]?.gpBasisPoints||0)/100})):[]}
