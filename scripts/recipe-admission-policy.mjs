export const recipeAdmissionPolicy=String.raw`
 function recipeAdmissionPath(s,g,id,index) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/recipeAdmissions/$(id)/parts/$(string(index)); }
 function admissionRecipe(n,kind) { return kind=='menu' ? n.get('rawRecipe',n.recipe) : n.recipe; }
 function admissionMaterial(s,g,d,i) {
  return i>=d.materialIds.size() || admissionMaterialData(get(materialPath(s,g,d.materialIds[i])).data,d,d.materialIds[i]);
 }
 function admissionMaterialData(m,d,id) {
  let n=d.entitySnapshot;
  let q=admissionRecipe(n,d.kind).get(id,0);
  let used=d.kind=='menu' ? n.baseMaterialIds : n.materialIds;
  let actual=d.kind=='menu' && !n.get('hasPackage',true) && m.inventoryType=='packaging' ? 0 : q;
  return m.id==id && !m.deleted && m.inventoryType in ['ingredient','packaging'] && integer(q,0,1000000000) &&
   (d.kind!='menu' || n.recipe.get(id,0)==actual) &&
   (id in used)==(actual>0);
 }
 function recipeAdmissionWrite(s,g,id,index,d) {
  let root=get(rootPath(s)).data;
  return active(s,g) && d.keys().hasOnly(['opId','index','uid','sourceRevision','kind','entityId','input','entitySnapshot','materialIds']) &&
   d.opId==id && d.uid==request.auth.uid && integer(d.index,0,3) && index==string(d.index) && d.sourceRevision==root.revision &&
   d.kind in ['menu','addon'] && d.entityId is string && !exists(operationPath(s,g,id)) &&
   d.materialIds is list && integer(d.materialIds.size(),1,4) && d.materialIds.toSet().size()==d.materialIds.size() &&
   d.materialIds.hasOnly(root.get('materialIds',root.catalog.summaryMaterials)) && d.materialIds.hasOnly(admissionRecipe(d.entitySnapshot,d.kind).keys()) &&
   admissionMaterial(s,g,d,0) && admissionMaterial(s,g,d,1) && admissionMaterial(s,g,d,2) && admissionMaterial(s,g,d,3);
 }
 function recipeAdmissionPart(s,g,o,revision,i) {
  return i*4>=o.validationIds.size() || recipeAdmissionPartLookup(s,g,o,revision,i);
 }
 function recipeAdmissionPartLookup(shopKey,generationKey,operationData,rootRevision,partIndex) {
  let prepared=get(/databases/$(database)/documents/shops/$(shopKey)/generations/$(generationKey)/recipeAdmissions/$(operationData.opId)/parts/$(string(partIndex))).data;
  return recipeAdmissionPartData(prepared,operationData,rootRevision,partIndex);
 }
 function recipeAdmissionPartData(d,o,revision,i) {
  let ids=o.validationIds;
  let start=i*4;
  return d.opId==o.opId && d.index==i && d.uid==o.uid && d.sourceRevision==revision-1 && d.entityId==o.entityId &&
   d.kind==(o.kind=='catalog' ? 'addon' : o.kind) && d.input==o.input && d.entitySnapshot==o.entitySnapshot &&
   d.materialIds==ids[start:(start+4<ids.size() ? start+4 : ids.size())];
 }
 function recipeAdmissionCommitProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let o=getAfter(/databases/$(database)/documents/shops/$(s)/generations/$(g)/operations/$(id)).data;
  return writable(s,g) && index=='admitted' && d.keys().hasOnly(['opId']) && d.opId==id && o.uid==request.auth.uid &&
   o.kind in ['menu','addon','group','catalog'] && root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision &&
   recipeAdmissionPart(s,g,o,root.revision,0) && recipeAdmissionPart(s,g,o,root.revision,1) && recipeAdmissionPart(s,g,o,root.revision,2) && recipeAdmissionPart(s,g,o,root.revision,3);
 }
 function catalogAdmissionPath(s,g,id) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/operations/$(id)/referenceProofs/admitted; }
 function catalogCheckPath(s,g,id,i) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/operations/$(id)/referenceProofs/$('check'+string(i)); }
 function catalogChecksPresent(s,g,id,o) {
  return o.kind=='addon' || getAfter(catalogCheckPath(s,g,id,0)).data.opId==id && getAfter(catalogCheckPath(s,g,id,1)).data.opId==id &&
   getAfter(catalogCheckPath(s,g,id,2)).data.opId==id && getAfter(catalogCheckPath(s,g,id,3)).data.opId==id;
 }
 function catalogRootChecksPresent(s,g,id,o) {
  return o.kind=='addon' || getAfter(catalogCheckPath(s,g,id,4)).data.opId==id && getAfter(catalogCheckPath(s,g,id,5)).data.opId==id &&
   getAfter(catalogCheckPath(s,g,id,6)).data.opId==id && getAfter(catalogCheckPath(s,g,id,7)).data.opId==id;
 }
 function catalogCheckSlot(s,c,o,i) {
  return o.kind=='menu' ? menuChoices(c,c.menus[o.entityId],i) && (i>=4 || basePriceAt(c,c.menus[o.entityId],i)) :
   o.kind=='group' ? groupChoices(c,c.groups[o.entityId],i) && (i>=4 || groupPriceKeys(c,c.groups[o.entityId],i)) :
   o.kind=='catalog' && addonMenuReferences(s,c,o.entityId,i) &&
    addonRetirementGroup(c,o.entityId,i*4) && addonRetirementGroup(c,o.entityId,i*4+1) && addonRetirementGroup(c,o.entityId,i*4+2) && addonRetirementGroup(c,o.entityId,i*4+3);
 }
 function catalogCheckProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,id)).data;
  let part=index=='check0'?0:index=='check1'?1:index=='check2'?2:index=='check3'?3:index=='check4'?4:index=='check5'?5:index=='check6'?6:index=='check7'?7:-1;
  return writable(s,g) && part>=0 && d.keys().hasOnly(['opId']) && d.opId==id && o.uid==request.auth.uid &&
   o.kind in ['menu','group','catalog'] && root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision &&
   catalogCheckSlot(s,root.catalog,o,part*2) && catalogCheckSlot(s,root.catalog,o,part*2+1);
 }
`;
