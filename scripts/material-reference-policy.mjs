export const materialReferencePolicy=String.raw`
 function materialReferencePath(s,g,id,index) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/materialReferences/$(id)/parts/$(string(index)); }
 function materialReferenceAt(c,id,i) {
  let ids=i<64 ? c.menuIds : c.addonIds;
  let slot=i<64 ? i : i-64;
  return slot>=ids.size() || !(id in (i<64 ? c.menus[ids[slot]].get('rawRecipe',c.menus[ids[slot]].recipe) : c.addons[ids[slot]].recipe));
 }
 function materialReferenceWrite(s,g,id,index,d) {
  let root=get(rootPath(s)).data;
  return active(s,g) && d.keys().hasOnly(['opId','index','uid','sourceRevision','kind','materialId']) &&
   d.opId==id && d.uid==request.auth.uid && integer(d.index,0,7) && index==string(d.index) && d.sourceRevision==root.revision &&
   d.kind in ['material_archive','material_delete'] && d.materialId in root.materialIds && !exists(operationPath(s,g,id)) &&
   materialReferenceAt(root.catalog,d.materialId,d.index*16+0) && materialReferenceAt(root.catalog,d.materialId,d.index*16+1) && materialReferenceAt(root.catalog,d.materialId,d.index*16+2) && materialReferenceAt(root.catalog,d.materialId,d.index*16+3) && materialReferenceAt(root.catalog,d.materialId,d.index*16+4) && materialReferenceAt(root.catalog,d.materialId,d.index*16+5) && materialReferenceAt(root.catalog,d.materialId,d.index*16+6) && materialReferenceAt(root.catalog,d.materialId,d.index*16+7) && materialReferenceAt(root.catalog,d.materialId,d.index*16+8) && materialReferenceAt(root.catalog,d.materialId,d.index*16+9) && materialReferenceAt(root.catalog,d.materialId,d.index*16+10) && materialReferenceAt(root.catalog,d.materialId,d.index*16+11) && materialReferenceAt(root.catalog,d.materialId,d.index*16+12) && materialReferenceAt(root.catalog,d.materialId,d.index*16+13) && materialReferenceAt(root.catalog,d.materialId,d.index*16+14) && materialReferenceAt(root.catalog,d.materialId,d.index*16+15);
 }
 function materialReferencePart(s,g,o,revision,i) {
  let d=get(materialReferencePath(s,g,o.opId,i)).data;
  return d.opId==o.opId && d.index==i && d.uid==o.uid && d.sourceRevision==revision-1 && d.kind==o.kind && d.materialId==o.materialId;
 }
 function materialReferenceProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,id)).data;
  return writable(s,g) && index=='0' && d.keys().hasOnly(['opId']) && d.opId==id && o.uid==request.auth.uid &&
   o.kind in ['material_archive','material_delete'] && root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision &&
   materialReferencePart(s,g,o,root.revision,0) && materialReferencePart(s,g,o,root.revision,1) && materialReferencePart(s,g,o,root.revision,2) && materialReferencePart(s,g,o,root.revision,3) &&
   materialReferencePart(s,g,o,root.revision,4) && materialReferencePart(s,g,o,root.revision,5) && materialReferencePart(s,g,o,root.revision,6) && materialReferencePart(s,g,o,root.revision,7);
 }
 function materialReferenceReady(s,g,o) { return o.kind=='material_archive' && o.deleted==false || getAfter(referencePath(s,g,o.opId)).data.opId==o.opId; }
`;
