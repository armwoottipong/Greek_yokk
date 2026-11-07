// Share the unchanged envelope checks used by committed operations. The shape
// helper only removes common allowed keys before testing the per-command keys.
export const operationRuleShape=String.raw`
 function operationKeys(o,extras) {
  return o.keys().removeAll(['schemaVersion','kind','status','opId','uid','createdAt']).hasOnly(extras);
 }
 function committedOperation(o,id) {
  return o.schemaVersion==2 && o.status=='committed' && o.opId==id && o.uid==request.auth.uid && o.createdAt==request.time;
 }
 function operationRevision(root,o,id,kind) {
  return root.lastOpId==id && root.lastOpKind==kind && root.revision==o.shopRevision;
 }
 function operationKeysChanged(n,b,extras) {
  return n.diff(b).affectedKeys().hasOnly(['revision','lastOpId','lastOpKind'].concat(extras));
 }
 function rootOperation(o,n,kind) {
  return o.kind==kind && o.opId==n.lastOpId && o.uid==request.auth.uid && o.shopRevision==n.revision;
 }
`

export function factorOperationShape(name,body){
 if(name==='committedOperation')return body
 body=body
  .replace(/\b(\w+)\.diff\((\w+|resource\.data)\)\.affectedKeys\(\)\.hasOnly\(\[('(?:[^']+)'(?:,'[^']+')*)\]\)/g,(expression,next,before,fields)=>{
   const revisionKeys=["'revision'","'lastOpId'","'lastOpKind'"]
   const keys=fields.split(',')
   if(!revisionKeys.every(key=>keys.includes(key)))return expression
   return `operationKeysChanged(${next},${before},[${keys.filter(key=>!revisionKeys.includes(key)).join(',')}])`
  })
  .replace(/o\.kind\s*==\s*('[^']+')\s*&&\s*o\.opId\s*==\s*(\w+)\.lastOpId\s*&&\s*o\.uid\s*==\s*request\.auth\.uid\s*&&\s*o\.shopRevision\s*==\s*\2\.revision/g,(_,kind,next)=>`rootOperation(o,${next},${kind})`)
 if(!name.endsWith('Operation'))return body
 return body
  .replace(/o\.keys\(\)\.hasOnly\(\['schemaVersion','kind','status','opId','uid','createdAt'((?:,'[^']+')*)\]\)/g,(_,extras)=>`operationKeys(o,[${extras.slice(1)}])`)
  .replace(/o\.schemaVersion\s*==\s*2\s*&&\s*(?:(o\.kind\s*==\s*'[^']+')\s*&&\s*)?o\.status\s*==\s*'committed'\s*&&\s*o\.opId\s*==\s*id\s*&&\s*o\.uid\s*==\s*request\.auth\.uid\s*&&\s*o\.createdAt\s*==\s*request\.time/g,(_,kind)=>`committedOperation(o,id)${kind?' && '+kind:''}`)
  .replace(/\b(root|n)\.lastOpId\s*==\s*id\s*&&\s*\1\.lastOpKind\s*==\s*('[^']+'|o\.kind)\s*&&\s*\1\.revision\s*==\s*o\.shopRevision/g,(_,root,kind)=>`operationRevision(${root},o,id,${kind})`)
}
