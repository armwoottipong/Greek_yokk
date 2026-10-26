// Trusted, offline import compiler. Never bundled into the browser.
// The projection compiler is shared with the independent policy proof fixtures;
// originals are archived separately so normalization cannot erase source records.
import {projectCoreSource} from './core-source.js'
import {encodeLegacyId as key} from '../src/cloud/paths.js'
import {auditMaterialProfile,commitMetrics} from '../src/cloud/core/model/metrics.js'
import {summaryMenuQuantity} from '../src/cloud/core/model/recipe.js'
import {maxSaleLines} from '../src/cloud/core/model/limits.js'
const collections=['materials','menus','addons','addonGroups','platforms','orders','activityLogs','stockShortages']
const headerFields=['schemaVersion','revision','categories','exportDate','system']
const identical=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export function validateInitialCore(shop,materials){
 const errors=[...auditMaterialProfile(shop,materials).violations],c=shop.catalog
 const ids=materials.map(m=>m.id),ordered=[...materials].sort((a,b)=>a.costRank-b.costRank)
 if(ordered.some((m,i)=>m.costRank!==i)||!identical(ordered.map(m=>m.id),shop.materialIds))errors.push('RANK_ORDER')
 const reverse=Object.fromEntries(ids.map(id=>[id,[]]))
 for(const m of ordered){
  if(m.revision!==1||typeof m.deleted!=='boolean'||!['ingredient','packaging'].includes(m.inventoryType))errors.push('MATERIAL_SHAPE')
  if(m.recipeIndex.catalogRevision!==shop.catalogRevision)errors.push('RECIPE_REVISION')
  for(const id of c.menuIds)if(m.recipeIndex.menus[id]!==summaryMenuQuantity(c.menus[id],m))errors.push('MENU_INDEX')
  for(const id of c.addonIds)if(m.recipeIndex.addons[id]!== (c.addons[id].recipe[m.id]||0))errors.push('ADDON_INDEX')
  if(!identical(Object.keys(m.recipeIndex.menus).sort(),['_',...c.menuIds].sort())||!identical(Object.keys(m.recipeIndex.addons).sort(),['_',...c.addonIds].sort())||m.recipeIndex.menus._!==0||m.recipeIndex.addons._!==0)errors.push('INDEX_KEYS')
  const live=m.lotIds.filter(id=>m.lotQty[id]>0||m.zeroActiveIds.includes(id))
  const inUse=id=>m.lotQty[id]>0?m.activeLotId===id:m.zeroActiveIds.includes(id)
  live.sort((a,b)=>Number(inUse(b))-Number(inUse(a))||m.lots[a].expiryDay-m.lots[b].expiryDay||m.lots[a].receiveDay-m.lots[b].receiveDay||m.lots[a].ordinal-m.lots[b].ordinal)
  if(!identical(live,m.allocationIds)||new Set(m.zeroActiveIds).size!==m.zeroActiveIds.length||m.zeroActiveIds.some(id=>!m.lotIds.includes(id)||m.lotQty[id]!==0))errors.push('LOT_ORDER')
  if(m.lotIds.some((id,i)=>m.lots[id].id!==id||m.lots[id].ordinal!==i||m.lots[id].sortKey!==m.lots[id].expiryDay*1e9+m.lots[id].receiveDay*1000+i))errors.push('LOT_METADATA')
  const r=m.productionRecipe
  if(r){
   if(!Number.isSafeInteger(r.yieldQ)||r.yieldQ<1||r.inputIds.length<1||r.inputIds.length>2||r.inputIds.length!==r.quantities.length||new Set(r.inputIds).size!==r.inputIds.length)errors.push('PRODUCTION')
   r.inputIds.forEach((id,i)=>{const input=materials.find(x=>x.id===id);if(!input||input.deleted||input.inventoryType!=='ingredient'||id===m.id||!Number.isSafeInteger(r.quantities[i])||r.quantities[i]<1)errors.push('PRODUCTION_REFERENCE');else reverse[id].push(m.id)})
  }
 }
 if(!identical(reverse,shop.productionUsers))errors.push('PRODUCTION_INDEX')
 for(const [names,map] of [[c.menuIds,c.menus],[c.addonIds,c.addons],[c.platformIds,c.platforms],[c.groupIds,c.groups]]){
  if(new Set(names).size!==names.length||!identical([...names].sort(),Object.keys(map).sort()))errors.push('CATALOG_KEYS')
 }
 for(const row of [...Object.values(c.menus),...Object.values(c.addons)]){
  for(const [id,q] of Object.entries(row.rawRecipe||row.recipe))if(!c.summaryMaterials.includes(id)||!Number.isSafeInteger(q)||q<0)errors.push('RECIPE_REFERENCE')
 }
 const referenced=new Set([...Object.values(c.menus).flatMap(m=>Object.keys(m.rawRecipe||m.recipe)),...Object.values(c.addons).flatMap(a=>Object.keys(a.recipe))])
 if(!identical([...referenced].sort(),[...c.summaryMaterials].sort())||c.summaryMaterials.some(id=>materials.find(m=>m.id===id)?.deleted))errors.push('PROTECTED_REFERENCES')
 for(const m of Object.values(c.menus)){
  if(m.active&&c.platformIds.some(p=>c.platforms[p].active&&(!Number.isSafeInteger(m.pricesCents[p])||m.pricesCents[p]<0)))errors.push('MENU_PRICE')
 }
 for(const p of c.platformIds){
  if(!Number.isSafeInteger(c.platforms[p].gpBasisPoints)||c.platforms[p].gpBasisPoints<0||c.platforms[p].gpBasisPoints>10000)errors.push('PLATFORM_GP')
  if(c.addonIds.some(id=>!Number.isSafeInteger(c.addonPrices[p][id])||c.addonPrices[p][id]<0))errors.push('ADDON_PRICE')
 }
 for(const [id,g] of Object.entries(c.groups)){
  const assigned=Object.values(c.menus).filter(m=>(m.groupIds||[m.groupId]).includes(id)).map(m=>m.id)
  if(!identical(assigned.sort(),[...g.menuIds].sort())||new Set(g.optionIds).size!==g.optionIds.length||g.optionIds.some(id=>!c.addonIds.includes(id))||!Number.isInteger(g.min)||!Number.isInteger(g.max)||g.min<0||g.max<g.min||g.max>11||typeof g.allowRepeat!=='boolean')errors.push('GROUP_INDEX')
 }
 if(errors.length)throw new Error(`Invalid initial core: ${[...new Set(errors)].join(',')}`)
 return {materials:ids.length,protectedMaterials:c.summaryMaterials.length}
}
export function compileCoreImport(raw,{shopId='greek-yogg',generation,sourceSha256,trial=true}={}){
 if(!trial||!/^g_trial_[A-Za-z0-9_-]+$/.test(generation||'')||!/^[a-f0-9]{64}$/.test(sourceSha256||''))throw new Error('Trial import metadata required')
 if(Object.keys(raw).some(k=>![...collections,...headerFields,'gasApiUrl'].includes(k)))throw new Error('Unknown backup field')
 for(const kind of collections)if(raw[kind]!==undefined&&!Array.isArray(raw[kind]))throw new Error('Invalid backup collection')
 // Historical schemas are archived verbatim, never reinterpreted as new receipts.
 const f=projectCoreSource(raw),shop={...f.shop,generation},materials=f.materials
 const report=validateInitialCore(shop,materials),base=`shops/${shopId}/generations/${generation}`
 const archive=[]
 const header=Object.fromEntries(headerFields.filter(k=>Object.hasOwn(raw,k)).map(k=>[k,raw[k]]))
 archive.push({path:`${base}/legacyRecords/header`,data:{kind:'header',index:0,json:JSON.stringify(header)}})
 for(const kind of collections)(raw[kind]||[]).forEach((row,index)=>archive.push({path:`${base}/legacyRecords/${kind}_${index}`,data:{kind,index,json:JSON.stringify(row)}}))
 const labels=kind=>Object.fromEntries((raw[kind]||[]).map(row=>[key(row.id),{name:row.name||row.id,emoji:row.emoji||''}]))
 const display={trial:true,sourceSha256,sourceDate:raw.exportDate||'',legacyOrderCount:raw.orders?.length||0,menus:labels('menus'),addons:labels('addons'),platforms:labels('platforms')}
 const documents=[...materials.map(m=>({path:`${base}/materials/${m.id}`,data:m})),{path:`${base}/display/catalog`,data:display},...archive]
 const writes=[{path:`shops/${shopId}`,data:shop},...documents]
 const metrics=commitMetrics('projects/yoggie-db/databases/(default)',writes)
 if(metrics.violations.length||metrics.maxDocumentBytes>800000||metrics.wireBytes>8*1024*1024)throw new Error('Import size limit')
 // Independently prove every original record and header survived byte-for-byte JSON.
 for(const kind of collections){const restored=archive.filter(d=>d.data.kind===kind).map(d=>JSON.parse(d.data.json));if(!identical(restored,raw[kind]||[]))throw new Error('Archive mismatch')}
 return {shop,documents,report:{...report,maxSaleLines:maxSaleLines(shop),trial:true,generation,sourceSha256,records:archive.length,orders:raw.orders?.length||0,logs:raw.activityLogs?.length||0,...metrics}}
}
