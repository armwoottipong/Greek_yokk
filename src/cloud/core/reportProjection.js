import {encodeLegacyId} from '../paths.js'
const fail=code=>{throw Object.assign(new Error(code),{code})}
const dateKey=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T00:00:00Z'))&&new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value
export function reportRangeBounds(range){
 let start=range?.start??null,end=range?.end??start
 if(start===null&&end===null)return {start:null,end:null,startMs:null,endMs:null}
 if(!dateKey(start)||!dateKey(end))fail('REPORT_INVALID_RANGE')
 if(start>end)[start,end]=[end,start]
 const startMs=Date.parse(start+'T00:00:00+07:00'),endMs=Date.parse(end+'T00:00:00+07:00')+86400000
 if(endMs>Date.parse('9999-12-31T23:59:59Z'))fail('REPORT_INVALID_RANGE')
 return {start,end,startMs,endMs}
}
function iso(value){
 const ms=value?.toMillis?value.toMillis():Number.isFinite(value?.seconds)?value.seconds*1000+(value.nanoseconds||0)/1e6:typeof value==='number'?value:Date.parse(value)
 if(!Number.isFinite(ms))fail('REPORT_INVALID_DATA')
 return new Date(ms).toISOString()
}
const financial=['subtotalCents','gpCents','netCents','ingredientCostCents','packagingCostCents','grossProfitCents']
function nativeOrder(o,data){
 if(!['committed','cancelled'].includes(o.status)||!o.opId||financial.some(k=>!Number.isSafeInteger(o[k]))||['subtotalCents','gpCents','ingredientCostCents','packagingCostCents'].some(k=>o[k]<0)||o.netCents!==o.subtotalCents-o.gpCents||o.grossProfitCents!==o.netCents-o.ingredientCostCents-o.packagingCostCents||!Array.isArray(o.lines)||!o.lines.length||o.lines.some(l=>!Number.isSafeInteger(l.qty)||l.qty<1||!Number.isSafeInteger(l.totalCents))||o.lines.reduce((n,l)=>n+l.totalCents,0)!==o.subtotalCents)fail('REPORT_INVALID_DATA')
 const items=o.lines.map(l=>{
  const choices=l.groupSelections?Object.entries(l.groupSelections).flatMap(([groupId,q])=>Object.entries(q).filter(([id,v])=>id!=='_'&&v>0).map(([id,selectionQty])=>({id,groupId,selectionQty}))):(l.optionIds||[]).map(id=>({id,selectionQty:l.optionQuantities?.[id]||1}))
  return {menuId:l.menuId,menuName:l.catalog?.name||`${data.display.menus?.[l.menuId]?.name||l.menuId} (ชื่อปัจจุบัน)`,qty:l.qty,note:l.note||'',totalPrice:l.totalCents/100,selectedAddons:choices.map(s=>{
   const group=s.groupId?l.groups?.[s.groupId]:l.group?.id?l.group:null,prices=group?.optionPrices?.[o.platformId]||((l.catalog?.priceMode==='override')?l.catalog.optionPrices?.[o.platformId]:null)
   const cents=group?.pricingMode==='included'?0:prices?.[s.id]
   return {...s,name:data.display.addons?.[s.id]?.name||s.id,groupName:group?.name,price:Number.isSafeInteger(cents)?cents/100:null}
  })}
 })
 return {reportKey:`firebase:${o.opId}`,orderId:o.opId,status:o.status,createdAt:iso(o.createdAt),platformId:o.platformId,platformName:data.display.platforms?.[o.platformId]?.name||o.platformId,
  subtotal:o.subtotalCents/100,gpAmount:o.gpCents/100,netRevenue:o.netCents/100,ingredientCost:o.ingredientCostCents/100,packagingCost:o.packagingCostCents/100,foodCost:(o.ingredientCostCents+o.packagingCostCents)/100,grossProfit:o.grossProfitCents/100,items,
  shortageCostRecorded:!(o.inventory||[]).some(r=>r.shortage>0),stockShortages:(o.inventory||[]).filter(r=>r.shortage>0).map(r=>{const m=data.materials.find(m=>m.id===r.materialId);return {materialId:r.materialId,materialName:m?.name||r.materialId,unit:m?.unit||'',qty:r.shortage/100,inventoryType:'unknown'}})}
}
function normalizedId(id,kind,data){
 if(typeof id!=='string'||!id)return id
 const known=data.display[kind]||{},catalog=data.shop.catalog[kind]||{}
 if(known[id]||catalog[id])return id
 const encoded=encodeLegacyId(id)
 return known[encoded]||catalog[encoded]?encoded:id
}
export function projectReportOrders({receipts=[],legacyOrders=[]},data){
 return [...receipts.map(o=>nativeOrder(o,data)),...legacyOrders.map((o,index)=>{
  if(!o||typeof o!=='object'||Array.isArray(o))fail('REPORT_INVALID_DATA')
  if(o.status!=='cancelled'&&['subtotal','gpAmount','netRevenue','foodCost','grossProfit'].some(k=>o[k]===null||o[k]===undefined||!Number.isFinite(Number(o[k]))))fail('REPORT_INVALID_DATA')
  return {...o,reportKey:`legacy:${index}`,createdAt:iso(o.createdAt),platformId:normalizedId(o.platformId,'platforms',data),items:(o.items||[]).map(i=>({...i,menuId:normalizedId(i.menuId,'menus',data)}))}
 })]
}
