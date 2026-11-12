import {businessDateKey} from '../../domain/businessDate.js'

export const PREORDER_LIMIT=24
export const PREORDER_ID=/^ENTRY-PRE-(\d{1,16})-[a-f0-9-]{36}$/
const scheduledSale=/^(ENTRY-PRE-\d{1,16}-[a-f0-9-]{36})_[a-f0-9-]{36}$/
const dailySale=/^ENTRY-(\d{5})-[a-f0-9-]{36}$/
const backdatedSale=/^ENTRY-BACK-(\d{5})-[a-f0-9-]{36}$/
const dayMs=86400000
export const FIRST_ENTRY_DAY='1970-01-01'
export const LAST_BACKDATED_DAY=99999

export function businessDay(date=businessDateKey()){
 const ms=Date.parse(date+'T00:00:00Z')
 return Number.isFinite(ms)&&new Date(ms).toISOString().slice(0,10)===date ? ms/dayMs : NaN
}
export const dayKey=day=>new Date(day*dayMs).toISOString().slice(0,10)
export const monthOf=date=>`${date.slice(0,7)}-01`
export function offsetMonth(month,offset){
 const date=new Date(`${month}T00:00:00Z`)
 date.setUTCMonth(date.getUTCMonth()+offset)
 return date.toISOString().slice(0,10)
}
export const scheduledOrderId=id=>scheduledSale.exec(id)?.[1]
export const backdatedPrefix=day=>`ENTRY-BACK-${String(day).padStart(5,'0')}-`
export function backdatedSaleDay(id){
 const day=backdatedSale.exec(id)?.[1]
 return day===undefined?null:dayKey(Number(day))
}
export const isOrderEntry=id=>dailySale.test(id)||scheduledSale.test(id)||backdatedSale.test(id)

export function consumePreorder(shop,nextShop,opId,today=businessDay()){
 const id=scheduledOrderId(opId)
 if(!id){
  const day=dailySale.exec(opId)?.[1]
  const past=backdatedSale.exec(opId)?.[1]
  if(day&&Number(day)!==today||past&&Number(past)>=today)throw Object.assign(new Error('ORDER_ENTRY_DAY_CHANGED'),{code:'ORDER_ENTRY_DAY_CHANGED'})
  return nextShop
 }
 const schedule=shop.preorders?.[id]
 if(!schedule)throw Object.assign(new Error('PREORDER_NO_LONGER_PENDING'),{code:'PREORDER_NO_LONGER_PENDING'})
 if(schedule.pickupDay>today)throw Object.assign(new Error('PREORDER_NOT_DUE'),{code:'PREORDER_NOT_DUE'})
 const preorders={...shop.preorders}
 delete preorders[id]
 return {...nextShop,preorders}
}

export function scheduledSummary(preorders){
 const orders=Object.entries(preorders||{}).map(([id,row])=>({...row,id})).sort((a,b)=>a.pickupDay-b.pickupDay)
 return {orders,subtotalCents:orders.reduce((total,row)=>total+row.quoteCents,0)}
}
