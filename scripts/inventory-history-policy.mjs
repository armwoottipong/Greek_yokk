// Clear the shared history view; never delete operation/order receipts.
export const inventoryHistoryPolicy=`
function historyClearRoot(s) {
 let b=resource.data;
 let n=request.resource.data;
 let o=getAfter(operationPath(s,b.generation,n.lastOpId)).data;
 return signedIn() && b.status=='active' &&
  n.diff(b).affectedKeys().hasOnly(['revision','lastOpId','lastOpKind','inventoryHistoryCutoff']) &&
  n.revision==b.revision+1 && n.inventoryHistoryCutoff==n.revision &&
  o.kind=='history_clear' && o.opId==n.lastOpId && o.uid==request.auth.uid &&
  o.shopRevision==n.revision && o.clearedThroughRevision==n.revision;
}
function historyClearOperation(s,g,id,o) {
 let b=get(rootPath(s)).data;
 let n=rootAfter(s);
 return writable(s,g) &&
  o.keys().hasAll(['schemaVersion','kind','status','opId','uid','createdAt','shopRevision','clearedThroughRevision']) &&
  o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','shopRevision','clearedThroughRevision']) &&
  o.schemaVersion==2 && o.kind=='history_clear' && o.status=='committed' && o.opId==id &&
  o.uid==request.auth.uid && o.createdAt==request.time &&
  n.lastOpId==id && n.lastOpKind=='history_clear' && n.revision==b.revision+1 &&
  o.shopRevision==n.revision && o.clearedThroughRevision==n.revision && n.inventoryHistoryCutoff==n.revision;
}
`;
