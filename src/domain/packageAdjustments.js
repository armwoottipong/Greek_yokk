import {PACKAGE_ADJUSTMENT_REASONS} from './packageReasons.js'

// Build the whole replacement before the caller updates the cart.
export function planPackageAdjustments({changes,reason,note='',materials,baseline,adjustments}){
 const explanation=note.trim()
 if(!PACKAGE_ADJUSTMENT_REASONS.includes(reason))return {ok:false,message:'เลือกเหตุผลการปรับบรรจุภัณฑ์'}
 if(reason==='other'&&!explanation)return {ok:false,message:'ระบุเหตุผลเพิ่มเติม'}
 if(explanation.length>1000)return {ok:false,message:'เหตุผลเพิ่มเติมต้องไม่เกิน 1,000 ตัวอักษร'}

 const next=new Map(adjustments.map(row=>[row.materialId,row]))
 for(const {materialId,requestedQty} of changes){
  const material=materials.find(row=>row.id===materialId)
  if(!material||material.deleted||material.isDeleted||material.inventoryType!=='packaging')
   return {ok:false,message:'เลือกบรรจุภัณฑ์ที่พร้อมใช้งาน'}
  const cents=Math.round(requestedQty*100)
  if(!Number.isFinite(requestedQty)||!Number.isSafeInteger(cents)||requestedQty<0||Math.abs(requestedQty*100-cents)>0.000001)
   return {ok:false,message:'ตรวจจำนวนบรรจุภัณฑ์ให้ถูกต้อง'}
  const baselineQty=baseline.find(row=>row.materialId===materialId)?.baselineQty||0
  const deltaQty=(cents-Math.round(baselineQty*100))/100
  if(deltaQty===0)next.delete(materialId)
  else next.set(materialId,{materialId,deltaQty,reason,note:explanation})
 }
 return {ok:true,adjustments:[...next.values()]}
}
