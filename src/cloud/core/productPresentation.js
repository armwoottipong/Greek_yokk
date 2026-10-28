import {receiptPackagePlan,receiptExpectedPackageShortage} from './packageReceipt.js'
// Read-only views of canonical cloud quantities and prices for the original UI.
export function projectMenus(data){
 const c=data?.shop.catalog
 return Object.values(c?.menus||{}).filter(m=>m.active).map(m=>({id:m.id,...data.display.menus?.[m.id],name:data.display.menus?.[m.id]?.name||m.id,isActive:true,hasAddons:!!(m.groupIds?.length||m.groupId||m.optionIds?.length),prices:Object.fromEntries(Object.entries(m.pricesCents).map(([id,v])=>[id,v/100]))}))
}
export function optionCents(data,menu,group,id,platform){
 const c=data.shop.catalog
 if(group?.pricingMode==='included')return 0
 const prices=group?group.optionPrices?.[platform]:menu.priceMode==='addon'?c.addonPrices?.[platform]:menu.optionPrices?.[platform]
 return prices?.[id]??c.addonPrices?.[platform]?.[id]??0
}
export function projectCart(lines,data){
 if(!data)return []
 const menus=projectMenus(data),c=data.shop.catalog
 return lines.map(line=>{
  const m=c.menus[line.menuId]||{},choices=line.selections||[...new Set(line.optionIds||[])].map(id=>({id,groupId:m.groupId,selectionQty:line.optionIds.filter(v=>v===id).length}))
  return {menu:menus.find(m=>m.id===line.menuId)||{id:line.menuId,...data.display.menus?.[line.menuId],name:data.display.menus?.[line.menuId]?.name||m.name||line.menuId,prices:Object.fromEntries(Object.entries(m.pricesCents||{}).map(([id,v])=>[id,v/100]))},qty:line.qty,note:line.note,selectedAddons:choices.map(s=>({id:s.id,...data.display.addons?.[s.id],groupId:s.groupId,groupName:c.groups?.[s.groupId]?.name,selectionQty:s.selectionQty||1,prices:Object.fromEntries(Object.keys(m.pricesCents).map(p=>[p,optionCents(data,m,c.groups?.[s.groupId],s.id,p)/100]))}))}
 })
}
const date=day=>Number.isInteger(day)&&day>=0&&day<999999?new Date(day*86400000).toISOString().slice(0,10):''
export function projectMaterial(m){
 return {...m,stock:m.stock/100,minAlert:(m.minAlertQ||0)/100,packCost:(m.packCostCents||0)/100,isDeleted:!!m.deleted,hasSubRecipe:!!m.productionRecipe,yieldQty:(m.productionRecipe?.yieldQ||0)/100,subRecipe:m.productionRecipe?.inputIds?.map((materialId,i)=>({materialId,qty:m.productionRecipe.quantities[i]/100}))||[],lastStockInDate:date(m.lastStockInDay),expiryDate:date(m.expiryDay),lots:(m.lotIds||[]).map(id=>({...m.lots[id],id,qty:(m.lotQty?.[id]??m.lots[id].qty)/100,isInUse:id===m.activeLotId||(m.zeroActiveIds||[]).includes(id),receiveDate:date(m.lots[id].receiveDay),expiryDate:date(m.lots[id].expiryDay)}))}
}

export function projectReceipt(receipt,data){
 if(receipt.origin==='legacy'&&receipt.sourceLegacyJson){const original=JSON.parse(receipt.sourceLegacyJson);return {...original,orderId:receipt.opId,status:receipt.status,sourceLegacyId:receipt.sourceLegacyId}}
 const p=receipt.platformId,lines=receipt.lines||[]
 const projected=projectCart(lines.map(l=>({menuId:l.menuId,qty:l.qty,note:l.note,...(l.groupSelections?{selections:Object.entries(l.groupSelections).flatMap(([groupId,options])=>Object.entries(options).filter(([id,q])=>id!=='_'&&q>0).map(([id,selectionQty])=>({id,groupId,selectionQty})))}:{optionIds:l.optionIds?.flatMap(id=>Array(l.optionQuantities?.[id]||1).fill(id))||[]})})),data)
 const timestamp=receipt.createdAt
 return {packagePlan:receiptPackagePlan(receipt),expectedPackagingShortageCost:receiptExpectedPackageShortage(receipt),orderId:receipt.opId,createdAt:timestamp?.seconds?new Date(timestamp.seconds*1000).toISOString():typeof timestamp==='string'?timestamp:'',platformName:data.display.platforms?.[p]?.name||p,subtotal:(receipt.subtotalCents||0)/100,gpAmount:(receipt.gpCents||0)/100,netRevenue:(receipt.netCents??receipt.subtotalCents??0)/100,ingredientCost:(receipt.ingredientCostCents||0)/100,packagingCost:(receipt.packagingCostCents||0)/100,foodCost:((receipt.ingredientCostCents||0)+(receipt.packagingCostCents||0))/100,items:projected.map((item,i)=>({menuName:item.menu.name,qty:item.qty,note:item.note,totalPrice:lines[i].totalCents/100,selectedAddons:item.selectedAddons.map(a=>({...a,price:a.prices[p]}))})),stockShortages:(receipt.inventory||[]).filter(row=>row.shortage>0).map(row=>{const m=data.materials.find(m=>m.id===row.materialId);return {materialId:row.materialId,materialName:m?.name||row.materialId,unit:m?.unit||'',inventoryType:m?.inventoryType,qty:row.shortage/100}})}
}
