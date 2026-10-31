export const catalogImagePolicy=`
function catalogImageRead(s,g) {
 let root=get(/databases/$(database)/documents/shops/$(s)).data;
 return root.status=='active' && root.generation==g && allowedIdentity(root) && operatorIdentity(root);
}
function catalogImageWrite(s,g,id) {
 let n=request.resource.data;
 let root=get(/databases/$(database)/documents/shops/$(s)).data;
 return catalogImageRead(s,g) && n.keys().hasAll(['kind','entityId','dataURL','revision','updatedAt','updatedBy']) &&
  n.keys().hasOnly(['kind','entityId','dataURL','revision','updatedAt','updatedBy']) &&
  n.kind in ['menus','materials'] && n.entityId is string && n.entityId.size()>0 && n.entityId.size()<=160 &&
  id==n.kind+'_'+n.entityId && n.dataURL is string && n.dataURL.size()<=204823 &&
  (n.dataURL=='' || n.dataURL.matches('^data:image/jpeg;base64,/9j/[A-Za-z0-9+/]*={0,2}$')) &&
  n.revision is int && n.revision>0 && n.revision<=9007199254740991 &&
  n.revision==(exists(/databases/$(database)/documents/shops/$(s)/generations/$(g)/catalogImages/$(id)) ? resource.data.revision+1 : 1) &&
  n.updatedBy==request.auth.uid && n.updatedAt==request.time &&
  (n.kind=='menus' ? n.entityId in root.catalog.menus : exists(/databases/$(database)/documents/shops/$(s)/generations/$(g)/materials/$(n.entityId)));
}
`
