// Share identical immutable, pre-write root lookups after shop specialization.
// Inlining these two helpers restores the source byte-for-byte. No predicates,
// getAfter reads or paths are changed, and Firestore's per-request read cache
// gives each call the same document snapshot.
export function factorRootData(source,shopId){
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shop')
 const expressions=[['currentRootData','get(rootPath()).data'],['fixedRootData',`get(/databases/$(database)/documents/shops/${shopId}).data`]]
 let result=source,helpers=''
 for(const [name,expression] of expressions){
  const lexical=result.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
  const positions=[];let index=lexical.indexOf(expression)
  while(index>=0){if(index===0||!/[\w.]/.test(lexical[index-1]))positions.push(index);index=lexical.indexOf(expression,index+expression.length)}
  if(positions.length<3)continue
  for(const position of positions.reverse())result=result.slice(0,position)+`${name}()`+result.slice(position+expression.length)
  helpers+=`\nfunction ${name}() { return ${expression}; }`
 }
 return helpers?result.replace('match /databases/{database}/documents {','match /databases/{database}/documents {'+helpers):source
}
