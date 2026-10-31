import {REVISION_COMMAND_KINDS} from '../src/cloud/core/revisionCommands.js'
export const commandAbortPolicy=`
 function commandAbortOperation(s,g,id,o) {
  let n=rootAfter(s);
  return writable(s,g) && o.opId==id && n.lastOpId==id && n.lastOpKind=='command_abort' && n.revision==get(rootPath(s)).data.revision+1;
 }
 function commandAbortCommit(s,g,id,o,b,n) {
  return b.status=='active' && b.generation==g &&
   o.keys().hasOnly(['schemaVersion','kind','status','opId','uid','createdAt','sourceKind','sourceRevision','shopRevision']) &&
   o.schemaVersion==2 && o.kind=='command_abort' && o.status=='committed' && o.opId==id && o.uid==request.auth.uid && o.createdAt==request.time &&
   id.matches('^[A-Za-z0-9_-]{1,120}$') &&
   o.sourceKind.matches('^(${REVISION_COMMAND_KINDS.filter(k=>k!=='inventory').join('|')})$') &&
   o.sourceRevision==b.revision && o.shopRevision==b.revision+1 &&
   n.diff(b).affectedKeys().hasOnly(['revision','lastOpId','lastOpKind']) &&
   n.revision==b.revision+1 && n.lastOpId==id && n.lastOpKind=='command_abort' &&
   !exists(operationPath(s,g,id));
 }
 function commandAbortRoot(s) {
  let b=resource.data;
  let n=request.resource.data;
  let o=getAfter(operationPath(s,b.generation,n.lastOpId)).data;
  return commandAbortCommit(s,b.generation,n.lastOpId,o,b,n);
 }
`
