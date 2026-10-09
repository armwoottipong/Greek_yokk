import { clone } from './database'
import { businessDateKey } from './businessDate'
const round=n=>Math.round(n*100)/100
export const isExpiredOn=(expiryDate,businessDate=businessDateKey(new Date()))=>!!expiryDate&&expiryDate<businessDate
export function aggregateRequirements(requirements) {
  const quantities=new Map()
  for(const r of requirements) {
    if(!r?.materialId||!Number.isFinite(Number(r.qty))||Number(r.qty)<0)throw new Error('สูตรวัตถุดิบไม่ถูกต้อง')
    quantities.set(r.materialId,round((quantities.get(r.materialId)||0)+Number(r.qty)))
  }
  return [...quantities].map(([materialId,qty])=>({materialId,qty})).filter(r=>r.qty>0)
}
export function getEffectiveRequirements(menu,addons=[],qty=1,materials=[]) {
  if(!Number.isFinite(qty)||qty<=0)throw new Error('จำนวนสั่งซื้อไม่ถูกต้อง')
  const recipe=(menu.recipe||[]).filter(r=>menu.hasPackage!==false||materials.find(m=>m.id===r.materialId)?.category!=='Packaging')
  return aggregateRequirements([...recipe.map(r=>({...r,qty:Number(r.qty)*qty})),...addons.filter(a=>a.materialId).map(a=>({materialId:a.materialId,qty:Number(a.amountUsed||0)*qty}))])
}
export function allocateInventory(materials,requirements,{businessDate=businessDateKey(new Date()),allowShortage=false}={}) {
  const next=clone(materials),allocations=[],shortages=[],issues=[]
  let required
  try{required=aggregateRequirements(requirements)}catch(error){return {ok:false,code:'INVALID_REQUIREMENTS',issues:[{message:error.message}]}}
  for(const {materialId,qty} of required) {
    const mat=next.find(m=>m.id===materialId)
    if(!mat||mat.isDeleted){issues.push({materialId,code:!mat?'MISSING_MATERIAL':'ARCHIVED_MATERIAL',needed:qty});continue}
    let remaining=qty
    const lots=(mat.lots||[]).filter(l=>l.qty>0&&!isExpiredOn(l.expiryDate,businessDate)).sort((a,b)=>Number(b.isInUse)-Number(a.isInUse)||(a.expiryDate||'9999').localeCompare(b.expiryDate||'9999')||(a.receiveDate||'').localeCompare(b.receiveDate||''))
    for(const lot of lots){const take=Math.min(lot.qty,remaining);if(take>0){lot.qty=round(lot.qty-take);remaining=round(remaining-take);allocations.push({materialId,lotId:lot.id,qty:take})}}
    if(remaining>0) {
      const expired=(mat.lots||[]).some(l=>l.qty>0&&isExpiredOn(l.expiryDate,businessDate))
      if(expired||!allowShortage)issues.push({materialId,name:mat.name,emoji:mat.emoji,unit:mat.unit,stock:round(qty-remaining),needed:qty,code:expired?'EXPIRED_MATERIAL':'SHORTAGE'})
      else shortages.push({materialId,qty:remaining})
    }
    mat.stock=round((mat.lots||[]).reduce((sum,l)=>sum+Number(l.qty),0))
    for(const lot of mat.lots||[])lot.isInUse=false
    const active=lots.find(l=>l.qty>0);if(active){active.isInUse=true;mat.lastStockInDate=active.receiveDate||null;mat.expiryDate=active.expiryDate||null}
  }
  return issues.length?{ok:false,code:'INVENTORY_UNAVAILABLE',issues}:{ok:true,materials:next,allocations,shortages}
}
export function rebaseInventoryDraft(base,draft,committed) {
  const next=clone(committed),issues=[]
  for(const original of base) {
    const working=draft.find(m=>m.id===original.id),target=next.find(m=>m.id===original.id)
    if(!working||!target){if(JSON.stringify(original)!==JSON.stringify(working))issues.push(original.id);continue}
    for(const lot of working.lots||[]) {
      const old=original.lots?.find(l=>l.id===lot.id),current=target.lots?.find(l=>l.id===lot.id)
      if(!old){target.lots.push(clone(lot));continue}
      const delta=round(lot.qty-old.qty)
      if(!current||current.qty+delta<0){issues.push(original.id);continue}
      current.qty=round(current.qty+delta)
      if(lot.isInUse!==old.isInUse){target.lots.forEach(l=>{l.isInUse=l.id===lot.id&&lot.isInUse})}
    }
    for(const k of ['unitCost','packCost','expiryDate','lastStockInDate'])if(working[k]!==original[k])target[k]=working[k]
    target.stock=round(target.lots.reduce((sum,l)=>sum+l.qty,0))
  }
  return issues.length?{ok:false,issues}:{ok:true,materials:next}
}
