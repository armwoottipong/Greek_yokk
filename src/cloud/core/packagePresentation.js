import {summaryMenuQuantity} from './model/recipe.js'
export function projectCloudPackages(data,lines,adjustments=[]){
 if(!data)return {items:[],issues:[]}
 const c=data.shop.catalog,items=[],issues=[]
 for(const material of data.materials.filter(m=>!m.deleted&&m.inventoryType==='packaging')){
  let baselineQ=0;const sources=[]
  for(const line of lines){
   const menu=c.menus[line.menuId];if(!menu)continue
   const add=(sourceType,sourceId,q,name)=>{if(q){baselineQ+=q;sources.push({sourceType,sourceId,sourceName:name,qty:q/100})}}
   add('menu',line.menuId,summaryMenuQuantity(menu,material)*line.qty,data.display.menus?.[line.menuId]?.name||menu.name||line.menuId)
   const options=line.selections||(line.optionIds||[]).map(id=>({id,selectionQty:1}))
   for(const choice of options){const addon=c.addons[choice.id];if(addon)add('addon',choice.id,(addon.recipe[material.id]||0)*(choice.selectionQty||1)*line.qty,data.display.addons?.[choice.id]?.name||addon.name||choice.id)}
  }
  const adjustment=adjustments.find(a=>a.materialId===material.id),baselineQty=baselineQ/100,delta=adjustment?.deltaQty||0,requestedQty=Math.round((baselineQty+delta)*100)/100
  if(requestedQty<0)issues.push({materialId:material.id,code:'NEGATIVE_PACKAGE_QUANTITY'})
  if(baselineQ||adjustment)items.push({materialId:material.id,materialName:material.name||material.id,unit:material.unit,baselineQty,adjustmentQty:delta,requestedQty,fulfilledQty:0,shortageQty:0,unitCost:material.unitCost,reason:adjustment?.reason||null,note:adjustment?.note||'',sources})
 }
 for(const a of adjustments)if(!data.materials.some(m=>m.id===a.materialId&&!m.deleted&&m.inventoryType==='packaging'))issues.push({materialId:a.materialId,code:'INVALID_PACKAGE_MATERIAL'})
 return {items,issues}
}
export function cloudPackageOperands(data,lines,adjustments){
 const plan=projectCloudPackages(data,lines,adjustments)
 if(plan.issues.length)throw Object.assign(new Error('INVALID_PACKAGE_ADJUSTMENT'),{code:'INVALID_PACKAGE_ADJUSTMENT'})
 return Object.fromEntries(adjustments.map(a=>{const row=plan.items.find(r=>r.materialId===a.materialId);return [a.materialId,{quantity:Math.round(row.requestedQty*100),reason:a.reason,note:a.note||''}]}))
}
