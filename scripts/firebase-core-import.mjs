import {readFile,writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {createRequire} from 'node:module'
import {fileURLToPath} from 'node:url'
import {createServer} from 'vite'
const require=createRequire(import.meta.url),project='yoggie-db',database=`projects/${project}/databases/(default)`
function encode(v){
 if(v===null)return {nullValue:null}
 if(typeof v==='string')return {stringValue:v}
 if(typeof v==='boolean')return {booleanValue:v}
 if(typeof v==='number'&&Number.isFinite(v))return Number.isSafeInteger(v)?{integerValue:String(v)}:{doubleValue:v}
 if(Array.isArray(v))return {arrayValue:{values:v.map(encode)}}
 if(v&&Object.getPrototypeOf(v)===Object.prototype)return {mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]))}}
 throw new Error('Unsupported import value')
}
function decode(v){
 if('nullValue'in v)return null
 if('stringValue'in v)return v.stringValue
 if('booleanValue'in v)return v.booleanValue
 if('integerValue'in v)return Number(v.integerValue)
 if('doubleValue'in v)return v.doubleValue
 if('arrayValue'in v)return (v.arrayValue.values||[]).map(decode)
 if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]))
 throw new Error('Unsupported readback value')
}
const canonical=x=>JSON.stringify(x&&typeof x==='object'?Array.isArray(x)?x.map(v=>JSON.parse(canonical(v))):Object.fromEntries(Object.keys(x).sort().map(k=>[k,JSON.parse(canonical(x[k]))])):x)
async function main(){
 const [mode,input,generation,expectedGeneration]=process.argv.slice(2)
 if(!['--check','--stage','--stage-next','--activate'].includes(mode)||!input||!generation||mode==='--stage-next'&&!expectedGeneration)throw new Error('Usage: --check|--stage|--activate backup.json g_trial_ID; --stage-next also requires expected current trial generation')
 const bytes=await readFile(input),sourceSha256=createHash('sha256').update(bytes).digest('hex')
 const server=await createServer({root:fileURLToPath(new URL('../',import.meta.url)),configFile:false,server:{middlewareMode:true,watch:null},appType:'custom',logLevel:'silent'})
 try{
  const {compileCoreImport}=await server.ssrLoadModule('/scripts/core-import.js')
  const plan=compileCoreImport(JSON.parse(bytes.toString('utf8')),{generation,sourceSha256})
  process.stdout.write(`${JSON.stringify(plan.report,null,2)}\n`)
  if(mode==='--check')return
  const auth=require('firebase-tools/lib/auth.js')
  await require('firebase-tools/lib/requireAuth.js').requireAuth({project,...auth.getGlobalDefaultAccount()})
  const {Client}=require('firebase-tools/lib/apiv2.js'),api=new Client({urlPrefix:'https://firestore.googleapis.com',apiVersion:'v1'})
  const get=async path=>{try{return (await api.get(`/${database}/documents/${path}`,{skipLog:{resBody:true}})).body}catch(e){if(e.status===404||e.context?.response?.statusCode===404||e.message?.includes('NOT_FOUND'))return null;throw e}}
  const existing=await get('shops/greek-yogg')
  if(mode==='--stage-next'){
   if(existing?.fields?.generation?.stringValue!==expectedGeneration||expectedGeneration===generation)throw new Error('Unexpected staging predecessor')
   const display=await get(`shops/greek-yogg/generations/${expectedGeneration}/display/catalog`)
   if(display?.fields?.trial?.booleanValue!==true)throw new Error('Predecessor is not a trial shop')
  }else if(existing)throw new Error('Shop already exists: refusing to replace business data')
  if(['--stage','--stage-next'].includes(mode)){
   // Atomic create-only staging. Existing generations are never overwritten.
   await api.post(`/${database}/documents:commit`,{writes:plan.documents.map(d=>({update:{name:`${database}/documents/${d.path}`,fields:encode(d.data).mapValue.fields},currentDocument:{exists:false}}))},{skipLog:{body:true,resBody:true}})
  }
  for(const d of plan.documents){const actual=await get(d.path);if(!actual||canonical(decode({mapValue:{fields:actual.fields}}))!==canonical(d.data))throw new Error('Staged readback mismatch')}
  if(mode==='--activate'){
   await api.post(`/${database}/documents:commit`,{writes:[{update:{name:`${database}/documents/shops/greek-yogg`,fields:encode(plan.shop).mapValue.fields},currentDocument:{exists:false}}]},{skipLog:{body:true,resBody:true}})
   const actual=await get('shops/greek-yogg');if(canonical(decode({mapValue:{fields:actual.fields}}))!==canonical(plan.shop))throw new Error('Root readback mismatch')
  }
  await writeFile(`.superpowers/sdd/2026-10-20-firebase-multidevice/core-import-${mode.slice(2)}.json`,JSON.stringify({report:plan.report,readbackVerified:true},null,2))
  if(mode==='--stage-next'&&(await get('shops/greek-yogg'))?.fields?.generation?.stringValue!==expectedGeneration)throw new Error('Shop generation changed during staging')
  process.stdout.write(mode==='--activate'?'TRIAL shop activated; original local data unchanged.\n':mode==='--stage-next'?'Staged the next trial candidate and verified every field; current root unchanged.\n':'Staged all trial documents and verified every field; root remains absent.\n')
 }finally{await server.close()}
}
main().catch(error=>{process.stderr.write(`Import stopped (${error.message?.includes('already exists')?'shop already exists':error.message?.startsWith('Invalid initial core')?error.message:'check validation, credentials or readback; source contents suppressed'}).\n`);process.exitCode=1})
