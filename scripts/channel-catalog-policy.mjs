export const channelCatalogPolicy=String.raw`
 function channelPath(s,g,id) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/preparations/$('channel_'+id); }
 function channelProofPath(s,g,id,i) { return /databases/$(database)/documents/shops/$(s)/generations/$(g)/preparedSales/$(id)/operandProofs/$('channel_'+string(i)); }
 function channelProofCount(c) {
  let m=c.menuIds.size()>c.addonIds.size()?c.menuIds.size():c.addonIds.size();
  let n=m>c.groupIds.size()?m:c.groupIds.size();
  return n==0 ? 1 : int((n + 1) / 2);
 }
 function channelColumn(n,b,id,source) {
  return n.diff(b).affectedKeys().hasOnly([id]) && (source=='' ? !(id in n) : n[id]==b[source]);
 }
 function channelPosition(n,b,input,i) {
  let m=b.menuIds.concat(['_','_'])[i<b.menuIds.size()?i:b.menuIds.size()];
  let a=b.addonIds.concat(['_','_'])[i<b.addonIds.size()?i:b.addonIds.size()];
  let g=b.groupIds.concat(['_','_'])[i<b.groupIds.size()?i:b.groupIds.size()];
  let k=input.id;
  let p=input.get('sourceId','');
  return (m=='_' || n.menus[m].diff(b.menus[m]).affectedKeys().hasOnly(['pricesCents','optionPrices']) &&
   channelColumn(n.menus[m].pricesCents,b.menus[m].pricesCents,k,p) && channelColumn(n.menus[m].optionPrices,b.menus[m].optionPrices,k,p)) &&
   (a=='_' || n.addons[a].diff(b.addons[a]).affectedKeys().hasOnly(['pricesCents']) && channelColumn(n.addons[a].pricesCents,b.addons[a].pricesCents,k,p)) &&
   (g=='_' || n.groups[g].diff(b.groups[g]).affectedKeys().hasOnly(['optionPrices']) && channelColumn(n.groups[g].optionPrices,b.groups[g].optionPrices,k,p));
 }
 function channelChange(n,b,i) {
  let k=i.id;
  let p=i.get('sourceId','');
  let ids=p!=''?b.platformIds.concat([k]):b.platformIds.removeAll([k]);
  return k.matches('^[A-Za-z0-9_-]{1,200}$') && k!='_' &&
   n.diff(b).affectedKeys().hasOnly(['platformIds','platforms','menus','addons','groups','addonPrices']) &&
   n.platformIds==ids && ids.size()>0 && ids.size()<=4 && n.platforms.keys().toSet()==ids.toSet() &&
   n.platforms.diff(b.platforms).affectedKeys().hasOnly([k]) &&
   n.menus.keys().toSet()==b.menuIds.toSet() && n.addons.keys().toSet()==b.addonIds.toSet() && n.groups.keys().toSet()==b.groupIds.toSet() &&
   channelColumn(n.addonPrices,b.addonPrices,k,p) &&
   (p!='' ? i.keys().hasOnly(['id','name','gpBasisPoints','sourceId']) && !(k in b.platforms) && b.platforms[p].active &&
    i.name.size()<=80 && i.name.matches('.*\\S.*') && integer(i.gpBasisPoints,0,9999) &&
    n.platforms[k]=={'active':false,'revision':1,'gpBasisPoints':i.gpBasisPoints} :
    i.keys().hasOnly(['id']) && k in b.platforms && (hasActivePlatform(n,0)||hasActivePlatform(n,1)||hasActivePlatform(n,2)||hasActivePlatform(n,3)));
 }
 function channelPrepare(s,g,id,p) {
  let b=get(rootPath(s)).data;
  return b.status=='active' && b.generation==g && p.keys().hasOnly(['opId','uid','revision','input','catalog']) &&
   id=='channel_'+p.opId && p.opId.matches('^[A-Za-z0-9_-]{1,120}$') && p.uid==request.auth.uid &&
   p.revision==b.revision && !exists(operationPath(s,g,p.opId)) && channelChange(p.catalog,b.catalog,p.input);
 }
 function channelProof(s,g,id,index,d) {
  let b=get(rootPath(s)).data;
  let p=get(channelPath(s,g,id)).data;
  let i=d.index;
  return b.status=='active' && b.generation==g && integer(i,0,31) && index=='channel_'+string(i) && i<channelProofCount(b.catalog) &&
   p.uid==request.auth.uid && p.revision==b.revision && d=={'opId':id,'index':i} &&
   (i==0 || get(channelProofPath(s,g,id,i-1)).data.opId==id) &&
   channelPosition(p.catalog,b.catalog,p.input,i*2) && channelPosition(p.catalog,b.catalog,p.input,i*2+1);
 }
 function channelRoot(s) {
  let b=resource.data;
  let n=request.resource.data;
  let g=b.generation;
  let id=n.lastOpId;
  let o=getAfter(operationPath(s,g,id)).data;
  let p=get(channelPath(s,g,id)).data;
  let d=getAfter(catalogDisplayPath(s,g)).data;
  let old=get(catalogDisplayPath(s,g)).data;
  return b.status=='active' && n.diff(b).affectedKeys().hasOnly(['catalog','revision','catalogRevision','lastOpId','lastOpKind']) &&
   n.revision==b.revision+1 && n.catalogRevision==b.catalogRevision+1 && o.kind=='channel' && o.opId==id && o.shopRevision==n.revision &&
   p.uid==request.auth.uid && p.revision==b.revision && p.input==o.input && p.catalog==n.catalog &&
   get(channelProofPath(s,g,id,channelProofCount(b.catalog)-1)).data.opId==id &&
   d.platformAvailabilityOrder==old.get('platformAvailabilityOrder',b.catalog.platformIds) &&
   (!('sourceId' in o.input) || (!(o.input.id in old.platforms) && d.platforms[o.input.id]=={'name':o.input.name,'sourcePlatformId':o.input.sourceId}));
 }
 function channelOperation(s,g,id,o) {
  let n=rootAfter(s);
  return n.status=='active' && n.generation==g && n.lastOpKind=='channel' && n.lastOpId==id && n.revision==o.shopRevision &&
   n.revision==get(rootPath(s)).data.revision+1 && o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','shopRevision','input']) &&
   o.schemaVersion==2 && o.status=='committed' && o.opId==id && o.uid==request.auth.uid && o.createdAt==request.time;
 }
 function channelDisplayWrite(s,g) {
  let n=rootAfter(s);
  let b=resource.data;
  let d=request.resource.data;
  let o=getAfter(operationPath(s,g,n.lastOpId)).data;
  let i=o.input;
  return n.status=='active' && n.generation==g && n.lastOpKind=='channel' && n.revision==get(rootPath(s)).data.revision+1 &&
   o.kind=='channel' && o.uid==request.auth.uid && n.revision==o.shopRevision &&
   d.diff(b).affectedKeys().hasOnly(['platforms','platformAvailabilityOrder']) &&
   d.platformAvailabilityOrder==b.get('platformAvailabilityOrder',get(rootPath(s)).data.catalog.platformIds) &&
   ('sourceId' in i ? d.platforms.diff(b.platforms).affectedKeys().hasOnly([i.id]) && d.platforms[i.id]=={'name':i.name,'sourcePlatformId':i.sourceId} : d.platforms==b.platforms);
 }
`
