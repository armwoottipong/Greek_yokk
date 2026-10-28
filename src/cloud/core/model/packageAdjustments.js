import {PACKAGE_ADJUSTMENT_REASONS} from '../../../domain/packageReasons.js'
const fail=()=>Object.assign(new Error('INVALID_PACKAGE_ADJUSTMENT'),{code:'INVALID_PACKAGE_ADJUSTMENT'})
export function validateSalePackages(shop,materials,value={}){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype||Object.keys(value).length>16)throw fail()
 const result={}
 for(const [id,entry] of Object.entries(value)){
  const m=materials.find(m=>m.id===id)
  if(!shop.materialIds.includes(id)||!m||m.deleted||m.inventoryType!=='packaging'||!entry||Object.getPrototypeOf(entry)!==Object.prototype||Object.keys(entry).sort().join(',')!=='note,quantity,reason'||!Number.isSafeInteger(entry.quantity)||entry.quantity<0||entry.quantity>1e9||!PACKAGE_ADJUSTMENT_REASONS.includes(entry.reason)||typeof entry.note!=='string'||entry.note.length>1000||entry.note!==entry.note.trim()||entry.reason==='other'&&!entry.note)throw fail()
  result[id]={quantity:entry.quantity,reason:entry.reason,note:entry.note}
 }
 return result
}
