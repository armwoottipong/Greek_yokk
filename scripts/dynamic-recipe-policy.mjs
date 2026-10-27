// Per-bill stock coverage and canonical recipe quantities.
export const dynamicRecipePolicy=String.raw`
 function billMenuNeed(c,m,key,qty) {
  let menu=c.menus.get(key,{});
  return qty==0 ? 0 : (menu.keys().hasAny(['rawRecipe']) && !menu.hasPackage && m.inventoryType=='packaging' ? 0 : menu.get('rawRecipe',menu.get('recipe',{})).get(m.id,0))*qty;
 }
 function billAddonNeed(c,m,key,qty) { return qty==0 ? 0 : c.addons[key].recipe.get(m.id,0)*qty; }
 function billMaterialNeed(m,o,c) {
  let ids=o.lineMenuIds;
  let q=o.lineQtys;
  let a=o.addonKeys;
  let n=o.addonCounts;
  return billMenuNeed(c,m,ids[0],q[0])+billMenuNeed(c,m,ids[1],q[1])+billMenuNeed(c,m,ids[2],q[2])+
   billMenuNeed(c,m,ids[3],q[3])+billMenuNeed(c,m,ids[4],q[4])+billMenuNeed(c,m,ids[5],q[5])+
   billAddonNeed(c,m,a.A0,n.A0)+billAddonNeed(c,m,a.A1,n.A1)+billAddonNeed(c,m,a.A2,n.A2)+billAddonNeed(c,m,a.A3,n.A3)+
   billAddonNeed(c,m,a.A4,n.A4)+billAddonNeed(c,m,a.A5,n.A5)+billAddonNeed(c,m,a.A6,n.A6)+billAddonNeed(c,m,a.A7,n.A7)+
   billAddonNeed(c,m,a.A8,n.A8)+billAddonNeed(c,m,a.A9,n.A9)+billAddonNeed(c,m,a.A10,n.A10);
 }
 function billCacheWrite(s,g,id) {
  let b=resource.data;
  let n=request.resource.data;
  let c=n.billPreparations;
  let opId=request.resource.data.billPreparationId;
  let changed=c.diff(b.get('billPreparations',{})).affectedKeys();
  let d=c[opId];
  let root=get(rootPath(s)).data;
  let proof=get(preparedPath(s,g,opId,'0')).data;
  return active(s,g) && id==b.id && id in root.get('materialIds',root.catalog.summaryMaterials) && !b.deleted &&
   n.diff(b).affectedKeys().hasOnly(['billPreparations','billPreparationId']) && c is map && c.size()<=64 && changed.hasOnly([opId]) &&
   d.keys().hasOnly(['uid','catalogRevision','needed']) &&
   opId.matches('^[A-Za-z0-9_-]{1,120}$') && d.uid==request.auth.uid && !exists(orderPath(s,g,opId)) &&
   d.catalogRevision==root.catalogRevision && proof.catalogRevision==root.catalogRevision && proof.uid==d.uid &&
   // Operand structure is validated by the final immutable receipt; consumption
   // requires exact equality. Here only this mathematical result is certified.

   integer(d.needed,0,1000000000) && d.needed==billMaterialNeed(b,proof.billOperands,root.catalog);
 }
 function billCacheCleanup(s,g,id) {
  let b=resource.data;
  let n=request.resource.data;
  let opId=n.billPreparationId;
  let old=b.billPreparations;
  let next=n.get('billPreparations',{});
  return active(s,g) && b.id==id && (old[opId].uid==request.auth.uid || billExpiredCache(s,g,opId,old[opId].uid)) &&
   n.diff(b).affectedKeys().hasOnly(['billPreparations','billPreparationId']) &&
   next.keys().toSet()==old.keys().removeAll([opId]).toSet() && next.diff(old).affectedKeys().hasOnly([opId]);
 }
 function billExpiredCache(s,g,id,uid) {
  let m=get(preparationPath(s,g,id,'sale_set')).data;
  return m.uid==uid && m.kind=='sale_set' && m.opId==id && m.state in ['expired','abandoned'] && request.time>=m.createdAt+duration.value(7,'d');
 }
 function billCachedNeed(m,o,c) {
  let d=m.billPreparations[o.opId];
  return d.uid==o.uid && d.catalogRevision==c ? d.needed : -1;
 }
 function billCacheConsumed(b,n,id) {
  let old=b.billPreparations;
  let next=n.get('billPreparations',{});
  return next.keys().toSet()==old.keys().removeAll([id]).toSet() && next.diff(old).affectedKeys().hasOnly([id]);
 }
 function preparedCoverage(s,g,id,index,d) {
  let b=resource.data;
  let root=get(rootPath(s)).data;
  let manifest=get(preparationPath(s,g,id,'sale_set')).data;
  return active(s,g) && b.uid==request.auth.uid && b.catalogRevision==root.catalogRevision &&
   manifest.state=='open' && manifest.uid==b.uid && b.opId==id && index==string(b.index) && !exists(orderPath(s,g,id)) &&
   d.diff(b).affectedKeys().hasOnly(['coverageCount']) && integer(b.coverageCount,0,b.lines.size()-1) &&
   d.coverageCount==b.coverageCount+1 && billLineCoverage(root.catalog,b.lines[b.coverageCount],b.materialIds);
 }
 function billCertificatePath(s,g,id) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/preparedSales/$(id)/certificates/bill; }
 function billCertificatePart(s,g,d,i) {
  return i*2>=d.lines.size() || billCertificatePartData(get(preparedPath(s,g,d.opId,string(i))).data,d,i);
 }
 function billCertificatePartData(p,d,i) {
  let start=i*2;
  return p.opId==d.opId && p.index==i && p.uid==d.uid && p.catalogRevision==d.catalogRevision && p.platformId==d.platformId &&
   p.addonKeys==d.addonKeys && p.materialIds==d.materialIds && p.billOperands==d.billOperands && p.coverageCount==p.lines.size() &&
   p.lines==d.lines[start:(start+2<d.lines.size() ? start+2 : d.lines.size())];
 }
 function billCertificateCreate(s,g,id,index,d) {
  let root=get(rootPath(s)).data;
  let manifest=get(preparationPath(s,g,id,'sale_set')).data;
  return active(s,g) && index=='bill' && d.keys().hasOnly(['opId','uid','catalogRevision','platformId','addonKeys','materialIds','billOperands','lines']) &&
   d.opId==id && d.uid==request.auth.uid && d.catalogRevision==root.catalogRevision && manifest.state=='open' && manifest.uid==d.uid && !exists(orderPath(s,g,id)) &&
   d.lines is list && integer(d.lines.size(),1,6) && d.billOperands.keys().hasOnly(['lineMenuIds','lineQtys','addonKeys','addonCounts']) &&
   billCertificatePart(s,g,d,0) && billCertificatePart(s,g,d,1) && billCertificatePart(s,g,d,2);
 }
 function billCertificateMatch(s,g,o,revision) {
  let d=getAfter(billCertificatePath(s,g,o.opId)).data;
  return d.opId==o.opId && d.uid==o.uid && d.catalogRevision==revision && d.platformId==o.platformId &&
   d.addonKeys==o.addonKeys && d.materialIds==o.materialIds && d.billOperands==o.billOperands && d.lines==o.lines;
 }
 function billOperandField(o,i) { return i>=4 || billOperandFieldValue(o,['lineMenuIds','lineQtys','addonKeys','addonCounts'][i]); }
 function billOperandFieldValue(o,key) { return o.billOperands[key]==o[key]; }
 function billOptionCoverage(c,l,ids,i) {
  let choices=l.optionIds;
  return i>=choices.size() || c.addons[choices[i]].get('materialIds',c.addons[choices[i]].recipe.keys()).hasOnly(ids);
 }
 function billLineCoverage(c,l,ids) {
  return ids is list && ids.size() in [15,16] && ids.toSet().size()==ids.size() &&
   l.catalog.get('baseMaterialIds',l.catalog.recipe.keys()).hasOnly(ids) &&
   billOptionCoverage(c,l,ids,0) && billOptionCoverage(c,l,ids,1) && billOptionCoverage(c,l,ids,2) && billOptionCoverage(c,l,ids,3) &&
   billOptionCoverage(c,l,ids,4) && billOptionCoverage(c,l,ids,5) && billOptionCoverage(c,l,ids,6) && billOptionCoverage(c,l,ids,7) &&
   billOptionCoverage(c,l,ids,8) && billOptionCoverage(c,l,ids,9) && billOptionCoverage(c,l,ids,10);
 }
`;
