import {businessDateKey} from './businessDate'

const dayMs=86400000
const dayTime=key=>Date.parse(`${key}T00:00:00Z`)
const keyOf=date=>date.toISOString().slice(0,10)
export const money=value=>new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format(value || 0)
export const dateLabel=key=>key ? new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',year:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(`${key}T12:00:00+07:00`)) : 'ทั้งหมด'

export function dashboardRange(period,today=businessDateKey()) {
 if(period==='all') return {start:null,end:null}
 const days=period==='week'?7:period==='month'?30:1
 return {start:keyOf(new Date(dayTime(today)-(days-1)*dayMs)),end:today}
}
function metricsFor(orders){
 const sum=field=>orders.reduce((total,o)=>total+(Number(o[field]) || 0),0)
 const totalSales=sum('subtotal'),totalGp=sum('gpAmount'),totalFoodCost=sum('foodCost'),netRevenue=sum('netRevenue'),grossProfit=sum('grossProfit')
 const totalIngredientCost=orders.reduce((total,o)=>total+(Number(o.ingredientCost ?? o.foodCost) || 0),0)
 const totalPackagingCost=sum('packagingCost'),expectedPackagingShortageCost=sum('expectedPackagingShortageCost')
 const adjustmentMaterials=new Map(),adjustmentReasons=new Map(),shortageMaterials=new Map()
 for(const order of orders){
  for(const row of order.packagePlan || []) if(Number(row.adjustmentQty)){
   const key=row.materialId,entry=adjustmentMaterials.get(key)||{materialId:key,materialName:row.materialName||key,count:0,quantity:0}
   entry.count++;entry.quantity+=Number(row.adjustmentQty);adjustmentMaterials.set(key,entry)
   const reason=row.reason||'unknown',reasonEntry=adjustmentReasons.get(reason)||{reason,count:0,quantity:0}
   reasonEntry.count++;reasonEntry.quantity+=Number(row.adjustmentQty);adjustmentReasons.set(reason,reasonEntry)
  }
  for(const row of order.stockShortages || []) if(row.inventoryType==='packaging'){
   const key=row.materialId,entry=shortageMaterials.get(key)||{materialId:key,materialName:row.materialName||key,count:0,quantity:0}
   entry.count++;entry.quantity+=Number(row.qty)||0;shortageMaterials.set(key,entry)
  }
 }
 return {totalSales,totalGp,totalFoodCost,totalIngredientCost,totalPackagingCost,expectedPackagingShortageCost,packagingCostPerOrder:orders.length?totalPackagingCost/orders.length:0,packageAdjustments:[...adjustmentMaterials.values()].sort((a,b)=>Math.abs(b.quantity)-Math.abs(a.quantity)),adjustmentReasons:[...adjustmentReasons.values()].sort((a,b)=>b.count-a.count),packageShortages:[...shortageMaterials.values()].sort((a,b)=>b.quantity-a.quantity),netRevenue,grossProfit,orderCount:orders.length,avgOrderValue:orders.length?totalSales/orders.length:0,foodCostRatio:totalSales?totalFoodCost/totalSales*100:0,margin:netRevenue?grossProfit/netRevenue*100:0}
}
export function buildDashboard(source,range){
 let start=range.start,end=range.end || range.start
 if(start && end && start>end) [start,end]=[end,start]
 const orders=source.filter(o=>{const day=o.createdAt ? businessDateKey(o.createdAt) : '';return day && (!start || day>=start) && (!end || day<=end)}).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
 const first=start || (orders.length?businessDateKey(orders.at(-1).createdAt):null),last=end || (orders.length?businessDateKey(orders[0].createdAt):null)
 const span=first && last ? (dayTime(last)-dayTime(first))/dayMs+1 : 0
 const bucket=span>180?'month':span>60?'week':'day'
 const bucketKey=day=>bucket==='month'?`${day.slice(0,7)}-01`:bucket==='week'?keyOf(new Date(dayTime(first)+Math.floor((dayTime(day)-dayTime(first))/(7*dayMs))*7*dayMs)):day
 const grouped=new Map()
 if(first && last){
  let date=new Date(dayTime(bucketKey(first)))
  while(keyOf(date)<=last){
   grouped.set(keyOf(date),[])
   if(bucket==='month') date.setUTCMonth(date.getUTCMonth()+1)
   else date=new Date(date.getTime()+(bucket==='week'?7:1)*dayMs)
  }
 }
 const channels=new Map(),menus=new Map()
 for(const order of orders){
  grouped.get(bucketKey(businessDateKey(order.createdAt)))?.push(order)
  const id=order.platformId || order.platformName || 'unknown'
  if(!channels.has(id)) channels.set(id,{id,label:order.platformName || 'ไม่ระบุช่องทาง',orders:[]})
  channels.get(id).orders.push(order)
  for(const item of order.items || []){
   const menuId=item.menuId || item.menuName || 'custom'
   if(!menus.has(menuId)) menus.set(menuId,{id:menuId,label:item.menuName || 'รายการพิเศษ',qty:0})
   menus.get(menuId).qty+=Number(item.qty) || 0
  }
 }
 return {orders,metrics:metricsFor(orders),bucket,trend:[...grouped].map(([date,rows])=>({date,...metricsFor(rows)})),channels:[...channels.values()].map(({orders,...channel})=>({...channel,...metricsFor(orders)})).sort((a,b)=>b.totalSales-a.totalSales),menus:[...menus.values()].sort((a,b)=>b.qty-a.qty)}
}
