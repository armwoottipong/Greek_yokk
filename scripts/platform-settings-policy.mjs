export const platformSettingsPolicy=`
function gpRow(c,b,r,i) {
 return i>=b.platformIds.size() || (
  integer(r[b.platformIds[i]],0,9999) &&
  c.platforms[b.platformIds[i]].diff(b.platforms[b.platformIds[i]]).affectedKeys().hasOnly(['gpBasisPoints','revision']) &&
  c.platforms[b.platformIds[i]].gpBasisPoints==r[b.platformIds[i]] &&
  c.platforms[b.platformIds[i]].revision==b.platforms[b.platformIds[i]].revision+1);
}
function gpRoot(s) {
 let b=resource.data;
 let n=request.resource.data;
 let o=getAfter(operationPath(s,b.generation,n.lastOpId)).data;
 return signedIn() && b.status=='active' &&
  n.diff(b).affectedKeys().hasOnly(['revision','catalogRevision','lastOpId','lastOpKind','catalog']) &&
  n.revision==b.revision+1 && n.catalogRevision==b.catalogRevision+1 &&
  n.catalog.diff(b.catalog).affectedKeys().hasOnly(['platforms']) &&
  n.catalog.platforms.keys().toSet()==b.catalog.platforms.keys().toSet() &&
  n.catalog.platforms.diff(b.catalog.platforms).affectedKeys().hasOnly(b.catalog.platformIds) &&
  o.kind=='platform_gp' && o.opId==n.lastOpId && o.uid==request.auth.uid && o.shopRevision==n.revision &&
  b.catalog.platformIds.size()<=4 && o.rates.keys().toSet()==b.catalog.platformIds.toSet() &&
  gpRow(n.catalog,b.catalog,o.rates,0) && gpRow(n.catalog,b.catalog,o.rates,1) &&
  gpRow(n.catalog,b.catalog,o.rates,2) && gpRow(n.catalog,b.catalog,o.rates,3);
}
function gpOperation(s,g,id,o) {
 let b=get(rootPath(s)).data;
 let n=rootAfter(s);
 return writable(s,g) &&
  o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','shopRevision','rates']) &&
  o.schemaVersion==2 && o.kind=='platform_gp' && o.status=='committed' && o.opId==id &&
  o.uid==request.auth.uid && o.createdAt==request.time &&
  n.lastOpId==id && n.lastOpKind=='platform_gp' && n.revision==b.revision+1 && o.shopRevision==n.revision;
}
`;
