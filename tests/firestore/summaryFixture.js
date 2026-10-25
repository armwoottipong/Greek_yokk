import { lineOperands } from './summaryLineCache.js'
import { addonOperands } from './summaryAddonOperands.js'
import { setCatalogFixture } from './setCatalogFixture.js'
import { prepareStockMaterial } from './setStockInFixture.js'

export const SUMMARY_MAX_UNIT_COST=100000
function assertSummaryCosts(materials){
  const valid=value=>Number.isFinite(value)&&value>=0&&value<=SUMMARY_MAX_UNIT_COST
  for(const m of materials){
    if(!valid(m.unitCost)||m.lotIds.some(id=>!valid(m.lots[id].unitCost)))throw new Error('Unsupported summary unit cost')
  }
}

// Test-only alternative: fifteen counters replace subset lookup tables. Existing
// quantity/cost/allocation outputs remain the independent domain-derived oracle.
export function summaryFixture(options={}) {
  return asSummary(setCatalogFixture(options))
}
export function asSummary(f) {
  const catalog=f.shop.catalog
  catalog.groups={};catalog.groupIds=[]
  const menuIds=Object.keys(catalog.menus),addonIds=Object.keys(f.addons)
  catalog.counterIds=menuIds.concat(Array(4-menuIds.length).fill('_'),addonIds,Array(11-addonIds.length).fill('_'))
  catalog.addons=structuredClone(f.addons)
  catalog.platformIds=Object.keys(catalog.platforms)
  catalog.addonPrices=Object.fromEntries(catalog.platformIds.map(p=>[p,{_:0,...Object.fromEntries(addonIds.map(id=>[id,f.addons[id].pricesCents[p]]))}]))
  for(const menu of Object.values(catalog.menus)){delete menu.variantPrices;delete menu.optionBits;menu.priceMode??=menu.min===3&&menu.max===3?'override':'addon'}
  const included=new Set(Object.values(catalog.menus).flatMap(m=>m.materialIds))
  const members=f.materials.filter(m=>included.has(m.id)).sort((a,b)=>a.costRank-b.costRank)
  if(members.length!==15)throw new Error('Summary prototype requires fifteen material counter guards')
  catalog.summaryMaterials=members.map(m=>m.id)
  f.order.lines.forEach(l=>{l.optionQuantities={_:0,...Object.fromEntries(l.optionIds.map(id=>[id,1]))}})
  Object.assign(f.order,addonOperands(f.order.lines,catalog));delete f.order.quantities
  Object.assign(f.order,lineOperands(f.order.lines))
  f.order.lines.forEach(l=>{delete l.optionCode;l.catalog=structuredClone(catalog.menus[l.menuId]);l.group={}})
  const oldRows=new Map(f.order.inventory.map(row=>[row.materialId,row]))
  const oldNext=new Map(f.nextMaterials.map(m=>[m.id,m]))
  f.order.materialIds=members.map(m=>m.id)
  f.order.inventory=members.map(m=>oldRows.get(m.id)||{materialId:m.id,revision:m.revision,costRank:m.costRank,needed:0,take:0,shortage:0,ingredientCostBaht:0,packagingCostCents:0,lotIds:[...m.allocationIds],lotTakes:[0,0,0,0]})
  f.nextMaterials=members.map((m,i)=>({...oldNext.get(m.id)||structuredClone(m),revision:m.revision+1,lastOpId:f.order.opId,lastOpKind:'sale_set',lastOpIndex:i}))
  f.materials.forEach(m=>{
    const quantities=catalog.counterIds.map((id,i)=>i<4 ? 0 : f.addons[id]?.recipe[m.id]||0)
    m.recipeIndex={catalogRevision:f.shop.catalogRevision,quantities,addons:{_:0,...Object.fromEntries(addonIds.map(id=>[id,f.addons[id].recipe[m.id]||0]))},menus:{_:0,...Object.fromEntries(Object.values(catalog.menus).map(menu=>[menu.id,menu.recipe[m.id]||0]))}}
  })
  f.nextMaterials.forEach(m=>{m.recipeIndex=structuredClone(f.materials.find(before=>before.id===m.id).recipeIndex)})
  for(const m of f.materials){
    Object.assign(m,prepareStockMaterial(m))
    for(const lot of Object.values(m.lots))lot.sortKey=lot.expiryDay*1e9+lot.receiveDay*1000+lot.ordinal
    m.lotQty=Object.fromEntries(Object.entries(m.lots).map(([id,l])=>[id,l.qty]))
    m.zeroActiveIds=m.lotIds.filter(id=>m.lotQty[id]===0&&m.lots[id].isInUse)
  }
  f.nextMaterials=f.nextMaterials.map(original=>{
    const m={...structuredClone(f.materials.find(before=>before.id===original.id)),...original}
    m.lotQty=Object.fromEntries(Object.entries(m.lots).map(([id,l])=>[id,l.qty]))
    m.zeroActiveIds=m.lotIds.filter(id=>m.lotQty[id]===0&&m.lots[id].isInUse)
    m.lots=structuredClone(f.materials.find(before=>before.id===m.id).lots)
    if(f.order.inventory.find(row=>row.materialId===m.id).needed>0&&m.activeLotId){
      m.lastStockInDay=m.lots[m.activeLotId].receiveDay;m.expiryDay=m.lots[m.activeLotId].expiryDay
    }
    return m
  })
  f.order.approvedShortages=Object.fromEntries(f.order.inventory.map(row=>[row.materialId,row.shortage]))
  f.nextShop.catalog=structuredClone(catalog)
  assertSummaryCosts(f.materials)
  return f
}

export function decodeSummaryMaterial(m) {
  const next=structuredClone(m)
  for(const id of next.lotIds){next.lots[id].qty=next.lotQty[id];next.lots[id].isInUse=next.lotQty[id]>0?next.activeLotId===id:next.zeroActiveIds.includes(id)}
  delete next.lotQty;delete next.zeroActiveIds
  return next
}
