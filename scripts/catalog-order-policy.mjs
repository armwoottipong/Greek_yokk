export const catalogOrderPolicy=String.raw`
 function catalogMenuOrderWrite(s,g,id) {
  let n=request.resource.data;
  let b=resource.data;
  let root=get(rootPath(s)).data;
  let ids=root.catalog.get('menuIds',root.catalog.menus.keys());
  return id=='catalog' && catalogImageRead(s,g) &&
   n.diff(b).affectedKeys().hasOnly(['menuOrder','menuOrderRevision','menuOrderCatalogRevision','menuOrderUpdatedBy','menuOrderUpdatedAt']) &&
   n.menuOrder is list && integer(n.menuOrder.size(),1,64) && n.menuOrder.toSet()==ids.toSet() && n.menuOrder.toSet().size()==n.menuOrder.size() &&
   n.menuOrderRevision is int && n.menuOrderRevision==b.get('menuOrderRevision',0)+1 && n.menuOrderRevision<=9007199254740991 &&
   n.menuOrderCatalogRevision==root.catalogRevision && n.menuOrderUpdatedBy==request.auth.uid && n.menuOrderUpdatedAt==request.time;
 }
`
