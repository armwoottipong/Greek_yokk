// Core v1 planner. Rules independently validate every persisted result.
import { lineOperands } from './lineOperands.js'
import { addonOperands } from './addonOperands.js'
import { serverTimestamp } from 'firebase/firestore'
import { allocateInventory } from '../../../domain/inventory.js'
import { decodeSummaryMaterial } from './material.js'
import { summaryMenuQuantity } from './recipe.js'
import { maxSaleLines } from './limits.js'

// Canonical core sale planner; the server independently validates its output.
export function summarySale(shop,materials,lines,{platformId='P',opId='SUMMARY-SALE',uid='cashier'}={}) {
  const c=shop.catalog,p=c.platforms[platformId]
  if(!p?.active||lines.length<1||lines.length>6)throw new Error('Unsupported sale')
  const orderLines=lines.map(line=>{
    const menu=c.menus[line.menuId],ids=line.optionIds||[],group=menu?.groupId?c.groups?.[menu.groupId]:null,choices=group||menu
    if(!menu?.active||(menu.groupId&&!group?.active)||!Number.isSafeInteger(line.qty)||line.qty<1||line.qty>1000000||ids.length>11||ids.length<choices.min||ids.length>choices.max||(!group?.allowRepeat&&new Set(ids).size!==ids.length)||ids.some(id=>!choices.optionIds.includes(id)||c.addons[id]?.active===false))throw new Error('Invalid line')
    const prices=group?group.optionPrices[platformId]:menu.priceMode==='addon'?c.addonPrices[platformId]:menu.optionPrices[platformId]
    const extra=ids.reduce((sum,id)=>sum+(group?.pricingMode==='included'?0:group?(Object.hasOwn(prices,id)?prices[id]:c.addonPrices[platformId][id]):prices[id]),0)
    return {menuId:line.menuId,qty:line.qty,optionIds:[...new Set(ids)],optionQuantities:{_:0,...Object.fromEntries([...new Set(ids)].map(id=>[id,ids.filter(key=>key===id).length]))},catalog:structuredClone(menu),group:structuredClone(group||{}),note:line.note||'',
      totalCents:(menu.pricesCents[platformId]+extra)*line.qty}
  })
  return summarySaleFromLines(shop,materials,orderLines,{platformId,opId,uid})
}

// Shared allocation engine. Every canonical line is still proved by Rules.
export function summarySaleFromLines(shop,materials,orderLines,{platformId='P',opId='SUMMARY-SALE',uid='cashier'}={}){
  if(orderLines.length>maxSaleLines(shop))throw Object.assign(new Error('SALE_LINE_LIMIT'),{code:'SALE_LINE_LIMIT'})
  const c=shop.catalog,p=c.platforms[platformId]
  if(!p?.active||orderLines.length<1||orderLines.length>6)throw new Error('Unsupported sale')
  const operands=addonOperands(orderLines,c)
  const touched=c.summaryMaterials.map(id=>{
    const m=materials.find(m=>m.id===id)
    if(!m||m.recipeIndex.catalogRevision!==shop.catalogRevision)throw new Error('Stale material recipe')
    return m
  })
  const needs=touched.map(m=>orderLines.reduce((sum,l)=>sum+(summaryMenuQuantity(c.menus[l.menuId],m)+l.optionIds.reduce((n,key)=>n+(c.addons[key].recipe[m.id]||0)*l.optionQuantities[key],0))*l.qty,0))
  if(needs.some(n=>!Number.isSafeInteger(n)||n<0||n>1e9))throw new Error('Unsupported required quantity')
  const dayDate=d=>d===999999?null:new Date(d*86400000).toISOString().slice(0,10)
  const domain=touched.map(m=>{
    const decoded=decodeSummaryMaterial(m)
    return {...decoded,stock:m.stock/100,lots:m.lotIds.map(id=>({...decoded.lots[id],qty:m.lotQty[id]/100,
      receiveDate:dayDate(m.lots[id].receiveDay),expiryDate:dayDate(m.lots[id].expiryDay)}))}
  })
  const requirements=type=>touched.flatMap((m,i)=>m.inventoryType===type&&needs[i]>0?[{materialId:m.id,qty:needs[i]/100}]:[])
  const ingredients=allocateInventory(domain,requirements('ingredient'),{allowShortage:true})
  if(!ingredients.ok)throw new Error('Invalid ingredient allocation')
  const allocation=allocateInventory(ingredients.materials,requirements('packaging'),{allowShortage:true,expiredAsShortage:true})
  if(!allocation.ok)throw new Error('Invalid packaging allocation')
  const order={...lineOperands(orderLines),schemaVersion:2,kind:'sale_set',status:'committed',opId,uid,createdAt:serverTimestamp(),lines:orderLines,
    materialIds:[...c.summaryMaterials],inventory:[],approvedShortages:{},platformId,platformRevision:p.revision,
    subtotalCents:orderLines.reduce((sum,l)=>sum+l.totalCents,0),shopRevision:shop.revision+1,lineWitnessCount:Math.ceil(orderLines.length/2),...operands}
  let ingredientBalance=0,packagingBalance=0
  const nextMaterials=touched.map((m,i)=>{
    const next=allocation.materials.find(item=>item.id===m.id),needed=needs[i]
    const lotQty=needed===0?structuredClone(m.lotQty):{_:0,...Object.fromEntries(m.lotIds.map(id=>[id,Math.round(next.lots.find(l=>l.id===id).qty*100)]))}
    const take=m.stock-Math.round(next.stock*100),shortage=needed-take
    const ingredientCostBaht=m.inventoryType==='ingredient'?(needed/100)*m.unitCost:0
    const packagingCostCents=m.inventoryType==='packaging'?Math.round(((take/100)*m.unitCost)*100):0
    order.inventory.push({materialId:m.id,revision:m.revision,costRank:m.costRank,needed,take,shortage,ingredientCostBaht,packagingCostCents,
      lotIds:[...m.allocationIds],lotTakes:Array.from({length:4},(_,j)=>m.allocationIds[j]?m.lotQty[m.allocationIds[j]]-lotQty[m.allocationIds[j]]:0)})
    order.approvedShortages[m.id]=shortage
    ingredientBalance+=ingredientCostBaht;packagingBalance+=packagingCostCents
    const active=needed===0?m.activeLotId:next.lots.find(l=>l.qty>0&&l.isInUse)?.id||''
    return {...structuredClone(m),stock:m.stock-take,lotQty,zeroActiveIds:needed===0?[...m.zeroActiveIds]:[],activeLotId:active,
      lastStockInDay:needed>0&&active?m.lots[active].receiveDay:m.lastStockInDay,expiryDay:needed>0&&active?m.lots[active].expiryDay:m.expiryDay,
      revision:m.revision+1,lastOpId:opId,lastOpKind:'sale_set',lastOpIndex:i}
  })
  order.gpCents=Math.round(order.subtotalCents*p.gpBasisPoints/10000);order.netCents=order.subtotalCents-order.gpCents
  order.ingredientCostCents=Math.round(ingredientBalance*100);order.packagingCostCents=packagingBalance
  order.grossProfitCents=order.netCents-order.ingredientCostCents-order.packagingCostCents
  return {shop,materials,order,nextMaterials,nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'sale_set'}}
}
