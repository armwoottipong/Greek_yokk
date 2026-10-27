// Reviewed extension to the frozen prepared-policy experiment. These helpers
// are selected only by deletion matches; they do not widen sale/cancel closure.
export const inventoryDeletePolicy=`
 function materialDeleteEligible(root,m,id) {
  return id in root.materialIds && !(id in root.catalog.summaryMaterials) && m.id==id && m.deleted==true &&
   m.stock==0 && m.lotQty.values().hasOnly([0]) && root.productionUsers[id]==[] &&
   m.get('productionRecipe',{}).size()==0 && m.recipeIndex.catalogRevision==root.catalogRevision &&
   m.recipeIndex.quantities.hasOnly([0]) && m.recipeIndex.menus.values().hasOnly([0]) && m.recipeIndex.addons.values().hasOnly([0]);
 }
 function materialDeleteCommit(s,g,id,o,b,n,m) {
  return signedIn() && b.status=='active' && b.generation==g &&
   o.keys().hasAll(['schemaVersion','kind','status','opId','uid','createdAt','materialId','materialRevision','shopRevision','materialSnapshot']) &&
   o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','materialId','materialRevision','shopRevision','materialSnapshot']) &&
   o.schemaVersion==2 && o.kind=='material_delete' && o.status=='committed' && o.opId==id && o.uid==request.auth.uid && o.createdAt==request.time &&
   o.materialRevision==m.revision && o.materialSnapshot==m && materialDeleteEligible(b,m,o.materialId) &&
   n.diff(b).affectedKeys().hasOnly(['materialIds','productionUsers','nextMaterialCostRank','revision','lastOpId','lastOpKind']) &&
   n.revision==b.revision+1 && n.revision==o.shopRevision && n.lastOpId==id && n.lastOpKind=='material_delete' &&
   n.materialIds==b.materialIds.removeAll([o.materialId]) &&
   n.productionUsers.diff(b.productionUsers).affectedKeys().hasOnly([o.materialId]) && n.productionUsers.keys().toSet()==n.materialIds.toSet() &&
   n.nextMaterialCostRank==b.get('nextMaterialCostRank',b.materialIds.size()) &&
   integer(n.nextMaterialCostRank,b.materialIds.size(),9007199254740991) && n.nextMaterialCostRank>m.costRank &&
   !existsAfter(materialPath(s,g,o.materialId)) && !exists(operationPath(s,g,id));
 }
 function materialDeleteRoot(s) {
  let b=resource.data;
  let n=request.resource.data;
  let o=getAfter(operationPath(s,b.generation,n.lastOpId)).data;
  let m=get(materialPath(s,b.generation,o.materialId)).data;
  return materialDeleteCommit(s,b.generation,n.lastOpId,o,b,n,m);
 }
 function materialDeleteOperation(s,g,id,o) {
  let b=get(rootPath(s)).data;
  let n=rootAfter(s);
  let m=get(materialPath(s,g,o.materialId)).data;
  return materialDeleteCommit(s,g,id,o,b,n,m);
 }
 function materialDeleteMaterial(s,g,id) {
  let b=get(rootPath(s)).data;
  let n=rootAfter(s);
  let o=getAfter(operationPath(s,g,n.lastOpId)).data;
  return o.materialId==id && materialDeleteCommit(s,g,n.lastOpId,o,b,n,resource.data);
 }
`
