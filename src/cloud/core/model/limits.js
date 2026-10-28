export function maxSaleLines(shop){
 const ids=shop?.catalog?.summaryMaterials,count=ids?.length
 if(!Array.isArray(ids)||count>16)throw new Error('UNSUPPORTED_MATERIAL_PROFILE')
 // Rules final dependencies: all protected materials, paired price proofs,
 // root and receipt. Keep the whole atomic request within twenty documents.
 return Math.min(6,2*(18-count))
}
