import {catalogPolicy} from './catalog-policy.mjs'
import {readFileSync} from 'node:fs'
import {inventoryHistoryPolicy} from './inventory-history-policy.mjs'
import {inventoryDeletePolicy} from './inventory-delete-policy.mjs'
// Derive the release from reviewed validators with explicit profile extensions,
// mandatory catalog witnesses and shop-scoped command/read surfaces.
export function buildCorePolicy({shopId='greek-yogg'}={}){
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shop')
 const source=readFileSync(new URL('../tests/firestore/candidates/prepared.rules',import.meta.url),'utf8')+'\n'+inventoryDeletePolicy+'\n'+inventoryHistoryPolicy+'\n'+catalogPolicy
 const mask=source.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
 const functions=new Map()
 for(const m of mask.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g)){
  let end=m.index+m[0].length,depth=1
  while(depth&&end<mask.length){if(mask[end]==='{')depth++;if(mask[end]==='}')depth--;end++}
  functions.set(m[1],source.slice(m.index,end))
 }
 const catalogKinds={menu:'menu',addon:'addon',group:'group',catalog:'catalog'}
 const inventoryKinds={history_clear:'historyClear',stock_count:'count',switch_lot:'switch',material_create:'materialCreate',material_archive:'materialArchive',material_metadata:'materialMetadata',material_measure:'materialMeasure',material_details:'materialDetails',material_type:'materialType',production_recipe:'productionRecipe'}
 const matches=`
 match /shops/{s} {
  allow get: if signedIn();
  allow update: if request.resource.data.lastOpKind=='sale_set' && validRoot(s);
  allow update: if request.resource.data.lastOpKind=='stock_in' && stockRoot(s);
  allow update: if request.resource.data.lastOpKind=='package_stock_in' && packageStockRoot(s);
  allow update: if request.resource.data.lastOpKind=='produce' && produceRoot(s);
  allow update: if request.resource.data.lastOpKind=='cancel' && cancelRoot(s);
  ${Object.entries(inventoryKinds).map(([kind,name])=>`allow update: if request.resource.data.lastOpKind=='${kind}' && ${name}Root(s);`).join('\n')}
  ${Object.entries(catalogKinds).map(([kind,name])=>`allow update: if request.resource.data.lastOpKind=='${kind}' && ${name}Root(s);`).join('\n')}
  allow update: if request.resource.data.lastOpKind=='material_delete' && materialDeleteRoot(s);
  match /generations/{g}/operations/{id} {
   allow read: if active(s,g);
   ${Object.entries(catalogKinds).map(([kind,name])=>`allow create: if request.resource.data.kind=='${kind}' && ${name}Operation(s,g,id,request.resource.data);`).join('\n')}
   match /referenceProofs/{index} {
    allow create: if index=='input' && catalogInputProof(s,g,id,index,request.resource.data);
    allow create: if addonShapeProof(s,g,id,index,request.resource.data) || menuShapeProof(s,g,id,index,request.resource.data) || groupShapeProof(s,g,id,index,request.resource.data) || catalogReferenceProof(s,g,id,index,request.resource.data);
   }
   ${Object.entries(inventoryKinds).map(([kind,name])=>`allow create: if request.resource.data.kind=='${kind}' && ${name}Operation(s,g,id,request.resource.data);`).join('\n')}
   allow create: if request.resource.data.kind=='stock_in' && stockOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='package_stock_in' && packageStockOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='produce' && produceOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='cancel' && cancelOperation(s,g,id,request.resource.data);
   allow create: if request.resource.data.kind=='material_delete' && materialDeleteOperation(s,g,id,request.resource.data);
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
   ${Object.entries(inventoryKinds).filter(([kind])=>kind!=='history_clear').map(([kind,name])=>`allow ${kind==='material_create'?'create':'update'}: if request.resource.data.lastOpKind=='${kind}' && ${name}Material(s,g,id);`).join('\n')}
   ${Object.entries(catalogKinds).map(([kind,name])=>`allow update: if request.resource.data.lastOpKind=='${kind}' && (request.resource.data.lastOpIndex==-1 ? catalogIdleMaterial(s,g,id) : ${name}Material(s,g,id));`).join('\n')}
   allow delete: if materialDeleteMaterial(s,g,id);
  }
  match /generations/{g}/display/{id} { allow read: if active(s,g); allow update: if catalogDisplayWrite(s,g,id); }
  match /generations/{g}/legacyRecords/{id} { allow read: if active(s,g); }
 }
 match /{document=**} { allow read,write: if false; }`
 const selected=new Set()
 function collect(text){for(const m of text.matchAll(/\b(\w+)\s*\(/g)){const name=m[1];if(functions.has(name)&&!selected.has(name)){selected.add(name);collect(functions.get(name))}}}
 collect(matches)
 collect('catalogInputPath(')
 collect('catalogDisplayReceipt(')
 collect('catalogInputReceipt(')
 collect('addonRetirementGroup(')
 const replace=(body,before,after)=>{if(!body.includes(before))throw new Error('Core validator source changed');return body.replace(before,after)}
 function extend(name,body){
  if(['menuShapeProof','groupShapeProof','addonShapeProof','catalogReferenceProof'].includes(name)){const end=body.lastIndexOf(';');body=body.slice(0,end)+' && touched(s,g,o,15)'+body.slice(end)}
  if(['menuRoot','addonRoot','groupRoot','catalogRoot','menuOperation','addonOperation','groupOperation','catalogOperation','menuMaterial','addonMaterial','groupMaterial','catalogMaterial','catalogIdleMaterial','catalogDisplayWrite','catalogReferenceProof','menuShapeProof','groupShapeProof','addonShapeProof','catalogInputProof'].includes(name))body=body.replace(/getAfter\(operationPath\(s,([^,]+),([^\)]+)\)\)/g,'getAfter(/databases/$(database)/documents/shops/$(s)/generations/$($1)/operations/$($2))')
  if(name==='catalogDisplayReceipt')body=body.replace('getAfter(catalogDisplayPath(s,g))','getAfter(/databases/$(database)/documents/shops/$(s)/generations/$(g)/display/catalog)')

  if(['menuMaterial','addonMaterial','groupMaterial','catalogMaterial'].includes(name))body=body.replaceAll('integer(i,0,14)','integer(i,0,15)').replaceAll('integer(n.lastOpIndex,0,14)','integer(n.lastOpIndex,0,15)').replaceAll('integer(after.lastOpIndex,0,14)','integer(after.lastOpIndex,0,15)')
  if(['menuOperation','addonOperation','groupOperation','catalogOperation'].includes(name)){
   body=body.replace("'entitySnapshot'","'input','display','entitySnapshot'")
   body=body.replace('return writable(s,g) &&', 'return writable(s,g) && getAfter(catalogInputPath(s,g,id)).data.opId==id && catalogDisplayReceipt(s,g,o) &&')

  }
  if(name==='menuChoice')body=body.replace('return refs is list',"return (!m.active || c.addons[key].get('active',true)) && refs is list")
  if(name==='groupChoice')body=body.replace('return a is int',"return (!g.active || c.addons[key].get('active',true)) && a is int")
  if(name==='catalogEdit')body=body.replaceAll('c.counterIds',"c.get('counterIds',[])")
  if(name==='addonRoot')body=body.replace('touched(s,before.generation,o,0) && touched(s,before.generation,o,1) && touched(s,before.generation,o,2) &&','').replace("(k>=15 ? c.counterIds==old.counterIds :", "(!old.keys().hasAny(['counterIds']) ? !c.keys().hasAny(['counterIds']) : k>=15 ? c.counterIds==old.counterIds :")
  if(name==='addonOperation')body=body.replace("root.lastOpId==id &&","getAfter(shapePath(s,g,id)).data.opId==id && root.lastOpId==id &&")
  if(name==='addonMaterial')body=body.replace('let q=n.recipeIndex.quantities;',"let q=n.recipeIndex.get('quantities',[]);").replace('q.size()==15', "(!before.recipeIndex.keys().hasAny(['quantities']) ? q.size()==0 : q.size()==15)").replace('(k>=15 ? q==before.recipeIndex.quantities :', "(!before.recipeIndex.keys().hasAny(['quantities']) ? !n.recipeIndex.keys().hasAny(['quantities']) : k>=15 ? q==before.recipeIndex.quantities :")
  if(name==='catalogMaterial')body=body.replace('index.quantities==oldIndex.quantities',"index.get('quantities',[])==oldIndex.get('quantities',[])")
  if(name==='catalogReferenceProof')body=replace(body,'addonMenuReference(root.catalog,old.catalog,o.entityId,63)',"addonMenuReference(root.catalog,old.catalog,o.entityId,63) && (o.materialIds.size()==16 || addonRetirementGroup(root.catalog,o.entityId,60) && addonRetirementGroup(root.catalog,o.entityId,61) && addonRetirementGroup(root.catalog,o.entityId,62) && addonRetirementGroup(root.catalog,o.entityId,63))")
  if(name==='catalogRoot')body=body.replace('touchedAt(s,resource.data.generation,o,0) && touchedAt(s,resource.data.generation,o,1) && touchedAt(s,resource.data.generation,o,2) &&','')
  if(name==='catalogReferenceProof'){const end=body.lastIndexOf(';');body=body.slice(0,end)+' && touchedAt(s,g,o,0) && touchedAt(s,g,o,1) && touchedAt(s,g,o,2)'+body.slice(end)}
  if(name==='catalogOperation')body=body.replace("o.collection in ['menus','addons','platforms']", "o.collection=='addons'")
  if(name==='addonMenuReference')body=body.replace('return i>=c.menuIds.size() ||', "return i>=c.menuIds.size() || (c.addons[key].get('active',true) || !before.active || !(key in before.optionIds)) &&")
  if(name==='catalogMaterial')body=body.replace('oldIndex.catalogRevision==o.sourceCatalogRevision &&', "(o.collection!='addons' || addonRetirementGroup(c,o.entityId,after.lastOpIndex*4) && addonRetirementGroup(c,o.entityId,after.lastOpIndex*4+1) && addonRetirementGroup(c,o.entityId,after.lastOpIndex*4+2) && addonRetirementGroup(c,o.entityId,after.lastOpIndex*4+3)) && oldIndex.catalogRevision==o.sourceCatalogRevision &&")

  if(name==='materialCreateMaterial')body=replace(body,'root.catalogRevision,id,root.materialIds.size())',"root.catalogRevision,id,root.get('nextMaterialCostRank',root.materialIds.size()))")
  if(name==='materialCreateRoot'){
   body=replace(body,"['materialIds','productionUsers','revision','lastOpId','lastOpKind']","['materialIds','productionUsers','nextMaterialCostRank','revision','lastOpId','lastOpKind']")
   body=replace(body,"n.materialIds==b.materialIds.concat([o.materialId])", "(!b.keys().hasAny(['nextMaterialCostRank']) ? !n.keys().hasAny(['nextMaterialCostRank']) : integer(b.nextMaterialCostRank,b.materialIds.size(),9007199254740990) && n.nextMaterialCostRank==b.nextMaterialCostRank+1) && n.materialIds==b.materialIds.concat([o.materialId])")
  }
  if(name==='touchedAt')body=replace(body,'getAfter(materialPath(s,g,o.materialIds[i]))','getAfter(/databases/$(database)/documents/shops/$(s)/generations/$(g)/materials/$(o.materialIds[i]))')
  if(name==='rootAfter')body=replace(body,'getAfter(rootPath(s))','getAfter(/databases/$(database)/documents/shops/$(s))')
  if(name==='preparedMatch')body=replace(body,'getAfter(preparedPath(s,g,id,string(i)))','getAfter(/databases/$(database)/documents/shops/$(s)/generations/$(g)/preparedSales/$(id)/lineProofs/$(string(i)))')
  if(['validMaterial','cancelMaterial'].includes(name))body=replace(body,'integer(i,0,14)','integer(i,0,15)')
  if(name==='validMaterial'){
   body=replace(body,'(i<4 || counter(o,i,root.catalog))','(i<4 || i>=15 || counter(o,i,root.catalog))')
  }
  if(name==='validRoot'){
   // First pair is bound by material3, last pair by the receipt. Only a
   // three-pair sale needs a middle-pair check here. The freed read binds row16.
   body=replace(body,'(o.lineWitnessCount<2 || preparedMatch','(o.materialIds.size()==15 || touchedAt(s,resource.data.generation,o,15)) && (o.lineWitnessCount<3 || preparedMatch')
  }
  if(name==='costs')body=replace(body,'rows[14][key];','rows[14][key]+(rows.size()==16 ? rows[15][key] : 0);')
  if(name==='validOrder'){
   body=replace(body,'o.inventory.size() == 15','o.inventory.size() in [15,16]')
  }
  if(name==='materialTypeRoot'){
   body=replace(body,'c.summaryMaterials.size()==15 && c.summaryMaterials.toSet().size()==15','c.summaryMaterials.size() in [15,16] && c.summaryMaterials.toSet().size()==c.summaryMaterials.size()')
  }
  if(name==='materialTypeMaterial'){
   body=replace(body,'integer(i,0,15)','integer(i,0,16)')
   body=body.replaceAll('i==15','i==root.catalog.summaryMaterials.size()')
  }
  if(name==='materialTypeOperation')body=replace(body,'touched(s,g,o,15);','touched(s,g,o,15) && touched(s,g,o,16);')
  if(name==='cancelOperation'){
   body=replace(body,'o.sourceRevisions.size()==15','o.materialIds.size() in [15,16] && o.sourceRevisions.size()==o.materialIds.size()')
   body=replace(body,'touched(s,g,o,14);','touched(s,g,o,14) && touched(s,g,o,15);')
  }
  return body
 }
 const bodies=[...functions].filter(([name])=>selected.has(name)).map(([name,body])=>extend(name,body))
 // A literal match confines access without repeating a path check inside every
 // validator invocation (the six-line final request is near Rules' expression cap).
 const scoped=matches.replace('/shops/{s}',`/shops/${shopId}`).replace(/\bs\b/g,`'${shopId}'`)
 return `rules_version = '2';\nservice cloud.firestore {\nmatch /databases/{database}/documents {\n${bodies.join('\n')}\n${scoped}\n}\n}\n`
}
