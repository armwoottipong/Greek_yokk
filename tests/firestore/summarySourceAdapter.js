import { normalizeDatabase } from '../../src/domain/database.js'
import { toScaledExact } from '../../src/cloud/conversion.js'
import { encodeLegacyId } from '../../src/cloud/paths.js'
import { sourceSetFixture } from './setCatalogSourceAdapter.js'
import { summarySale } from './summarySale.js'
import { asSummary } from './summaryFixture.js'

// Opt-in test adapter only. Never copies orders, logs or external sync settings.
export function sourceSummaryFixture(raw,options={}){
  const f=asSummary(sourceSetFixture(raw,{...options,repeatProjection:true})),normalized=normalizeDatabase(raw,{source:'import'})
  if(!normalized.ok)throw new Error('Invalid source snapshot')
  const scaled=value=>{
    const result=toScaledExact(value,100)
    if(!result.ok)throw new Error('Unsupported production precision')
    return result.value
  }
  const c=f.shop.catalog,d=normalized.value
  for(const group of raw.addonGroups||[])for(const option of group.options||[])for(const price of Object.values(option.prices||{})){
    if(!toScaledExact(price,100).ok)throw new Error('Unsupported group price precision')
  }
  if(d.addonGroups.length>64)throw new Error('Unsupported source group count')
  for(const source of d.addonGroups){
    if((source.allowRepeat&&source.maxSelections>(options.repeatLimit??3))||source.options.length>45||source.minSelections>11||source.maxSelections>11)throw new Error('Unsupported source group profile')
    const id=encodeLegacyId(source.id),optionIds=source.options.map(o=>encodeLegacyId(o.addonId))
    if(optionIds.some(key=>!c.addonIds.includes(key)))throw new Error('Unsupported source group addon')
    for(const option of source.options)for(const p of Object.keys(option.prices||{}))if(!c.platformIds.includes(encodeLegacyId(p)))throw new Error('Unsupported source group platform')
    c.groupIds.push(id);c.groups[id]={id,name:source.name,revision:1,active:true,allowRepeat:source.allowRepeat,pricingMode:source.pricingMode,
      min:source.minSelections,max:source.maxSelections,optionIds,menuIds:[],optionPrices:Object.fromEntries(d.platforms.map(p=>[encodeLegacyId(p.id),{_:0,
        ...Object.fromEntries(source.options.filter(o=>Object.hasOwn(o.prices||{},p.id)).map(o=>[encodeLegacyId(o.addonId),scaled(o.prices[p.id])]))}]))}
  }
  for(const source of d.menus){
    const ids=source.hasAddons===false?[]:source.addonGroupIds||[]
    if(ids.length>1)throw new Error('Unsupported multiple source groups')
    if(!ids.length)continue
    const m=c.menus[encodeLegacyId(source.id)],groupId=encodeLegacyId(ids[0])
    m.groupId=groupId;m.optionIds=[];m.min=0;m.max=0;m.priceMode='addon';m.choiceMaterials={};m.materialIds=Object.keys(m.recipe)
    m.optionPrices=Object.fromEntries(c.platformIds.map(p=>[p,{_:0}]))
    c.groups[groupId].menuIds.push(m.id)
  }
  for(const line of f.order.lines){const m=c.menus[line.menuId];line.catalog=structuredClone(m);line.group=m.groupId?structuredClone(c.groups[m.groupId]):{}}
  f.nextShop.catalog=structuredClone(c)
  for(const m of raw.materials||[])for(const row of m.subRecipe||[])scaled(row.qty)
  for(const m of normalized.value.materials){
    if(!m.hasSubRecipe||!m.subRecipe?.length)continue
    const inputs=m.subRecipe.map(row=>({id:encodeLegacyId(row.materialId),qty:scaled(row.qty)}))
    if(inputs.length>2||new Set(inputs.map(row=>row.id)).size!==inputs.length)throw new Error('Unsupported production inputs')
    const recipe={yieldQ:scaled(Number(m.yieldQty)||1200),inputIds:inputs.map(row=>row.id),quantities:inputs.map(row=>row.qty)}
    const material=f.materials.find(row=>row.id===encodeLegacyId(m.id))
    material.productionRecipe=recipe
    const next=f.nextMaterials.find(row=>row.id===material.id)
    if(next)next.productionRecipe=structuredClone(recipe)
  }
  if(d.addonGroups.some(group=>group.allowRepeat)){
    const lines=f.order.lines.map(line=>{
      const menu=c.menus[line.menuId],group=c.groups[menu.groupId],ids=[...line.optionIds]
      if(group?.allowRepeat)while(ids.length<group.min)ids.push(group.optionIds[0])
      return {menuId:line.menuId,qty:line.qty,optionIds:ids,note:line.note}
    })
    const sale=summarySale(f.shop,f.materials,lines,{platformId:f.order.platformId,opId:f.order.opId,uid:f.order.uid})
    Object.assign(f,{order:sale.order,nextMaterials:sale.nextMaterials,nextShop:sale.nextShop})
  }
  return f
}
