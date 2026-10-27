// Additional catalog surfaces remain tied to the same immutable operation and
// validated root. Display changes cannot alter unrelated imported metadata.
export const catalogPolicy=String.raw`
 function catalogInputPath(s,g,id) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/operations/$(id)/referenceProofs/input; }
 function catalogInputProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,id)).data;
  return writable(s,g) && index=='input' && d.keys().hasOnly(['opId']) && d.opId==id &&
   o.kind in ['menu','addon','group','catalog'] && (o.kind!='catalog' || o.collection=='addons') &&
   o.uid==request.auth.uid && root.lastOpId==id && root.lastOpKind==o.kind && root.revision==o.shopRevision && catalogInputReceipt(o);
 }
 function catalogDisplayPath(s,g) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/display/catalog; }
 function catalogDisplayCollection(o) { return o.kind=='menu' ? 'menus' : o.kind=='group' ? 'groups' : 'addons'; }
 function catalogDisplayData(d) {
  return d is map && d.keys().hasAll(['name','emoji']) && d.keys().hasOnly(['name','emoji','category','description','deleted']) &&
   d.name is string && d.name.size()>0 && d.name.size()<=120 && d.name.matches('.*\\S.*') && d.emoji is string && d.emoji.size()<=64 &&
   (!d.keys().hasAny(['category']) || d.category is string && d.category.size()<=1000) &&
   (!d.keys().hasAny(['description']) || d.description is string && d.description.size()<=1000) &&
   (!d.keys().hasAny(['deleted']) || d.deleted is bool);
 }
 function catalogInputReceipt(o) {
  let a=o.input;
  let n=o.entitySnapshot;
  let groups=o.kind=='menu' ? assignedGroups(n) : [];
  return catalogDisplayData(o.display) && (!o.display.get('deleted',false) || n.active==false) && (!n.keys().hasAny(['name']) || n.name==o.display.name) && a is map && (o.kind in ['addon','catalog'] ? a==n : o.kind=='group' ?
   a.keys().hasOnly(['id','name','active','min','max','allowRepeat','pricingMode','optionIds','optionPrices']) &&
   n.diff(a).affectedKeys().hasOnly(['revision','menuIds','multiMenuIds']) :
   a.keys().hasOnly(['id','name','active','pricesCents','recipe','rawRecipe','hasPackage','optionIds','min','max','optionPrices','priceMode','groupId','groupIds']) &&
   a.keys().hasAll(['id','active','pricesCents','recipe','optionIds','min','max','priceMode','optionPrices']) &&
   n.diff(a).affectedKeys().hasOnly(['revision','choiceMaterials','materialIds','recipe','groupId','groupIds','optionIds','min','max','priceMode','optionPrices']) &&
   (a.keys().hasAny(['rawRecipe']) ? a.recipe==a.rawRecipe : a.recipe==n.recipe) && assignedGroups(a)==groups &&
   (groups.size()>0 || a.optionIds==n.optionIds && a.min==n.min && a.max==n.max && a.priceMode==n.priceMode && a.optionPrices==n.optionPrices));
 }
 function catalogDisplayReceipt(s,g,o) {
  let collection=catalogDisplayCollection(o);
  return getAfter(catalogDisplayPath(s,g)).data[collection][o.entityId]==o.display;
 }
 function catalogDisplayWrite(s,g,id) {
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,root.lastOpId)).data;
  let collection=catalogDisplayCollection(o);
  let b=resource.data;
  let n=request.resource.data;
  let rows=b.get(collection,{});
  return writable(s,g) && id=='catalog' && o.kind in ['menu','addon','group','catalog'] &&
   (o.kind!='catalog' || o.collection=='addons') && o.uid==request.auth.uid && root.lastOpKind==o.kind && root.revision==o.shopRevision &&
   n.diff(b).affectedKeys().hasOnly([collection]) && n[collection].keys().toSet()==rows.keys().concat([o.entityId]).toSet() &&
   n[collection].diff(rows).affectedKeys().hasOnly([o.entityId]) && n[collection][o.entityId]==o.display && catalogDisplayData(o.display);
 }
 function catalogIdleMaterial(s,g,id) {
  let b=resource.data;
  let n=request.resource.data;
  let root=rootAfter(s);
  let c=root.catalog;
  let o=getAfter(operationPath(s,g,n.lastOpId)).data;
  let index=n.recipeIndex;
  return writable(s,g) && o.kind in ['menu','addon','group','catalog'] && (o.kind!='catalog' || o.collection=='addons') && o.uid==request.auth.uid &&
   root.lastOpId==o.opId && root.lastOpKind==o.kind && root.revision==o.shopRevision && root.catalogRevision==o.sourceCatalogRevision+1 &&
   id in root.materialIds && !(id in c.summaryMaterials) && b.id==id && n.lastOpKind==o.kind && n.lastOpIndex==-1 && n.revision==b.revision+1 &&
   n.diff(b).affectedKeys().hasOnly(['recipeIndex','revision','lastOpId','lastOpKind','lastOpIndex']) &&
   index.keys().hasOnly(['catalogRevision','quantities','menus','addons']) && index.catalogRevision==root.catalogRevision &&
   index.get('quantities',[])==b.recipeIndex.get('quantities',[]) && index.get('quantities',[]).hasOnly([0]) && index.menus.values().hasOnly([0]) && index.addons.values().hasOnly([0]) &&
   index.menus.keys().toSet()==c.menuIds.concat(['_']).toSet() && index.addons.keys().toSet()==c.addonIds.concat(['_']).toSet();
 }
 function addonShapeProof(s,g,id,index,d) {
  let root=rootAfter(s);
  let o=getAfter(operationPath(s,g,id)).data;
  return writable(s,g) && index=='shape' && d.keys().hasOnly(['opId']) && d.opId==id && o.kind=='addon' && o.uid==request.auth.uid &&
   root.lastOpId==id && root.lastOpKind=='addon' && root.revision==o.shopRevision &&
   touched(s,g,o,0) && touched(s,g,o,1) && touched(s,g,o,2);
 }
 function addonRetirementGroup(c,key,i) {
  let groupId=i<c.groupIds.size() ? c.groupIds[i] : '_';
  return c.addons[key].get('active',true) || i>=c.groupIds.size() || !c.groups[groupId].active || !(key in c.groups[groupId].optionIds);
 }
`;

