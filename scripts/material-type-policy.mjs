export const materialTypePolicy=String.raw`
 function materialTypeProofPath(s,g,id,i) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/operations/$(id)/referenceProofs/$('type'+string(i)); }
 function materialTypeProofs(s,g,id,start) {
  return getAfter(materialTypeProofPath(s,g,id,start)).data.opId==id && getAfter(materialTypeProofPath(s,g,id,start+1)).data.opId==id &&
   getAfter(materialTypeProofPath(s,g,id,start+2)).data.opId==id && getAfter(materialTypeProofPath(s,g,id,start+3)).data.opId==id &&
   getAfter(materialTypeProofPath(s,g,id,start+4)).data.opId==id && getAfter(materialTypeProofPath(s,g,id,start+5)).data.opId==id &&
   getAfter(materialTypeProofPath(s,g,id,start+6)).data.opId==id && getAfter(materialTypeProofPath(s,g,id,start+7)).data.opId==id;
 }
 function typeMenuProjection(c,old,id,type,i) {
  return i>=c.menuIds.size() || typeMenuProjectionData(c.menus[c.menuIds[i]],old.menus[c.menuIds[i]],id,type);
 }
 function typeMenuProjectionData(n,b,id,type) {
  let raw=b.get('rawRecipe',{});
  let include=raw.keys().hasAny([id]) && (b.get('hasPackage',true) || type!='packaging');
  let keys=b.recipe.keys().removeAll([id]).concat(include ? [id] : []);
  let used=include && raw[id]>0;
  return !raw.keys().hasAny([id]) ? n==b :
   n.diff(b).affectedKeys().hasOnly(['recipe','baseMaterialIds']) && n.recipe.keys().toSet()==keys.toSet() && n.recipe.diff(b.recipe).affectedKeys().hasOnly([id]) &&
   n.recipe.get(id,0)==(include ? raw[id] : 0) &&
   (!b.keys().hasAny(['baseMaterialIds']) ? !n.keys().hasAny(['baseMaterialIds']) :
    n.baseMaterialIds is list && n.baseMaterialIds.toSet().size()==n.baseMaterialIds.size() &&
    n.baseMaterialIds.toSet()==b.baseMaterialIds.removeAll([id]).concat(used ? [id] : []).toSet());
 }
 function materialTypeProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let old=get(rootPath(s)).data;
  let o=getAfter(operationPath(s,g,id)).data;
  return writable(s,g) && d.keys().hasOnly(['opId','index']) && d.opId==id && integer(d.index,0,15) && index=='type'+string(d.index) &&
   o.kind=='material_type' && o.uid==request.auth.uid && root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision &&
   typeMenuProjection(root.catalog,old.catalog,o.targetId,o.inventoryType,d.index*4) && typeMenuProjection(root.catalog,old.catalog,o.targetId,o.inventoryType,d.index*4+1) &&
   typeMenuProjection(root.catalog,old.catalog,o.targetId,o.inventoryType,d.index*4+2) && typeMenuProjection(root.catalog,old.catalog,o.targetId,o.inventoryType,d.index*4+3);
 }
 function materialTypeRoot(s) {
  let b=resource.data;
  let n=request.resource.data;
  let o=getAfter(operationPath(s,b.generation,n.lastOpId)).data;
  let m=getAfter(materialPath(s,b.generation,o.targetId)).data;
  return signedIn() && b.status=='active' && n.diff(b).affectedKeys().hasOnly(['catalog','catalogRevision','revision','lastOpId','lastOpKind']) &&
   n.catalog.diff(b.catalog).affectedKeys().hasOnly(['menus']) && n.catalog.menus.keys().toSet()==b.catalog.menus.keys().toSet() &&
   n.revision==b.revision+1 && n.catalogRevision==b.catalogRevision+1 && o.sourceCatalogRevision==b.catalogRevision && o.shopRevision==n.revision &&
   o.kind=='material_type' && o.opId==n.lastOpId && o.uid==request.auth.uid && n.lastOpKind==o.kind && o.targetId in b.materialIds && o.materialIds==[o.targetId] &&
   m.lastOpId==o.opId && m.lastOpKind==o.kind && m.revision==o.targetRevision+1 && m.inventoryType==o.inventoryType && materialTypeProofs(s,b.generation,o.opId,0);
 }
 function materialTypeOperation(s,g,id,o) {
  let root=rootAfter(s);
  let m=getAfter(materialPath(s,g,o.targetId)).data;
  return writable(s,g) && o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','targetId','targetRevision','previousType','inventoryType','sourceCatalogRevision','shopRevision','materialIds']) &&
   o.schemaVersion==2 && o.kind=='material_type' && o.status=='committed' && o.opId==id && o.uid==request.auth.uid && o.createdAt==request.time &&
   root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision && root.catalogRevision==o.sourceCatalogRevision+1 &&
   m.lastOpId==id && m.lastOpKind==o.kind && m.lastOpIndex==0 && m.revision==o.targetRevision+1 && m.inventoryType==o.inventoryType && materialTypeProofs(s,g,id,8);
 }
 function materialTypeMaterial(s,g,id) {
  let b=resource.data;
  let n=request.resource.data;
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,n.lastOpId)).data;
  return writable(s,g) && b.id==id && !b.deleted && id in root.materialIds && root.productionUsers[id]==[] && b.get('productionRecipe',{}).size()==0 &&
   o.kind=='material_type' && o.uid==request.auth.uid && o.targetId==id && o.targetRevision==b.revision && o.previousType==b.inventoryType &&
   o.inventoryType in ['ingredient','packaging'] && o.inventoryType!=b.inventoryType && n.inventoryType==o.inventoryType &&
   n.revision==b.revision+1 && n.lastOpIndex==0 && n.diff(b).affectedKeys().hasOnly(['inventoryType','revision','lastOpId','lastOpKind','lastOpIndex']);
 }
`;
