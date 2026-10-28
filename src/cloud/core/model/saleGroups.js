// Core v1 planner. Rules independently validate every persisted result.
import { summarySale,summarySaleFromLines } from './sale.js'
import { preparedSale } from './prepared.js'

// Two groups, each at most three units; preserve group/addon pairs.
export function summaryMultiGroupSale(shop,materials,lines,options={}){
  const c=shop.catalog,platform=options.platformId||'P'
  const canonical=lines.map(line=>{
    const menu=c.menus[line.menuId],ids=menu?.groupIds
    if(!ids?.length)return summarySale(shop,materials,[line],{...options,packages:undefined}).order.lines[0]
    if(!menu?.active||!Array.isArray(ids)||ids.length!==2||new Set(ids).size!==2||!Array.isArray(line.selections)||!Number.isSafeInteger(line.qty)||line.qty<1||line.qty>1000000)throw new Error('Invalid multi-group line')
    const groups=Object.fromEntries(ids.map(id=>[id,c.groups[id]]))
    if(Object.values(groups).some(g=>!g?.active||g.max>3))throw new Error('Unsupported multi-group profile')
    const groupSelections=Object.fromEntries(ids.map(id=>[id,{_:0}])),quantities={_:0},seen=new Set()
    let extra=0
    for(const choice of line.selections){
      const g=groups[choice.groupId],a=c.addons[choice.id],qty=choice.selectionQty??1,key=JSON.stringify([choice.groupId,choice.id])
      if(!g||!a||a.active===false||!g.optionIds.includes(choice.id)||!Number.isSafeInteger(qty)||qty<1||qty>3||(!g.allowRepeat&&qty!==1)||seen.has(key))throw new Error('Invalid multi-group selection')
      seen.add(key);groupSelections[g.id][choice.id]=qty;quantities[choice.id]=(quantities[choice.id]||0)+qty
      if(g.pricingMode==='extra')extra+=(g.optionPrices[platform][choice.id]??c.addonPrices[platform][choice.id])*qty
    }
    for(const id of ids){const count=Object.values(groupSelections[id]).reduce((sum,q)=>sum+q,0),g=groups[id];if(count<g.min||count>g.max)throw new Error('Invalid group selection count')}
    return {menuId:line.menuId,qty:line.qty,optionIds:Object.keys(quantities).filter(id=>id!=='_'),optionQuantities:quantities,
      catalog:structuredClone(menu),groups:structuredClone(groups),groupSelections,note:line.note||'',totalCents:(menu.pricesCents[platform]+extra)*line.qty}
  })
  return preparedSale(summarySaleFromLines(shop,materials,canonical,options))
}
