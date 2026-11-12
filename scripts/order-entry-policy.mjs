export const orderEntryPolicy=String.raw`
 function shopDay() { return int((request.time+duration.value(7,'h')).toMillis() / 86400000); }
 function preorderRoot() {
  let b=resource.data;
  let n=request.resource.data;
  let id=n.lastOpId;
  let p=b.get('preorders',{});
  let q=n.preorders;
  return b.status=='active' && operationKeysChanged(n,b,['preorders']) && n.revision==b.revision+1 &&
   id.matches('ENTRY-PRE-[0-9]{1,16}-[a-f0-9-]{36}') && q.diff(p).affectedKeys().hasOnly([id]) &&
   (n.lastOpKind=='preorder_cancel' ? id in p && !(id in q) :
    !(id in p) && id.split('-')[2]==string(b.revision) && q.size()<=24 && preorderData(b,q[id]));
 }
 function preorderData(b,d) {
  let today=shopDay();
  return d.keys().hasOnly(['pickupDay','platformId','quoteCents','draftJson']) &&
   integer(d.pickupDay,today+1,today+366) && d.platformId in b.catalog.platformIds && b.catalog.platforms[d.platformId].active &&
   integer(d.quoteCents,0,9007199254740991) && d.draftJson is string && d.draftJson.size()<=7000;
 }
 function saleSurface(b,n) {
  let id=n.lastOpId;
  return id.matches('ENTRY-PRE-[0-9]{1,16}-[a-f0-9-]{36}_[a-f0-9-]{36}') ? consumePreorderRoot(b,n,id.split('_')[0]) :
   operationKeysChanged(n,b,['returnMaterials']) && (id.matches('ENTRY-BACK-[0-9]{5}-[a-f0-9-]{36}') ?
    int(id[11:16])<shopDay() : id.matches('ENTRY-[0-9]{5}-[a-f0-9-]{36}') ?
    id[6:11]==string(shopDay()) : b.get('posEnabled',true)==true);
 }
 function consumePreorderRoot(b,n,id) {
  return operationKeysChanged(n,b,['returnMaterials','preorders']) && b.preorders[id].pickupDay<=shopDay() &&
   !(id in n.preorders) && n.preorders.diff(b.preorders).affectedKeys().hasOnly([id]);
 }
`
