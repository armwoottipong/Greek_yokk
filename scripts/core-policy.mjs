import {compactRules} from './compact-rules.mjs'
import {materialTypePolicy} from './material-type-policy.mjs'
import {materialReferencePolicy} from './material-reference-policy.mjs'
import {recipeAdmissionPolicy} from './recipe-admission-policy.mjs'
import {dynamicRecipePolicy} from './dynamic-recipe-policy.mjs'
import {catalogPolicy} from './catalog-policy.mjs'
import {readFileSync} from 'node:fs'
import {inventoryHistoryPolicy} from './inventory-history-policy.mjs'
import {inventoryDeletePolicy} from './inventory-delete-policy.mjs'
// Derive the release from reviewed validators with explicit profile extensions,
// mandatory catalog witnesses and shop-scoped command/read surfaces.
export function buildCorePolicy({shopId='greek-yogg',compact=true}={}){
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shop')
 const source=readFileSync(new URL('../tests/firestore/candidates/prepared.rules',import.meta.url),'utf8')+'\n'+inventoryDeletePolicy+'\n'+inventoryHistoryPolicy+'\n'+catalogPolicy+'\n'+dynamicRecipePolicy+'\n'+recipeAdmissionPolicy+'\n'+materialReferencePolicy+'\n'+materialTypePolicy
 const mask=source.replace(/\/\/[^\n]*|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"/g,s=>' '.repeat(s.length))
 const functions=new Map()
 for(const m of mask.matchAll(/function\s+(\w+)\s*\([^)]*\)\s*\{/g)){
  let end=m.index+m[0].length,depth=1
  while(depth&&end<mask.length){if(mask[end]==='{')depth++;if(mask[end]==='}')depth--;end++}
  functions.set(m[1],source.slice(m.index,end))
 }
 functions.set('addonMenuReferenceData',functions.get('addonMenuReference').replace('function addonMenuReference(', 'function addonMenuReferenceData('))
 functions.set('addonMenuReference',`function addonMenuReference(c,old,key,i) { return i>=c.menuIds.size() || addonMenuReferenceData(c,old,key,i); }`)
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
    allow create: if index.matches('^type([0-9]|1[0-5])$') && materialTypeProof(s,g,id,index,request.resource.data);
    allow create: if index=='0' && materialReferenceProof(s,g,id,index,request.resource.data);
    allow create: if index=='admitted' && recipeAdmissionCommitProof(s,g,id,index,request.resource.data);
    allow create: if index.matches('^check[0-7]$') && catalogCheckProof(s,g,id,index,request.resource.data);
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
  match /generations/{g}/materialReferences/{id}/parts/{index} {
   allow read: if active(s,g);
   allow create: if materialReferenceWrite(s,g,id,index,request.resource.data);
   allow update: if resource.data.uid==request.auth.uid && request.resource.data.materialId==resource.data.materialId && request.resource.data.kind==resource.data.kind && materialReferenceWrite(s,g,id,index,request.resource.data);
  }
  match /generations/{g}/recipeAdmissions/{id}/parts/{index} {
   allow read: if active(s,g);
   allow create: if recipeAdmissionWrite(s,g,id,index,request.resource.data);
   allow update: if resource.data.uid==request.auth.uid && request.resource.data.input==resource.data.input && request.resource.data.entityId==resource.data.entityId && request.resource.data.kind==resource.data.kind && recipeAdmissionWrite(s,g,id,index,request.resource.data);
  }
  match /generations/{g}/preparations/{id} {
   allow read: if active(s,g);
   allow create: if request.resource.data.kind=='sale_set' && preparationCreate(s,g,id,request.resource.data);
   allow update: if preparationClose(s,g);
  }
  match /generations/{g}/preparedSales/{id}/lineProofs/{index} {
   allow read: if active(s,g);
   allow create: if request.resource.data.lines.size()==1 && preparedWrite(s,g,id,index,request.resource.data);
   allow update: if (!resource.data.keys().hasAny(['billOperands']) || request.resource.data.billOperands==resource.data.billOperands) && resource.data.uid==request.auth.uid && preparedWrite(s,g,id,index,request.resource.data);
   allow update: if preparedCoverage(s,g,id,index,request.resource.data);
   allow delete: if preparationCleanupProof(s,g,id,'sale_set',index,'0');
  }
  match /generations/{g}/preparedSales/{id}/certificates/{index} {
   allow read: if active(s,g);
   allow create: if billCertificateCreate(s,g,id,index,request.resource.data);
   allow delete: if index=='bill' && preparationCleanup(s,g,id,'sale_set',true);
  }
  match /generations/{g}/orders/{id} {
   allow read: if active(s,g);
   allow create: if validOrder(s,g,id,request.resource.data);
   allow update: if cancelOrder(s,g,id);
  }
  match /generations/{g}/materials/{id} {
   allow read: if active(s,g);
   allow update: if request.resource.data.revision==resource.data.revision && (billCacheWrite(s,g,id) || billCacheCleanup(s,g,id));
   allow update: if request.resource.data.lastOpKind=='sale_set' && validMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='stock_in' && stockMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='package_stock_in' && packageStockMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='cancel' && cancelMaterial(s,g,id);
   allow update: if request.resource.data.lastOpKind=='produce' && request.resource.data.lastOpIndex<2 && produceInput(s,g,id);
   allow update: if request.resource.data.lastOpKind=='produce' && request.resource.data.lastOpIndex==2 && produceOutput(s,g,id);
   ${Object.entries(inventoryKinds).filter(([kind])=>kind!=='history_clear').map(([kind,name])=>`allow ${kind==='material_create'?'create':'update'}: if request.resource.data.lastOpKind=='${kind}' && ${name}Material(s,g,id);`).join('\n')}
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
 collect('billMaterialNeed(')
 collect('billCachedNeed(')
 collect('billCacheConsumed(')
 collect('billOperandField(')
 collect('billCertificateMatch(')
 collect('billCertificatePath(')
 collect('billLineCoverage(')
 collect('admissionRecipe(')
 collect('recipeAdmissionPart(')
 collect('catalogChecksPresent(')
 collect('catalogRootChecksPresent(')
 collect('catalogAdmissionPath(')
 collect('materialReferenceReady(')
 const replace=(body,before,after)=>{if(!body.includes(before))throw new Error('Core validator source changed');return body.replace(before,after)}
 function extend(name,body){
  if(name==='validMaterial')body=replace(body,'before.recipeIndex.catalogRevision == root.catalogRevision &&','').replace('materialNeed(before,o)','billCachedNeed(before,o,root.catalogRevision)').replace("['stock','lotQty','zeroActiveIds','activeLotId','lastStockInDay','expiryDay','revision','lastOpId','lastOpKind','lastOpIndex']","['stock','lotQty','zeroActiveIds','activeLotId','lastStockInDay','expiryDay','revision','lastOpId','lastOpKind','lastOpIndex','billPreparations']").replace('summaryStock(before,after,row,day)', 'billOperandField(o,i) && billCacheConsumed(before,after,o.opId) && summaryStock(before,after,row,day)').replace('(i!=3 || preparedMatch(s,g,o.opId,o,root.catalogRevision,0))','true')
  if(name==='validOrder')body=body.replace("'proofMode'","'proofMode','billOperands'")
  if(name==='validOrder'){
   body=replace(body,'touchedAt(s,g,o,8)', 'touchedAt(s,g,o,7) && touchedAt(s,g,o,8)')
   body=replace(body,'o.materialIds == root.catalog.summaryMaterials',"o.materialIds.hasOnly(root.get('materialIds',root.catalog.summaryMaterials))")
   body=replace(body,'      let line = getAfter(preparedPath(s,g,id,string(o.lineWitnessCount - 1))).data;','')
   body=replace(body,`o.proofMode=='prepared' && line.opId==id && line.index==o.lineWitnessCount-1 && line.uid==o.uid &&
        line.catalogRevision==root.catalogRevision && line.platformId==o.platformId && line.addonKeys==o.addonKeys &&
        line.lines==o.lines[(o.lineWitnessCount-1)*2:o.lines.size()] &&`,"o.proofMode=='prepared' &&")
  }
  if(name==='preparationClose'){const end=body.lastIndexOf(';');body=body.slice(0,end)+" && (b.kind!='sale_set' || n.state=='committed' || !existsAfter(billCertificatePath(s,g,b.opId)))"+body.slice(end)}
  if(name==='preparedWrite')body=replace(body,"['opId','index','uid','catalogRevision','platformId','addonKeys','lines']","['opId','index','uid','catalogRevision','platformId','addonKeys','materialIds','billOperands','coverageCount','lines']").replace("hasOnly(['lines'])","hasOnly(['lines','coverageCount']) && d.coverageCount==resource.data.coverageCount").replace('(replacing || append)', '(replacing && d.coverageCount==0 || append)')
  if(name==='preparedMatch')body=replace(body,'d.addonKeys==o.addonKeys &&','d.addonKeys==o.addonKeys && d.materialIds==o.materialIds && (i!=0 || d.billOperands==o.billOperands) && d.coverageCount==d.lines.size() &&')

  if(['menuShapeProof','groupShapeProof','addonShapeProof','catalogReferenceProof'].includes(name)){const end=body.lastIndexOf(';');body=body.slice(0,end)+' && touched(s,g,o,15)'+body.slice(end)}
  if(['menuRoot','addonRoot','groupRoot','catalogRoot','menuOperation','addonOperation','groupOperation','catalogOperation','menuMaterial','addonMaterial','groupMaterial','catalogMaterial','catalogIdleMaterial','catalogDisplayWrite','catalogReferenceProof','menuShapeProof','groupShapeProof','addonShapeProof','catalogInputProof'].includes(name))body=body.replace(/getAfter\(operationPath\(s,([^,]+),([^)]+)\)\)/g,'getAfter(/databases/$(database)/documents/shops/$(s)/generations/$($1)/operations/$($2))')
  if(name==='catalogDisplayReceipt')body=body.replace('getAfter(catalogDisplayPath(s,g))','getAfter(/databases/$(database)/documents/shops/$(s)/generations/$(g)/display/catalog)')

  if(['menuMaterial','addonMaterial','groupMaterial','catalogMaterial'].includes(name))body=body.replaceAll('integer(i,0,14)','integer(i,0,15)').replaceAll('integer(n.lastOpIndex,0,14)','integer(n.lastOpIndex,0,15)').replaceAll('integer(after.lastOpIndex,0,14)','integer(after.lastOpIndex,0,15)')
  if(['menuOperation','addonOperation','groupOperation','catalogOperation'].includes(name)){
   body=body.replace("'entitySnapshot'","'input','display','entitySnapshot'")
   body=body.replace('return writable(s,g) &&', 'return writable(s,g) && getAfter(catalogInputPath(s,g,id)).data.opId==id && catalogDisplayReceipt(s,g,o) &&')

  }
  if(name==='menuChoice')body=body.replace('return refs is list',"return (!m.active || c.addons[key].get('active',true)) && refs is list")
  if(name==='groupChoice')body=body.replace('return a is int',"return (!g.active || c.addons[key].get('active',true)) && a is int")
  // Generic catalog edits in this release are exclusively Add-on edits. Remove
  // unreachable menu/platform branches rather than carrying their compiled AST.
  if(name==='catalogEdit')body=`function catalogEdit(c,old,o) {
   let ids=c.get('counterIds',[]);
   return o.collection=='addons' && c.keys().toSet()==old.keys().toSet() && o.entityId!='_' && o.entityId in c.addonIds &&
    (o.counterIndex==-1 ? !(o.entityId in ids) : integer(o.counterIndex,4,14) && ids[o.counterIndex]==o.entityId) &&
    o.entitySnapshot==c.addons[o.entityId] && c.diff(old).affectedKeys().hasOnly(['addons','addonPrices','menus']) &&
    c.addons.keys().toSet()==old.addons.keys().toSet() && c.addons.diff(old.addons).affectedKeys().hasOnly([o.entityId]) &&
    c.menus.keys().toSet()==old.menus.keys().toSet() && c.addonPrices.keys().toSet()==old.addonPrices.keys().toSet() &&
    addonPriceEdit(c,old,o.entityId,0) && addonPriceEdit(c,old,o.entityId,1) && addonPriceEdit(c,old,o.entityId,2) && addonPriceEdit(c,old,o.entityId,3);
  }`

  if(name==='addonRoot')body=body.replace('touched(s,before.generation,o,0) && touched(s,before.generation,o,1) && touched(s,before.generation,o,2) &&','').replace("(k>=15 ? c.counterIds==old.counterIds :", "(!old.keys().hasAny(['counterIds']) ? !c.keys().hasAny(['counterIds']) : k>=15 ? c.counterIds==old.counterIds :")
  if(name==='addonOperation')body=body.replace("root.lastOpId==id &&","getAfter(shapePath(s,g,id)).data.opId==id && root.lastOpId==id &&")
  if(name==='addonMaterial')body=body.replace('let q=n.recipeIndex.quantities;',"let q=n.recipeIndex.get('quantities',[]);").replace('q.size()==15', "(!before.recipeIndex.keys().hasAny(['quantities']) ? q.size()==0 : q.size()==15)").replace('(k>=15 ? q==before.recipeIndex.quantities :', "(!before.recipeIndex.keys().hasAny(['quantities']) ? !n.recipeIndex.keys().hasAny(['quantities']) : k>=15 ? q==before.recipeIndex.quantities :")
  if(name==='catalogMaterial')body=body.replace('index.quantities==oldIndex.quantities',"index.get('quantities',[])==oldIndex.get('quantities',[])")
  if(name==='catalogRoot')body=body.replace('touchedAt(s,resource.data.generation,o,0) && touchedAt(s,resource.data.generation,o,1) && touchedAt(s,resource.data.generation,o,2) &&','')
  if(name==='catalogReferenceProof'){const end=body.lastIndexOf(';');body=body.slice(0,end)+' && touchedAt(s,g,o,0) && touchedAt(s,g,o,1) && touchedAt(s,g,o,2)'+body.slice(end)}
  if(name==='catalogOperation'){
   body=replace(body,"o.collection in ['menus','addons','platforms'] && integer(o.counterIndex,-1,18) && (o.collection!='menus' || integer(o.counterIndex,0,3)) && (o.collection!='platforms' || integer(o.counterIndex,15,18) && platformAt(root.catalog,o.counterIndex-15))","o.collection=='addons' && integer(o.counterIndex,-1,14)")
   body=replace(body,"(o.collection=='platforms' || (o.collection=='addons' ? addonData(root.catalog,o.entityId) && getAfter(referencePath(s,g,id)).data.opId==id : getAfter(shapePath(s,g,id)).data.opId==id))","addonData(root.catalog,o.entityId) && getAfter(referencePath(s,g,id)).data.opId==id")
  }
  if(name==='addonMenuReferenceData')body=body.replace('return i>=c.menuIds.size() ||', "return i>=c.menuIds.size() || (c.addons[key].get('active',true) || !before.active || !(key in before.optionIds)) &&")
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
   // Bind the immutable complete price/coverage certificate here. Row7 moves
   // to the receipt, keeping this validator at ten dependent document reads.
   body=replace(body,'touchedAt(s,resource.data.generation,o,7) &&','')
   body=replace(body,'(o.lineWitnessCount<2 || preparedMatch(s,resource.data.generation,o.opId,o,resource.data.catalogRevision,1))','(o.materialIds.size()==15 || touchedAt(s,resource.data.generation,o,15)) && billCertificateMatch(s,resource.data.generation,o,resource.data.catalogRevision)')
  }
  if(name==='costs')body=replace(body,'rows[14][key];','rows[14][key]+(rows.size()==16 ? rows[15][key] : 0);')
  if(name==='validOrder'){
   body=replace(body,'o.inventory.size() == 15','o.inventory.size() in [15,16]')
  }
  if(name==='cancelOperation'){
   body=replace(body,'o.sourceRevisions.size()==15','o.materialIds.size() in [15,16] && o.sourceRevisions.size()==o.materialIds.size()')
   body=replace(body,'touched(s,g,o,14);','touched(s,g,o,14) && touched(s,g,o,15);')
  }
  if(['menuRoot','addonRoot','groupRoot','catalogRoot','menuOperation','addonOperation','groupOperation','catalogOperation','menuShapeProof','groupShapeProof','addonShapeProof','catalogReferenceProof'].includes(name))body=body.replace(/\s*&&\s*touched(?:At)?\([^)]*\)/g,'')
  if(['menuRoot','addonRoot','groupRoot','catalogRoot'].includes(name)){
   body=body.replace("c.diff(old).affectedKeys().hasOnly([", "c.diff(old).affectedKeys().hasOnly(['recipeRegistryIds',")
   const end=body.lastIndexOf(';');body=body.slice(0,end)+" && n.catalog.recipeRegistryIds==resource.data.get('materialIds',resource.data.catalog.summaryMaterials) && catalogRootChecksPresent(s,resource.data.generation,n.lastOpId,o)"+body.slice(end)
  }
  if(name==='catalogEdit')body=body.replace('c.keys().toSet()==old.keys().toSet()',"c.keys().toSet()==old.keys().concat(['recipeRegistryIds']).toSet()").replace("['addons','addonPrices','menus']", "['addons','addonPrices','menus','recipeRegistryIds']")
  if(['menuOperation','addonOperation','groupOperation','catalogOperation'].includes(name)){
   body=body.replace("'input','display','entitySnapshot'","'validationIds','input','display','entitySnapshot'")
   const end=body.lastIndexOf(';');body=body.slice(0,end)+' && catalogChecksPresent(s,g,id,o) && getAfter(catalogAdmissionPath(s,g,id)).data.opId==id'+body.slice(end)
  }
  if(name==='menuData')body=body.replace("'rawRecipe','hasPackage'","'baseMaterialIds','rawRecipe','hasPackage'").replaceAll('c.summaryMaterials',"c.get('recipeRegistryIds',c.summaryMaterials)").replace('return m.keys()',"return m.get('baseMaterialIds',m.recipe.keys()) is list && m.get('baseMaterialIds',m.recipe.keys()).size()<=16 && m.get('baseMaterialIds',m.recipe.keys()).toSet().size()==m.get('baseMaterialIds',m.recipe.keys()).size() && m.get('baseMaterialIds',m.recipe.keys()).hasOnly(m.recipe.keys()) && m.recipe.keys().hasOnly(m.get('rawRecipe',m.recipe).keys()) && m.keys()")
  if(name==='addonData')body=body.replace("['recipe','pricesCents','name','active']","['materialIds','recipe','pricesCents','name','active']").replaceAll('c.summaryMaterials',"c.get('recipeRegistryIds',c.summaryMaterials)").replace('return a.keys()',"return a.get('materialIds',a.recipe.keys()) is list && a.get('materialIds',a.recipe.keys()).size()<=16 && a.get('materialIds',a.recipe.keys()).toSet().size()==a.get('materialIds',a.recipe.keys()).size() && a.get('materialIds',a.recipe.keys()).hasOnly(a.recipe.keys()) && a.keys()")
  if(name==='addonShapeProof')body=body.replace("root.revision==o.shopRevision;", "root.revision==o.shopRevision && addonData(root.catalog,o.entityId);")
  if(name==='catalogInputReceipt')body=body.replace("a==n", "n.diff(a).affectedKeys().hasOnly(['materialIds'])").replace("'revision','choiceMaterials'","'baseMaterialIds','revision','choiceMaterials'")
  if(name==='catalogInputProof'){
   const end=body.lastIndexOf(';');body=body.slice(0,end)+" && o.validationIds is list && o.validationIds.size()<=16 && o.validationIds.toSet().size()==o.validationIds.size() && o.validationIds.toSet()==(o.kind=='group' ? [].toSet() : admissionRecipe(o.entitySnapshot,o.kind=='catalog'?'addon':o.kind).keys().toSet())"+body.slice(end)
  }
  if(name==='validRoot')body=replace(body,"['revision','lastOpId','lastOpKind']","['returnMaterials','revision','lastOpId','lastOpKind']").replace('next.revision == resource.data.revision + 1',"next.returnMaterials is map && next.returnMaterials.values().hasOnly([true]) && next.returnMaterials.keys().toSet()==resource.data.get('returnMaterials',{}).keys().concat(o.materialIds).toSet() && next.revision == resource.data.revision + 1")
  if(name==='materialArchiveMaterial')body=replace(body,'b.recipeIndex.menus.values().hasOnly([0]) && b.recipeIndex.addons.values().hasOnly([0])', 'materialReferenceReady(s,g,o)')
  if(name==='materialDeleteEligible'){
   body=replace(body,`m.get('productionRecipe',{}).size()==0 && m.recipeIndex.catalogRevision==root.catalogRevision &&
   m.recipeIndex.quantities.hasOnly([0]) && m.recipeIndex.menus.values().hasOnly([0]) && m.recipeIndex.addons.values().hasOnly([0])`,"m.get('productionRecipe',{}).size()==0 && !root.get('returnMaterials',{}).get(id,false)")
  }
  if(name==='materialDeleteCommit')body=replace(body,'materialDeleteEligible(b,m,o.materialId)', 'materialDeleteEligible(b,m,o.materialId) && materialReferenceReady(s,g,o)')
  return body
 }
 const bodies=new Map([...functions].filter(([name])=>selected.has(name)).map(([name,body])=>[name,extend(name,body)]))
 // Flatten collection matches and keep single-surface helpers local. Inheriting
 // every validator into every nested match exhausts the production compiler's
 // scope traversal stack even when the emulator accepts the same source.
 const scopes=[]
 function flatten(text,parent=''){
  const pattern=/match\s+(.+?)\s+\{/g
  let match
  while((match=pattern.exec(text))){
   const start=pattern.lastIndex;let end=start,depth=1
   while(depth&&end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++}
   const body=text.slice(start,end-1),path=parent+match[1]
   const children=flatten(body,path)
   const direct=children.reduceRight((value,child)=>value.slice(0,child.start)+value.slice(child.end),body)
   scopes.push({path,body:direct,needed:new Set()})
   pattern.lastIndex=end
  }
  const spans=[];pattern.lastIndex=0
  while((match=pattern.exec(text))){let end=pattern.lastIndex,depth=1;while(depth&&end<text.length){if(text[end]==='{')depth++;if(text[end]==='}')depth--;end++}spans.push({start:match.index,end});pattern.lastIndex=end}
  return spans
 }
 flatten(matches)
 for(const scope of scopes){
  function need(text){for(const m of text.matchAll(/\b(\w+)\s*\(/g))if(bodies.has(m[1])&&!scope.needed.has(m[1])){scope.needed.add(m[1]);need(bodies.get(m[1]))}}
  need(scope.body)
 }
 const owners=new Map([...bodies.keys()].map(name=>[name,scopes.filter(scope=>scope.needed.has(name))]))
 const shared=[...bodies].filter(([name])=>owners.get(name).length>1).map(([,body])=>body)
 const scoped=scopes.map(scope=>{
  const local=[...bodies].filter(([name])=>owners.get(name).length===1&&scope.needed.has(name)).map(([,body])=>body)
  const path=scope.path.replace('/shops/{s}',`/shops/${shopId}`),body=scope.body.trim().replace(/[ \t]+$/gm,'').replace(/\bs\b/g,`'${shopId}'`)
  return `match ${path} {\n${local.join('\n')}\n${body}\n}`
 }).join('\n')
 const result=`rules_version = '2';\nservice cloud.firestore {\nmatch /databases/{database}/documents {\n${shared.join('\n')}\n${scoped}\n}\n}\n`.replace(/[ \t]+$/gm,'')
 return compact ? compactRules(result) : result
}
