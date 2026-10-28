export function receiptPackagePlan(receipt){
 const adjustments=receipt.billOperands?.packages||{},snapshots=receipt.billOperands?.packageSnapshots||{}
 return Object.entries(snapshots).map(([id,snapshot])=>{
  const row=receipt.inventory.find(r=>r.materialId===id),adjustment=adjustments[id],baselineQty=snapshot.baselineQuantity/100,requestedQty=(adjustment?.quantity??snapshot.baselineQuantity)/100
  return {materialId:id,materialName:snapshot.name,unit:snapshot.unit,baselineQty,requestedQty,adjustmentQty:Math.round((requestedQty-baselineQty)*100)/100,fulfilledQty:(row?.take||0)/100,shortageQty:(row?.shortage||0)/100,fulfilledCost:(row?.packagingCostCents||0)/100,expectedShortageCost:Math.round((row?.shortage||0)*snapshot.unitCost)/100,reason:adjustment?.reason||null,note:adjustment?.note||'',sources:[]}
 })
}
export const receiptExpectedPackageShortage=receipt=>Math.round(receiptPackagePlan(receipt).reduce((n,row)=>n+row.expectedShortageCost,0)*100)/100
