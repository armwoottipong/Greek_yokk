import { serverTimestamp } from 'firebase/firestore'

export const materialDetailFields=['category','packUnit','shelfLifeDays','isSubIngredient']
export function materialDetailsSnapshot(material){
  return Object.fromEntries(materialDetailFields.filter(key=>Object.hasOwn(material,key)).map(key=>[key,structuredClone(material[key])]))
}
export function validateMaterialDetails(details){
  if(!details||typeof details!=='object'||Array.isArray(details))throw new Error('Invalid material details')
  const keys=Object.keys(details)
  if(keys.length<1||!keys.every(key=>materialDetailFields.includes(key))||
    keys.includes('category')&&details.category!==null&&(typeof details.category!=='string'||details.category.length>160)||
    keys.includes('packUnit')&&details.packUnit!==null&&(typeof details.packUnit!=='string'||details.packUnit.length>32)||
    keys.includes('shelfLifeDays')&&details.shelfLifeDays!==null&&(!Number.isFinite(details.shelfLifeDays)||details.shelfLifeDays<0||details.shelfLifeDays>100000)||
    keys.includes('isSubIngredient')&&typeof details.isSubIngredient!=='boolean')throw new Error('Invalid material details')
}
// Test-only optional metadata patch. Presence and explicit null are independent.
export function summaryMaterialDetails(shop,material,details,{opId='MATERIAL-DETAILS',uid='cashier'}={}){
  validateMaterialDetails(details)
  if(material.deleted||!shop.materialIds?.includes(material.id)||!Object.keys(details).some(key=>!Object.hasOwn(material,key)||material[key]!==details[key]))throw new Error('Invalid or unchanged material details')
  return {
    nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'material_details'},
    next:{...structuredClone(material),...structuredClone(details),revision:material.revision+1,lastOpId:opId,lastOpKind:'material_details',lastOpIndex:0},
    operation:{schemaVersion:2,kind:'material_details',status:'committed',opId,uid,createdAt:serverTimestamp(),materialId:material.id,
      materialRevision:material.revision,shopRevision:shop.revision+1,beforeDetails:materialDetailsSnapshot(material),details:structuredClone(details)},
  }
}
