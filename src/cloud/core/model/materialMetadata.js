import { serverTimestamp } from 'firebase/firestore'

// Command planner. Quantities are hundredths of the existing base unit.
// Unit/type/cost/recipe/archive changes require their own certified commands.
export function validateMaterialMetadata(metadata){
  const keys=Object.keys(metadata||{})
  if(keys.length!==3||!keys.every(k=>['name','emoji','minAlertQ'].includes(k))||
    typeof metadata.name!=='string'||!metadata.name.trim()||metadata.name.length>160||
    typeof metadata.emoji!=='string'||metadata.emoji.length>32||
    !Number.isInteger(metadata.minAlertQ)||metadata.minAlertQ<0||metadata.minAlertQ>1000000000)throw new Error('Invalid material metadata')
}
export function summaryMaterialMetadata(shop,material,metadata,{opId='MATERIAL-METADATA',uid='cashier'}={}){
  if(material.deleted)throw new Error('Invalid material metadata')
  validateMaterialMetadata(metadata)
  return {
    nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'material_metadata'},
    next:{...structuredClone(material),...structuredClone(metadata),revision:material.revision+1,lastOpId:opId,lastOpKind:'material_metadata',lastOpIndex:0},
    operation:{schemaVersion:2,kind:'material_metadata',status:'committed',opId,uid,createdAt:serverTimestamp(),
      materialId:material.id,materialRevision:material.revision,shopRevision:shop.revision+1,metadata:structuredClone(metadata)},
  }
}
