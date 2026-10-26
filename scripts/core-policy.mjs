import {readFileSync} from 'node:fs'
// Derive a narrower release from the reviewed policy. Validator bodies stay
// identical; only the command allowlist and immutable display/history reads change.
export function buildCorePolicy({shopId='greek-yogg'}={}){
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shop')
 const source=readFileSync(new URL('../tests/firestore/candidates/prepared.rules',import.meta.url),'utf8')
 const mask=source.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
 const functions=new Map()
 for(const m of mask.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g)){
  let end=m.index+m[0].length,depth=1
  while(depth&&end<mask.length){if(mask[end]==='{')depth++;if(mask[end]==='}')depth--;end++}
  functions.set(m[1],source.slice(m.index,end))
 }
 const matches=`
 match /shops/{s} {
  allow get: if signedIn();
  allow update: if request.resource.data.lastOpKind=='sale_set' && validRoot(s);
  allow update: if request.resource.data.lastOpKind=='stock_in' && stockRoot(s);
  allow update: if request.resource.data.lastOpKind=='package_stock_in' && packageStockRoot(s);
  allow update: if request.resource.data.lastOpKind=='produce' && produceRoot(s);
  allow update: if request.resource.data.lastOpKind=='cancel' && cancelRoot(s);
  match /generations/{g}/operations/{id} {
   allow read: if active(s,g);
   allow create: if request.resource.data.kind=='stock_in' && stockOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='package_stock_in' && packageStockOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='produce' && produceOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='cancel' && cancelOperation(s,g,id,request.resource.data);
  }
  match /generations/{g}/preparations/{id} {
   allow read: if active(s,g);
   allow create: if request.resource.data.kind=='sale_set' && preparationCreate(s,g,id,request.resource.data);
   allow update: if preparationClose(s,g);
  }
  match /generations/{g}/preparedSales/{id}/lineProofs/{index} {
   allow read: if active(s,g);
   allow create: if request.resource.data.lines.size()==1 && preparedWrite(s,g,id,index,request.resource.data);
   allow update: if resource.data.uid==request.auth.uid && preparedWrite(s,g,id,index,request.resource.data);
   allow delete: if preparationCleanupProof(s,g,id,'sale_set',index,'0');
  }
  match /generations/{g}/orders/{id} {
   allow read: if active(s,g);
   allow create: if validOrder(s,g,id,request.resource.data);
   allow update: if cancelOrder(s,g,id);
  }
  match /generations/{g}/materials/{id} {
   allow read: if active(s,g);
   allow update: if request.resource.data.lastOpKind=='sale_set' && validMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='stock_in' && stockMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='package_stock_in' && packageStockMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='cancel' && cancelMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='produce' && request.resource.data.lastOpIndex<2 && produceInput(s,g,id);
   allow update: if request.resource.data.lastOpKind=='produce' && request.resource.data.lastOpIndex==2 && produceOutput(s,g,id);
  }
  match /generations/{g}/display/{id} { allow read: if active(s,g); }
  match /generations/{g}/legacyRecords/{id} { allow read: if active(s,g); }
 }
 match /{document=**} { allow read,write: if false; }`
 const selected=new Set()
 function collect(text){for(const m of text.matchAll(/\b(\w+)\s*\(/g)){const name=m[1];if(functions.has(name)&&!selected.has(name)){selected.add(name);collect(functions.get(name))}}}
 collect(matches)
 const bodies=[...functions].filter(([name])=>selected.has(name)).map(([,body])=>body)
 // A literal match confines access without repeating a path check inside every
 // validator invocation (the six-line final request is near Rules' expression cap).
 const scoped=matches.replace('/shops/{s}',`/shops/${shopId}`).replace(/\bs\b/g,`'${shopId}'`)
 return `rules_version = '2';\nservice cloud.firestore {\nmatch /databases/{database}/documents {\n${bodies.join('\n')}\n${scoped}\n}\n}\n`
}
