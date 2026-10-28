// Portable, read-only planning. This module has no credentials, network or writes.
import {auditRecoveryProtocol} from './recovery-audit.js'
import {planBackupRehearsal,decodeRehearsalValue} from './backup-rehearsal.js'
import {encodeBackupValue,createBusinessBackup,BACKUP_FORMAT,MAX_BACKUP_BYTES} from '../src/cloud/core/businessBackup.js'
export const recoveryError=code=>Object.assign(new Error(code),{code})
export const canonicalRecovery=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
export async function recoveryHash(value){return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalRecovery(value))))].map(n=>n.toString(16).padStart(2,'0')).join('')}
const id=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(value)
const validTime=value=>typeof value==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value)&&Number.isFinite(Date.parse(value))
async function validateBackup(text){
 if(typeof text!=='string'||text.length>MAX_BACKUP_BYTES||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw recoveryError('BACKUP_INVALID_FILE')
 // Reuse the tested snapshot decoder/registry/archive validation without granting
 // its emulator-only planner any production connection or relaxing its guard.
 const source=JSON.parse(text)
 let generation='g_restore_owner_validation'
 if(source?.payload?.generation===generation)generation+='2'
 const rehearsal=await planBackupRehearsal(text,{host:'127.0.0.1:8088',projectId:'demo-greek-yogg-restore',shopId:'restore-shop',generation})
 return {source,rehearsal}
}
export async function inspectOwnerBackup(text){
 try{
  if(typeof text!=='string'||text.length>MAX_BACKUP_BYTES||new TextEncoder().encode(text).length>MAX_BACKUP_BYTES)throw recoveryError('BACKUP_INVALID_FILE')
  let parsed;try{parsed=JSON.parse(text)}catch{throw recoveryError('BACKUP_INVALID_FILE')}
  if(parsed?.format!==BACKUP_FORMAT)throw recoveryError('LEGACY_IMPORT_REQUIRES_SEPARATE_VALIDATED_COMPILER')
  const {source}=await validateBackup(text),p=source.payload
  return {format:source.format,source:{projectId:p.projectId,shopId:p.shopId,generation:p.generation,revision:p.revision,date:p.exportedAt||null,purpose:p.ownerRecoveryPurpose||'restore'},counts:{...p.counts},checksum:source.integrity.sha256,issues:[],ready:true,limitations:['Snapshot excludes preparation certificates, authentication, carts and pending commands.','Historical archives without manifests cannot prove missing trailing non-order records.','Owner activation currently admits at most 450 business documents.']}
 }catch(error){return {format:null,source:null,counts:{},checksum:null,issues:[error.code||'BACKUP_INVALID_FILE'],ready:false}}
}
export async function prepareOwnerRecovery({backup,projectId,shopId,generationId,baseline}={}){
 if(!id(projectId)||!id(shopId)||!/^g_restore_[A-Za-z0-9_-]{1,100}$/.test(generationId||''))throw recoveryError('RECOVERY_TARGET_REQUIRED')
 let before;try{before=decodeRehearsalValue(baseline?.root)}catch{throw recoveryError('LIVE_BASELINE_REQUIRED')}
 if(before?.status!=='active'||!id(before.generation)||!Number.isSafeInteger(before.revision)||before.revision<0||before.revision>=Number.MAX_SAFE_INTEGER-1||!validTime(baseline.updateTime))throw recoveryError('LIVE_BASELINE_REQUIRED')
 const {source,rehearsal}=await validateBackup(backup),p=source.payload
 if(p.revision>=Number.MAX_SAFE_INTEGER-1)throw recoveryError('RECOVERY_REVISION_EXHAUSTED')
 if(generationId===before.generation||generationId===p.generation)throw recoveryError('NEW_GENERATION_REQUIRED')
 const rootPath=`shops/${shopId}`,generationPath=`${rootPath}/generations/${generationId}`
 const restored=decodeRehearsalValue(p.root)
 const decodedRows=Object.fromEntries(Object.entries(p.collections).map(([name,entries])=>[name,entries.map(r=>({id:r.id,data:decodeRehearsalValue(r.data)}))]))
 const documents=rehearsal.documents.slice(1).map(row=>({path:row.path.replace(/^shops\/restore-shop\/generations\/[^/]+/,generationPath),data:encodeBackupValue(row.data)}))
 // Verify preconditions are included in the activation commit for every staged
 // document. Bound that commit below Firestore's 500-write limit.
 if(documents.length>450)throw recoveryError('RECOVERY_ATOMIC_VERIFY_LIMIT_450')
 auditRecoveryProtocol(restored,decodedRows)
 // Authentication is live shop policy, never business backup data. Restoring,
 // resetting or loading a demo must preserve the current list exactly.
 delete restored.allowedEmails
 if(Object.hasOwn(before,'allowedEmails'))restored.allowedEmails=structuredClone(before.allowedEmails)
 const plan={format:'greek-yogg.owner-recovery-plan',version:1,projectId,shopId,generationId,rootPath,generationPath,source:{projectId:p.projectId,shopId:p.shopId,generation:p.generation,revision:p.revision,checksum:source.integrity.sha256,purpose:p.ownerRecoveryPurpose||'restore'},counts:p.counts,baseline:{root:baseline.root,updateTime:baseline.updateTime},root:encodeBackupValue({...restored,generation:generationId,revision:Math.max(before.revision,p.revision)+1}),documents}
 for(const data of [plan.root,...documents.map(d=>d.data)])if(new TextEncoder().encode(canonicalRecovery(data)).length>800000)throw recoveryError('RECOVERY_DOCUMENT_TOO_LARGE')
 return {...plan,hash:await recoveryHash(plan)}
}
export async function prepareOwnerReset({projectId,shopId,generationId,baseline}={}){
 let previous,display
 try{previous=decodeRehearsalValue(baseline?.root);display=decodeRehearsalValue(baseline?.display)}catch{throw recoveryError('RESET_PLATFORM_SETTINGS_REQUIRED')}
 const ids=previous?.catalog?.platformIds,platforms=previous?.catalog?.platforms,labels=display?.platforms
 if(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4||!platforms||Object.keys(platforms).length!==4||ids.some(k=>!id(k)||!platforms[k]||!Number.isSafeInteger(platforms[k].revision)||platforms[k].revision<1||typeof platforms[k].active!=='boolean'||!Number.isInteger(platforms[k].gpBasisPoints)||platforms[k].gpBasisPoints<0||platforms[k].gpBasisPoints>=10000||typeof labels?.[k]?.name!=='string'||!labels[k].name))throw recoveryError('RESET_PLATFORM_SETTINGS_REQUIRED')
 const root={status:'active',generation:previous.generation,revision:previous.revision,lastOpId:'',catalogRevision:1,materialIds:[],productionUsers:{},returnMaterials:{},catalog:{platformIds:[...ids],platforms:structuredClone(platforms),menus:{},menuIds:[],addons:{},addonIds:[],addonPrices:Object.fromEntries(ids.map(k=>[k,{_:0}])),groups:{},groupIds:[],counterIds:Array(15).fill('_'),summaryMaterials:[],recipeRegistryIds:[]}}
 if(Object.hasOwn(previous,'legacyMaterialCategories'))root.legacyMaterialCategories=structuredClone(previous.legacyMaterialCategories)
 const collections={materials:[],display:[{id:'catalog',data:encodeBackupValue({legacyOrderCount:0,platforms:Object.fromEntries(ids.map(k=>[k,structuredClone(labels[k])])),menus:{},addons:{},groups:{},recoveryPurpose:'reset'})}],orders:[],operations:[],legacyRecords:[]}
 const file=await createBusinessBackup({scope:'business-snapshot',ownerRecoveryPurpose:'reset',projectId,shopId,generation:previous.generation,revision:previous.revision,root:encodeBackupValue(root),collections,counts:Object.fromEntries(Object.entries(collections).map(([k,rows])=>[k,rows.length]))})
 return prepareOwnerRecovery({backup:JSON.stringify(file),projectId,shopId,generationId,baseline})
}
export async function verifyOwnerRecoveryPlan(plan){
 const {hash,...body}=plan||{}
 if(!/^[a-f0-9]{64}$/.test(hash||'')||await recoveryHash(body)!==hash)throw recoveryError('PLAN_HASH_MISMATCH')
 if(body.format!=='greek-yogg.owner-recovery-plan'||body.version!==1||!id(body.projectId)||!id(body.shopId)||!/^g_restore_[A-Za-z0-9_-]{1,100}$/.test(body.generationId)||body.rootPath!==`shops/${body.shopId}`||body.generationPath!==`${body.rootPath}/generations/${body.generationId}`||!Array.isArray(body.documents)||!body.documents.length||body.documents.length>450)throw recoveryError('INVALID_RECOVERY_PLAN')
 const baseline=decodeRehearsalValue(body.baseline?.root),root=decodeRehearsalValue(body.root)
 if(Object.hasOwn(baseline,'allowedEmails')!==Object.hasOwn(root,'allowedEmails')||canonicalRecovery(baseline.allowedEmails)!==canonicalRecovery(root.allowedEmails))throw recoveryError('RECOVERY_ACCESS_POLICY_CHANGED')
 if(!validTime(body.baseline.updateTime)||baseline.status!=='active'||root.status!=='active'||root.generation!==body.generationId||baseline.generation===root.generation||!Number.isSafeInteger(baseline.revision)||!Number.isSafeInteger(body.source?.revision)||root.revision!==Math.max(baseline.revision,body.source.revision)+1||root.revision>=Number.MAX_SAFE_INTEGER)throw recoveryError('INVALID_RECOVERY_PLAN')
 if(new Set(body.documents.map(d=>d.path)).size!==body.documents.length)throw recoveryError('INVALID_RECOVERY_PLAN')
 for(const d of body.documents){const suffix=d.path?.slice(body.generationPath.length+1);if(!d.path?.startsWith(body.generationPath+'/')||! /^(materials|display|orders|operations|legacyRecords)\/[A-Za-z0-9_-]{1,200}$/.test(suffix))throw recoveryError('INVALID_RECOVERY_PLAN');decodeRehearsalValue(d.data)}
 const collections=Object.fromEntries(['materials','display','orders','operations','legacyRecords'].map(name=>[name,[]]))
 for(const d of body.documents){const [name,id]=d.path.slice(body.generationPath.length+1).split('/');collections[name].push({id,data:d.data})}
 for(const data of [body.root,...body.documents.map(d=>d.data)])if(new TextEncoder().encode(canonicalRecovery(data)).length>800000)throw recoveryError('RECOVERY_DOCUMENT_TOO_LARGE')
 const snapshot=await createBusinessBackup({scope:'business-snapshot',projectId:body.projectId,shopId:body.shopId,generation:body.generationId,revision:root.revision,root:body.root,collections,counts:body.counts})
 await validateBackup(JSON.stringify(snapshot))
 auditRecoveryProtocol(root,Object.fromEntries(Object.entries(collections).map(([name,entries])=>[name,entries.map(r=>({id:r.id,data:decodeRehearsalValue(r.data)}))])))
 return true
}
