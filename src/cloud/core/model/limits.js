export function maxSaleLines(shop){
 const count=shop?.catalog?.summaryMaterials?.length
 if(![15,16].includes(count))throw new Error('UNSUPPORTED_MATERIAL_PROFILE')
 // Rules final dependencies: all protected materials, paired price proofs,
 // root and receipt. Keep the whole atomic request within twenty documents.
 return Math.min(6,2*(18-count))
}
