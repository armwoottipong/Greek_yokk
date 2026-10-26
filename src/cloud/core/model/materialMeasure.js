import { serverTimestamp } from 'firebase/firestore'

const clone=value=>structuredClone(value)

// Planner for changing a material's measurement fields.
export function summaryMaterialMeasure(shop,material,measure,{opId='MATERIAL-MEASURE',uid='cashier'}={}){
  const fields=['unit','packSize','unitCost','packCostCents']
  if(!shop||!Array.isArray(shop.materialIds)||!material||typeof material.id!=='string'||!shop.materialIds.includes(material.id)||material.deleted===true||
    !measure||typeof measure!=='object'||Array.isArray(measure)||Object.keys(measure).length!==fields.length||!fields.every(key=>Object.hasOwn(measure,key)))throw new Error('Invalid material measurement state')
  if(typeof measure.unit!=='string'||!measure.unit.trim()||measure.unit.length>32||
    !Number.isInteger(measure.packSize)||measure.packSize<1||measure.packSize>10000000||
    !Number.isFinite(measure.unitCost)||measure.unitCost<0||measure.unitCost>100000||
    !Number.isInteger(measure.packCostCents)||measure.packCostCents<0||measure.packCostCents>1000000000)throw new Error('Invalid material measurement')
  const snapshot=clone(measure),kind='material_measure'
  return {
    next:{...clone(material),...snapshot,revision:material.revision+1,lastOpId:opId,lastOpKind:kind,lastOpIndex:0},
    nextShop:{...clone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:kind},
    operation:{schemaVersion:2,kind,status:'committed',opId,uid,createdAt:serverTimestamp(),materialId:material.id,materialRevision:material.revision,shopRevision:shop.revision+1,measure:snapshot},
  }
}
