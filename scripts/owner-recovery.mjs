// Owner workstation only. Importing this module never authenticates or writes.
import {readFile,writeFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
import {pathToFileURL} from 'node:url'
import process from 'node:process'
import {compileOwnerLegacy,compileOwnerDemo,migrateLegacyReceipts} from './owner-imports.mjs'
import {Timestamp} from 'firebase/firestore'
import {canonicalRecovery,recoveryError,prepareOwnerRecovery,prepareOwnerReset,verifyOwnerRecoveryPlan} from './recovery-plan.js'
import {decodeRehearsalValue} from './backup-rehearsal.js'
import {encodeBackupValue} from '../src/cloud/core/businessBackup.js'
const same=(a,b)=>canonicalRecovery(a)===canonicalRecovery(b)
async function reviewed(plan,options){await verifyOwnerRecoveryPlan(plan);if(options.activate&&!options.apply)throw recoveryError('APPLY_REQUIRED');if(options.apply&&options.reviewedHash!==plan.hash)throw recoveryError('REVIEWED_HASH_REQUIRED')}
async function guardBaseline(plan,api){const root=await api.get(plan.rootPath);if(!root||root.updateTime!==plan.baseline.updateTime||!same(root.data,plan.baseline.root))throw recoveryError('LIVE_BASELINE_CHANGED');return root}
const marker=plan=>encodeBackupValue({format:'greek-yogg.owner-recovery-stage',version:1,planHash:plan.hash,sourceChecksum:plan.source.checksum})
async function verifyStage(plan,api){
 const manifest=await api.get(plan.generationPath);if(!manifest||!same(manifest.data,marker(plan)))throw recoveryError('STAGED_READBACK_MISMATCH')
 const rows=await api.listGeneration(plan.generationPath)
 if(rows.length!==plan.documents.length)throw recoveryError('STAGED_READBACK_MISMATCH')
 const actual=new Map(rows.map(row=>[row.path,row]));if(actual.size!==rows.length)throw recoveryError('STAGED_READBACK_MISMATCH')
 const verified=[]
 for(const d of plan.documents){const row=actual.get(d.path);if(!row?.updateTime||!same(row.data,d.data))throw recoveryError('STAGED_READBACK_MISMATCH');verified.push({path:d.path,verify:true,updateTime:row.updateTime})}
 return [...verified,{path:plan.generationPath,verify:true,updateTime:manifest.updateTime}]
}
export async function executeOwnerRecovery(plan,api,options={}){
 await reviewed(plan,options);await guardBaseline(plan,api)
 if(!options.apply)return {mode:'dry-run',planHash:plan.hash,counts:plan.counts,writes:0}
 if(!options.activate){
  if(await api.get(plan.generationPath)||(await api.listGeneration(plan.generationPath)).length)throw recoveryError('NEW_GENERATION_REQUIRED')
  await api.commit([{path:plan.generationPath,data:marker(plan),exists:false}])
  let batch=[],bytes=0
  for(const d of plan.documents){const size=new TextEncoder().encode(canonicalRecovery(d)).length;if(batch.length&&(batch.length===100||bytes+size>7*1024*1024)){await api.commit(batch);batch=[];bytes=0}batch.push({...d,exists:false});bytes+=size}
  if(batch.length)await api.commit(batch)
  await verifyStage(plan,api);await guardBaseline(plan,api)
  return {mode:'staged',planHash:plan.hash,counts:plan.counts,rootUnchanged:true}
 }
 const verify=await verifyStage(plan,api)
 await guardBaseline(plan,api)
 // Every read-back stage document is a verify write in this atomic commit.
 // Concurrent owner changes to a staged field or live root fail the whole CAS.
 await api.commit([...verify,{path:plan.rootPath,data:plan.root,updateTime:plan.baseline.updateTime}])
 const current=await api.get(plan.rootPath)
 if(!current||!same(current.data,plan.root))throw recoveryError('ACTIVATION_READBACK_MISMATCH')
 return {format:'greek-yogg.owner-recovery-receipt',version:1,mode:'activated',planHash:plan.hash,projectId:plan.projectId,rootPath:plan.rootPath,activatedRoot:current.data,activatedUpdateTime:current.updateTime,oldGenerationRetained:true}
}
export async function rollbackOwnerRecovery(plan,receipt,api,options={}){
 await reviewed(plan,options)
 if(receipt?.format!=='greek-yogg.owner-recovery-receipt'||receipt.version!==1||receipt.mode!=='activated'||receipt.planHash!==plan.hash||receipt.projectId!==plan.projectId||receipt.rootPath!==plan.rootPath||!same(receipt.activatedRoot,plan.root)||typeof receipt.activatedUpdateTime!=='string')throw recoveryError('INVALID_ACTIVATION_RECEIPT')
 const current=await api.get(plan.rootPath)
 if(!current||current.updateTime!==receipt.activatedUpdateTime||!same(current.data,plan.root))throw recoveryError('ROLLBACK_WINDOW_CLOSED')
 if(!options.apply)return {mode:'rollback-dry-run',planHash:plan.hash,writes:0}
 const previous=decodeRehearsalValue(plan.baseline.root),active=decodeRehearsalValue(plan.root),root=encodeBackupValue({...previous,revision:active.revision+1})
 await api.commit([{path:plan.rootPath,data:root,updateTime:receipt.activatedUpdateTime}])
 const actual=await api.get(plan.rootPath);if(!actual||!same(actual.data,root))throw recoveryError('ROLLBACK_READBACK_MISMATCH')
 return {mode:'rolled-back',planHash:plan.hash,rootUpdateTime:actual.updateTime,restoredGeneration:previous.generation,revision:active.revision+1}
}
export function parseOwnerRecoveryArgs(args){
 const values=new Set(['backup','plan','project','shop','generation','account','reviewed-hash','receipt','out']),flags=new Set(['apply','activate','rollback','reset','demo','legacy','migrate-legacy']),result={apply:false,activate:false,rollback:false,reset:false},seen=new Set()
 for(let i=0;i<args.length;i++){const token=args[i],key=token?.startsWith('--')?token.slice(2):'';if(!values.has(key)&&!flags.has(key)||seen.has(key))throw recoveryError('INVALID_CLI_ARGUMENTS');seen.add(key);const name=key==='reviewed-hash'?'reviewedHash':key==='migrate-legacy'?'migrateLegacy':key
  if(flags.has(key))result[name]=true;else{if(!args[i+1]||args[i+1].startsWith('--'))throw recoveryError('INVALID_CLI_ARGUMENTS');result[name]=args[++i]}
 }
 if(result.activate&&!result.apply||result.rollback&&result.activate||result.apply&&(!result.reviewedHash||!result.out)||result.rollback&&(!result.receipt||!result.plan)||result.receipt&&!result.rollback||result.plan&&result.backup||(result.reset||result.demo)&&(result.backup||result.plan||result.apply||result.rollback)||result.demo&&result.reset||result.legacy&&!result.backup||result.migrateLegacy&&!result.backup)throw recoveryError('INVALID_CLI_ARGUMENTS')
 return result
}
// Firestore REST uses RFC3339 strings; backup JSON preserves nanoseconds exactly.
export function decodeRestDocument(document){
 if(!document)return null
 function value(v){
  if(Object.hasOwn(v,'timestampValue')){const raw=v.timestampValue;if(typeof raw!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(raw))throw recoveryError('UNSUPPORTED_SERVER_VALUE');const seconds=Math.floor(Date.parse(raw)/1000),nanoseconds=Number((raw.match(/\.(\d+)Z$/)?.[1]||'').padEnd(9,'0'));return encodeBackupValue(new Timestamp(seconds,nanoseconds))}
  if(Object.hasOwn(v,'arrayValue'))return {arrayValue:{values:(v.arrayValue.values||[]).map(value)}}
  if(Object.hasOwn(v,'mapValue'))return {mapValue:{fields:Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,value(x)]))}}
  decodeRehearsalValue(v);return v
 }
 return {data:value({mapValue:{fields:document.fields||{}}}),updateTime:document.updateTime}
}
export function encodeRestValue(v){
 if(Object.hasOwn(v,'timestampValue')){const {seconds,nanoseconds}=v.timestampValue;return {timestampValue:new Date(seconds*1000).toISOString().replace(/\.\d{3}Z$/,'.'+String(nanoseconds).padStart(9,'0')+'Z')}}
 if(v.arrayValue)return {arrayValue:{values:v.arrayValue.values.map(encodeRestValue)}}
 if(v.mapValue)return {mapValue:{fields:Object.fromEntries(Object.entries(v.mapValue.fields).map(([k,x])=>[k,encodeRestValue(x)]))}}
 return v
}
export async function createOwnerApi({projectId,account}){
 if(!/^[A-Za-z0-9_-]{1,200}$/.test(projectId||'')||typeof account!=='string'||!account.includes('@'))throw recoveryError('EXPLICIT_OWNER_ACCOUNT_AND_PROJECT_REQUIRED')
 if(process.env.FIREBASE_TOKEN||process.env.GOOGLE_APPLICATION_CREDENTIALS||process.env.FIRESTORE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)throw recoveryError('USE_OWNER_FIREBASE_LOGIN_ONLY')
 const require=createRequire(import.meta.url)
 // No Firebase debug/HTTP body logging, even if workstation debug is enabled.
 require('firebase-tools/lib/logger.js').logger.silent=true
 const auth=require('firebase-tools/lib/auth.js'),current=auth.getGlobalDefaultAccount()
 if(!current?.user?.email||current.user.email!==account||!current.tokens)throw recoveryError('OWNER_ACCOUNT_MISMATCH')
 const email=await require('firebase-tools/lib/requireAuth.js').requireAuth({project:projectId,...current},true)
 if(email!==account)throw recoveryError('OWNER_ACCOUNT_MISMATCH')
 const {Client}=require('firebase-tools/lib/apiv2.js'),quiet={skipLog:{body:true,resBody:true,queryParams:true}},database=`projects/${projectId}/databases/(default)`,prefix=`/${database}/documents/`
 const firebase=new Client({urlPrefix:'https://firebase.googleapis.com',apiVersion:'v1beta1'}),crm=new Client({urlPrefix:'https://cloudresourcemanager.googleapis.com',apiVersion:'v1'}),identity=new Client({urlPrefix:'https://openidconnect.googleapis.com',apiVersion:'v1'})
 const checked=async(stage,work)=>{try{return await work()}catch{throw recoveryError('OWNER_'+stage+'_FAILED')}}
 const principal=(await checked('IDENTITY',()=>identity.get('/userinfo',quiet))).body
 if(principal.email!==account||principal.email_verified!==true)throw recoveryError('OWNER_ACCOUNT_MISMATCH')
 const project=(await checked('PROJECT',()=>firebase.get(`/projects/${projectId}`,quiet))).body
 if(project.projectId!==projectId||project.state!=='ACTIVE')throw recoveryError('PROJECT_IDENTITY_MISMATCH')
 const permissions=['datastore.databases.get','datastore.entities.get','datastore.entities.list','datastore.entities.create','datastore.entities.update']
 const granted=(await checked('IAM',()=>crm.post(`/projects/${projectId}:testIamPermissions`,{permissions},quiet))).body.permissions||[]
 if(permissions.some(p=>!granted.includes(p)))throw recoveryError('OWNER_IAM_PERMISSIONS_REQUIRED')
 const api={
  async request(path,body,options={}){
   const credential=await auth.getAccessToken(current.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform','https://www.googleapis.com/auth/firebase'])
   const url=new URL('https://firestore.googleapis.com/v1'+path)
   for(const [key,value] of Object.entries(options.queryParams||{}))url.searchParams.set(key,value)
   const response=await fetch(url,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+credential.access_token,'Content-Type':'application/json'},...body?{body:JSON.stringify(body)}:{}})
   if(!response.ok){const error=recoveryError('OWNER_FIRESTORE_REQUEST_FAILED');error.status=response.status;throw error}
   return {body:await response.json()}
  },get(path,options){return this.request(path,null,options)},post(path,body,options){return this.request(path,body,options)}
 }
 await checked('DATABASE',()=>api.get(`/${database}`,quiet))
 const get=async path=>{try{return decodeRestDocument((await api.get(prefix+path,quiet)).body)}catch(e){if(e.status===404||e.context?.response?.statusCode===404)return null;throw e}}
 const listGeneration=async path=>{
  let token,collections=[]
  do{const page=(await api.post(prefix+path+':listCollectionIds',{pageSize:100,...token?{pageToken:token}:{}},quiet)).body;collections.push(...page.collectionIds||[]);token=page.nextPageToken}while(token)
  if(collections.some(c=>!['materials','display','orders','operations','legacyRecords'].includes(c)))throw recoveryError('UNEXPECTED_STAGED_COLLECTION')
  const rows=[]
  for(const collection of collections){token=undefined;do{const page=(await api.get(prefix+path+'/'+collection,{...quiet,queryParams:{pageSize:100,...token?{pageToken:token}:{}}})).body;for(const d of page.documents||[]){if(!d.name.startsWith(database+'/documents/'))throw recoveryError('SERVER_PATH_MISMATCH');rows.push({path:d.name.slice((database+'/documents/').length),...decodeRestDocument(d)})}token=page.nextPageToken}while(token)}
  return rows
 }
 const commit=async writes=>{
  const body={writes:writes.map(w=>({...w.verify?{verify:database+'/documents/'+w.path}:{update:{name:database+'/documents/'+w.path,fields:encodeRestValue(w.data).mapValue.fields}},currentDocument:w.updateTime?{updateTime:w.updateTime}:{exists:w.exists}}))}
  await api.post(`/${database}/documents:commit`,body,quiet)
 }
 return {get,listGeneration,commit,identity:{projectId,account,permissionsVerified:true}}
}
async function main(){
 const o=parseOwnerRecoveryArgs(process.argv.slice(2))
 if(!o.account||!o.project||!o.plan&&(!o.backup&&!o.reset&&!o.demo||!o.shop||!o.generation))throw recoveryError('USAGE_REQUIRED')
 let plan=o.plan?JSON.parse(await readFile(o.plan,'utf8')):null
 if(plan){await verifyOwnerRecoveryPlan(plan);if(plan.projectId!==o.project||o.shop&&o.shop!==plan.shopId||o.generation&&o.generation!==plan.generationId)throw recoveryError('PLAN_TARGET_MISMATCH')}
 if(!o.plan&&o.apply)throw recoveryError('REVIEWED_PLAN_FILE_REQUIRED')
 const api=await createOwnerApi({projectId:o.project,account:o.account})
 if(!plan){
  const root=await api.get(`shops/${o.shop}`);if(!root)throw recoveryError('LIVE_BASELINE_REQUIRED')
  const baseline={root:root.data,updateTime:root.updateTime},target={projectId:o.project,shopId:o.shop,generationId:o.generation,baseline}
  if(o.reset){const live=decodeRehearsalValue(root.data),display=await api.get(`shops/${o.shop}/generations/${live.generation}/display/catalog`);baseline.display=display?.data;plan=await prepareOwnerReset(target)}
  else {let backup=o.demo?await compileOwnerDemo():await readFile(o.backup,'utf8');if(o.legacy)backup=await compileOwnerLegacy(backup);if(o.migrateLegacy)backup=await migrateLegacyReceipts(backup);plan=await prepareOwnerRecovery({...target,backup})}
 }
 // Reserve a new private result file before the first cloud mutation. Never
 // overwrite a reviewed plan, backup or previous activation receipt.
 if(o.apply)await writeFile(o.out,JSON.stringify({mode:'pending',planHash:plan.hash}),{flag:'wx',mode:0o600})
 const result=o.rollback?await rollbackOwnerRecovery(plan,JSON.parse(await readFile(o.receipt,'utf8')),api,o):await executeOwnerRecovery(plan,api,o)
 if(o.out)await writeFile(o.out,JSON.stringify(o.plan?result:plan,null,2),{flag:o.apply?'w':'wx',mode:0o600})
 const {activatedRoot:omittedRoot,...summary}=result
 void omittedRoot
 process.stdout.write(JSON.stringify({...summary,target:{projectId:plan.projectId,shopId:plan.shopId,generationId:plan.generationId},account:api.identity.account,planHash:plan.hash},null,2)+'\n')
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{const code=/^[A-Z][A-Z0-9_]{2,100}$/.test(error.code||'')?error.code:'OWNER_RECOVERY_STOPPED';process.stderr.write(code+' (no credentials or business contents printed).\n');process.exitCode=1})
