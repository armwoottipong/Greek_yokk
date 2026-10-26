// Offline trusted projection. No synthetic receipts, variant tables or fixture
// catalogue limits. Original records are archived separately by core-import.
import {normalizeDatabase} from '../src/domain/database.js'
import {aggregateRequirements} from '../src/domain/inventory.js'
import {toScaledExact} from '../src/cloud/conversion.js'
import {encodeLegacyId as key} from '../src/cloud/paths.js'
import {installLotMap} from '../src/cloud/core/model/lots.js'
import {prepareStockMaterial} from '../src/cloud/core/model/stockPlan.js'
import {projectMaterialMetadata} from '../tests/firestore/summaryPreparedSource.js'
const scaled=value=>{const r=toScaledExact(value,100);if(!r.ok||r.value<0||r.value>1e9)throw new Error('Unsupported source precision/range');return r.value}
const prices=values=>Object.fromEntries(Object.entries(values||{}).map(([id,v])=>[key(id),scaled(v)]))
const recipe=rows=>Object.fromEntries(aggregateRequirements(rows).map(r=>[key(r.materialId),scaled(r.qty)]))
const day=value=>{if(!value)return 999999;const n=Date.parse(`${value}T00:00:00Z`)/86400000;if(!Number.isInteger(n)||n<0||n>100000)throw new Error('Invalid source date');return n}
export function projectCoreSource(raw){
 // Reject precision loss BEFORE domain normalization aggregates/rounds rows.
 for(const kind of ['menus','addons'])for(const row of raw[kind]||[]){
  for(const r of row.recipe||[])scaled(r.qty)
  if(row.recipe===undefined&&row.materialId&&raw.schemaVersion!==4)scaled(row.amountUsed)
 }
 for(const m of raw.materials||[]){scaled(m.stock);for(const l of m.lots||[])scaled(l.qty);for(const r of m.subRecipe||[])scaled(r.qty)}
 const normalized=normalizeDatabase({...raw,orders:[],activityLogs:[],stockShortages:[]},{source:'import'})
 if(!normalized.ok)throw new Error('Invalid source snapshot')
 const d=normalized.value,activeAddons=d.addons.filter(a=>a.isActive!==false)
 if(d.menus.length>64||activeAddons.length>11||d.materials.length>64||d.addonGroups.length>64)throw new Error('Unsupported catalogue bounds')
 const platforms=Object.fromEntries(d.platforms.map(p=>[key(p.id),{revision:1,active:p.isActive!==false,gpBasisPoints:scaled(p.gpPercent)}]))
 const platformIds=Object.keys(platforms),addons=Object.fromEntries(activeAddons.map(a=>[key(a.id),{recipe:recipe(a.recipe),pricesCents:prices(a.prices)}]))
 const addonIds=Object.keys(addons),addonPrices=Object.fromEntries(platformIds.map(p=>[p,{_:0,...Object.fromEntries(addonIds.map(id=>[id,addons[id].pricesCents[p]]))}]))
 const groups=Object.fromEntries(d.addonGroups.map(g=>{
  if(g.options.length>45||g.minSelections>11||g.maxSelections>11||g.options.some(o=>!addonIds.includes(key(o.addonId))))throw new Error('Unsupported source group')
  for(const o of g.options)for(const v of Object.values(o.prices||{}))scaled(v)
  return [key(g.id),{id:key(g.id),name:g.name,revision:1,active:true,allowRepeat:g.allowRepeat,pricingMode:g.pricingMode,min:g.minSelections,max:g.maxSelections,
   optionIds:g.options.map(o=>key(o.addonId)),menuIds:[],optionPrices:Object.fromEntries(d.platforms.map(p=>[key(p.id),{_:0,...Object.fromEntries(g.options.filter(o=>Object.hasOwn(o.prices||{},p.id)).map(o=>[key(o.addonId),scaled(o.prices[p.id])]))}]))}]
 }))
 const types=new Map(d.materials.map(m=>[key(m.id),m.inventoryType]))
 const menus=Object.fromEntries(d.menus.map(m=>{
  const id=key(m.id),bound=m.hasAddons===false?[]:(m.addonGroupIds||[]).map(key),rawRecipe=recipe(m.recipe),hasPackage=m.hasPackage!==false
  if(bound.length>2||bound.some(id=>!groups[id]||bound.length===2&&groups[id].max>3))throw new Error('Unsupported menu groups')
  const options=bound.length||m.hasAddons===false?[]:addonIds
  const effective=Object.fromEntries(Object.entries(rawRecipe).filter(([id])=>hasPackage||types.get(id)!=='packaging'))
  const choiceMaterials=Object.fromEntries(options.map(id=>[id,Object.keys(addons[id].recipe)]))
  const menu={id,revision:1,active:m.isActive!==false,recipe:effective,rawRecipe,hasPackage,pricesCents:prices(m.prices),priceMode:'addon',
   optionIds:options,optionPrices:Object.fromEntries(platformIds.map(p=>[p,{_:0,...Object.fromEntries(options.map(id=>[id,addonPrices[p][id]]))}])),choiceMaterials,
   min:0,max:options.length,materialIds:[...new Set([...Object.keys(rawRecipe),...Object.values(choiceMaterials).flat()])]}
  if(bound.length===1)menu.groupId=bound[0]
  if(bound.length===2)menu.groupIds=bound
  for(const g of bound){groups[g].menuIds.push(id);if(bound.length===2)groups[g].multiMenuIds=(groups[g].multiMenuIds||[]).concat(id)}
  return [id,menu]
 }))
 const protectedRefs=new Set([...Object.values(menus).flatMap(m=>Object.keys(m.rawRecipe)),...Object.values(addons).flatMap(a=>Object.keys(a.recipe))])
 const materials=d.materials.map((m,index)=>{
  const original=raw.materials[index]
  if(m.id!==original.id||m.stock!==original.stock||original.lots?.length&&scaled(original.stock)!==original.lots.reduce((n,l)=>n+scaled(l.qty),0))throw new Error('Source stock requires reconciliation')
  if(m.lots.length>1000)throw new Error('Unsupported lot history')
  const row={id:key(m.id),legacyId:m.id,revision:1,costRank:index,deleted:m.isDeleted,inventoryType:m.inventoryType,unitCost:m.unitCost,
   stock:scaled(m.stock),lastOpId:'',packSize:Number(m.packSize)>0?Number(m.packSize):1,packCostCents:scaled(m.packCost),
   activeLotId:m.lots.find(l=>l.isInUse&&l.qty>0)?key(m.lots.find(l=>l.isInUse&&l.qty>0).id):'',
   lots:m.lots.map(l=>({...structuredClone(l),id:key(l.id),qty:scaled(l.qty),receiveDay:day(l.receiveDate),expiryDay:day(l.expiryDate)})),
   recipeIndex:{catalogRevision:1,menus:{_:0,...Object.fromEntries(Object.values(menus).map(menu=>[menu.id,menu.recipe[key(m.id)]||0]))},addons:{_:0,...Object.fromEntries(addonIds.map(id=>[id,addons[id].recipe[key(m.id)]||0]))}},
   ...projectMaterialMetadata(original)}
  installLotMap(row);Object.assign(row,prepareStockMaterial(row))
  for(const l of Object.values(row.lots))l.sortKey=l.expiryDay*1e9+l.receiveDay*1000+l.ordinal
  row.lotQty=Object.fromEntries(Object.entries(row.lots).map(([id,l])=>[id,l.qty]));row.zeroActiveIds=row.lotIds.filter(id=>row.lotQty[id]===0&&row.lots[id].isInUse)
  if(m.hasSubRecipe&&m.subRecipe?.length){
   if(m.subRecipe.length>2)throw new Error('Unsupported production inputs')
   row.productionRecipe={yieldQ:scaled(Number(m.yieldQty)||1200),inputIds:m.subRecipe.map(r=>key(r.materialId)),quantities:m.subRecipe.map(r=>scaled(r.qty))}
  }
  return row
 })
 const materialIds=materials.map(m=>m.id),summaryMaterials=materialIds.filter(id=>protectedRefs.has(id))
 if(summaryMaterials.length!==protectedRefs.size||![15,16].includes(summaryMaterials.length))throw new Error('Unsupported protected material profile')
 const productionUsers=Object.fromEntries(materialIds.map(id=>[id,[]]))
 for(const m of materials)for(const id of m.productionRecipe?.inputIds||[]){if(!productionUsers[id])throw new Error('Missing production input');productionUsers[id].push(m.id)}
 const shop={status:'active',generation:'g1',revision:1,lastOpId:'',catalogRevision:1,materialIds,productionUsers,
  catalog:{menus,platforms,menuIds:Object.keys(menus),addonIds,addons,platformIds,addonPrices,groups,groupIds:Object.keys(groups),summaryMaterials}}
 if(raw.categories&&Object.hasOwn(raw.categories,'material'))shop.legacyMaterialCategories=structuredClone(raw.categories.material)
 return {shop,materials}
}
