// @vitest-environment node
import {decodeRehearsalValue} from '../../scripts/backup-rehearsal.js'
import {it,expect} from 'vitest'
import {createBusinessBackup,encodeBackupValue} from '../../src/cloud/core/businessBackup.js'
import {inspectOwnerBackup,prepareOwnerRecovery,verifyOwnerRecoveryPlan,recoveryHash} from '../../scripts/recovery-plan.js'
import {executeOwnerRecovery,rollbackOwnerRecovery,parseOwnerRecoveryArgs} from '../../scripts/owner-recovery.mjs'
const encoded=encodeBackupValue
const baseline={root:encoded({status:'active',generation:'g_restore_live',revision:12,materialIds:['OLD']}),updateTime:'2026-10-27T10:00:00.123456Z'}
async function backup(change=()=>{}){
 const zero={id:'_',qty:0,isInUse:false,expiryDay:999999,receiveDay:999999,ordinal:999999};const material={id:'M',revision:1,costRank:0,deleted:false,inventoryType:'ingredient',unit:'g',packSize:1,minAlertQ:0,unitCost:1,stock:300,lots:{_:zero,L:{id:'L',qty:300,unitCost:1}},lotIds:['L'],lotQty:{_:0,L:300},allocationIds:['L'],slotIds:['L','_','_','_'],activeLotId:'L',zeroActiveIds:[],recipeIndex:{}};const collections={materials:[{id:'M',data:encoded(material)}],display:[{id:'catalog',data:encoded({legacyOrderCount:0})}],orders:[],operations:[],legacyRecords:[]}
 const payload={scope:'business-snapshot',projectId:'source-project',shopId:'source-shop',generation:'g_source',revision:4,exportedAt:'2026-10-26T00:00:00Z',root:encoded({status:'active',generation:'g_source',revision:4,materialIds:['M'],productionUsers:{M:[]},catalog:{summaryMaterials:['M'],counterIds:Array(15).fill('_'),platformIds:['P'],platforms:{P:{revision:1,active:true,gpBasisPoints:0}},menus:{},menuIds:[],addons:{},addonIds:[],groups:{},groupIds:[]}}),counts:Object.fromEntries(Object.entries(collections).map(([k,v])=>[k,v.length])),collections};change(payload);return JSON.stringify(await createBusinessBackup(payload))
}
const prepare=async()=>prepareOwnerRecovery({backup:await backup(),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_candidate',baseline})
it('keeps the live email policy instead of an outdated backup and rejects rehashed access changes',async()=>{
 const allowedEmails={'owner@example.com':true,'cashier@example.com':true},live={...baseline,root:encoded({...decodeRehearsalValue(baseline.root),allowedEmails})}
 const file=await backup(p=>{p.root=encoded({...decodeRehearsalValue(p.root),allowedEmails:{'old@example.com':true}})})
 const plan=await prepareOwnerRecovery({backup:file,projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_access',baseline:live})
 expect(decodeRehearsalValue(plan.root).allowedEmails).toEqual(allowedEmails);await expect(verifyOwnerRecoveryPlan(plan)).resolves.toBe(true)
 for(const change of ['remove','replace']){
  const {hash:_hash,...tampered}=structuredClone(plan),root=decodeRehearsalValue(tampered.root)
  if(change==='remove')delete root.allowedEmails;else root.allowedEmails={'old@example.com':true}
  tampered.root=encoded(root)
  await expect(verifyOwnerRecoveryPlan({...tampered,hash:await recoveryHash(tampered)})).rejects.toThrow('RECOVERY_ACCESS_POLICY_CHANGED')
 }
 const noPolicy=await prepareOwnerRecovery({backup:file,projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_no_access',baseline})
 expect(Object.hasOwn(decodeRehearsalValue(noPolicy.root),'allowedEmails')).toBe(false)
})
function memory(plan){
 const docs=new Map([[plan.rootPath,{data:baseline.root,updateTime:baseline.updateTime}]]),writes=[];let version=0
 return {docs,writes,async get(path){return structuredClone(docs.get(path)||null)},async listGeneration(){return [...docs].filter(([p])=>p.startsWith(plan.generationPath+'/')).map(([path,d])=>({path,...structuredClone(d)}))},async commit(batch){for(const w of batch){const old=docs.get(w.path);if(w.exists===false&&old||w.updateTime&&old?.updateTime!==w.updateTime)throw new Error('CAS_FAILED')}
 for(const w of batch){if(w.verify)continue;docs.set(w.path,{data:structuredClone(w.data),updateTime:`2026-10-28T00:00:${String(++version).padStart(2,'0')}Z`});writes.push(w.path)}return batch.map(w=>docs.get(w.path))}}
}
it('previews verified native business values and rejects legacy/reset instead of inventing data',async()=>{
 const p=await inspectOwnerBackup(await backup());expect(p.ready).toBe(true);expect(p.source.revision).toBe(4);expect(p.counts.materials).toBe(1);expect(p.checksum).toMatch(/^[a-f0-9]{64}$/)
 expect((await inspectOwnerBackup('{"materials":[]}')).ready).toBe(false)
 const corrupt=JSON.parse(await backup());corrupt.payload.revision=9;expect((await inspectOwnerBackup(JSON.stringify(corrupt))).issues).toContain('BACKUP_CHECKSUM_MISMATCH')
})
it('plans a new generation and monotonic root revision with a hash tied to baseline',async()=>{
 const p=await prepare();expect(p.documents[0].path).toBe('shops/greek-yogg/generations/g_restore_candidate/materials/M');expect(p.root.mapValue.fields.revision).toEqual({integerValue:'13'});expect(p.root.mapValue.fields.generation).toEqual({stringValue:'g_restore_candidate'});expect(p.hash).toMatch(/^[a-f0-9]{64}$/)
 const changed=await prepareOwnerRecovery({backup:await backup(),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_candidate',baseline:{...baseline,updateTime:'2026-10-27T10:00:01Z'}});expect(changed.hash).not.toBe(p.hash)
 await expect(prepareOwnerRecovery({backup:await backup(),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_live',baseline})).rejects.toThrow('NEW_GENERATION_REQUIRED')
})
it('defaults to read-only and requires explicit matching reviewed hash for any write',async()=>{
 const p=await prepare(),api=memory(p);expect((await executeOwnerRecovery(p,api)).mode).toBe('dry-run');expect(api.writes).toEqual([])
 await expect(executeOwnerRecovery(p,api,{apply:true})).rejects.toThrow('REVIEWED_HASH_REQUIRED');expect(api.writes).toEqual([])
 await expect(executeOwnerRecovery({...p,shopId:'other'},api,{apply:true,reviewedHash:p.hash})).rejects.toThrow('PLAN_HASH_MISMATCH')
})
it('creates stage documents and reads every field back without moving active root',async()=>{
 const p=await prepare(),api=memory(p),result=await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});expect(result.mode).toBe('staged');expect(api.docs.get(p.rootPath).data.mapValue.fields.generation.stringValue).toBe('g_restore_live');expect(api.docs.get(p.documents[0].path).data.mapValue.fields.stock.integerValue).toBe('300')
 await expect(executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash})).rejects.toThrow('NEW_GENERATION_REQUIRED')
})
it('blocks activation when any staged field is damaged or baseline changed',async()=>{
 const p=await prepare(),api=memory(p);await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});api.docs.get(p.documents[0].path).data.mapValue.fields.stock.integerValue='299'
 await expect(executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash})).rejects.toThrow('STAGED_READBACK_MISMATCH');expect(api.docs.get(p.rootPath).data.mapValue.fields.generation.stringValue).toBe('g_restore_live')
 api.docs.get(p.documents[0].path).data=p.documents[0].data;api.docs.get(p.rootPath).updateTime='2026-10-28T01:00:00Z'
 await expect(executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash})).rejects.toThrow('LIVE_BASELINE_CHANGED')
})
it('atomically activates verified stage with root updateTime CAS and retains old generation',async()=>{
 const p=await prepare(),api=memory(p);api.docs.set('shops/greek-yogg/generations/g_restore_live/materials/OLD',{data:encoded({stock:9}),updateTime:'old'});await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});const receipt=await executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash});expect(receipt.mode).toBe('activated');expect(api.docs.get(p.rootPath).data.mapValue.fields.revision.integerValue).toBe('13');expect(api.docs.has('shops/greek-yogg/generations/g_restore_live/materials/OLD')).toBe(true)
 await rollbackOwnerRecovery(p,receipt,api,{apply:true,reviewedHash:p.hash});expect(api.docs.get(p.rootPath).data.mapValue.fields.generation.stringValue).toBe('g_restore_live');expect(api.docs.get(p.rootPath).data.mapValue.fields.revision.integerValue).toBe('14')
})
it('refuses rollback after any business write or stale receipt',async()=>{
 const p=await prepare(),api=memory(p);await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});const receipt=await executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash});api.docs.get(p.rootPath).updateTime='2026-10-28T02:00:00Z'
 await expect(rollbackOwnerRecovery(p,receipt,api,{apply:true,reviewedHash:p.hash})).rejects.toThrow('ROLLBACK_WINDOW_CLOSED')
})
it('rejects ambiguous CLI flags and requires apply when activating',()=>{
 expect(parseOwnerRecoveryArgs(['--backup','data.json','--project','yoggie-db','--shop','greek-yogg','--generation','g_restore_x']).apply).toBe(false)
 expect(()=>parseOwnerRecoveryArgs(['--activate'])).toThrow();expect(()=>parseOwnerRecoveryArgs(['--apply','--apply'])).toThrow();expect(()=>parseOwnerRecoveryArgs(['--token','secret'])).toThrow()
})

it('closes activation race when live root changes after final read',async()=>{
 const p=await prepare(),api=memory(p);await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});const commit=api.commit.bind(api)
 api.commit=async batch=>{if(batch.some(w=>w.path===p.rootPath))api.docs.get(p.rootPath).updateTime='racing-write';return commit(batch)}
 await expect(executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash})).rejects.toThrow('CAS_FAILED');expect(api.docs.get(p.rootPath).data.mapValue.fields.generation.stringValue).toBe('g_restore_live')
})
it('closes activation race when a verified stage document changes before commit',async()=>{
 const p=await prepare(),api=memory(p);await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});const commit=api.commit.bind(api)
 api.commit=async batch=>{if(batch.some(w=>w.path===p.rootPath))api.docs.get(p.documents[0].path).updateTime='racing-admin-write';return commit(batch)}
 await expect(executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash})).rejects.toThrow('CAS_FAILED');expect(api.docs.get(p.rootPath).data.mapValue.fields.generation.stringValue).toBe('g_restore_live')
})
it('rejects unexpected staged documents before activation',async()=>{
 const p=await prepare(),api=memory(p);await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});api.docs.set(p.generationPath+'/orders/UNEXPECTED',{data:encoded({}),updateTime:'unexpected'})
 await expect(executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash})).rejects.toThrow('STAGED_READBACK_MISMATCH')
})
it('retains nanosecond timestamp precision through REST conversion',async()=>{
 const {decodeRestDocument,encodeRestValue}=await import('../../scripts/owner-recovery.mjs')
 const wire={fields:{at:{timestampValue:'2026-10-27T10:00:00.123456789Z'},empty:{arrayValue:{}},map:{mapValue:{}}},updateTime:'2026-10-27T10:00:00.000000001Z'}
 const result=decodeRestDocument(wire);expect(result.data.mapValue.fields.at.timestampValue.nanoseconds).toBe(123456789);expect(result.updateTime).toBe('2026-10-27T10:00:00.000000001Z');expect(encodeRestValue(result.data).mapValue.fields.at.timestampValue).toBe('2026-10-27T10:00:00.123456789Z');expect(result.data.mapValue.fields.empty).toEqual({arrayValue:{values:[]}})
})
it('refuses overly large activation plans before staging any document',async()=>{
 await expect(prepareOwnerRecovery({backup:await backup(p=>{p.collections.orders=Array.from({length:449},(_,i)=>({id:`O${i}`,data:encoded({})}));p.counts.orders=449}),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_large',baseline})).rejects.toThrow('RECOVERY_ATOMIC_VERIFY_LIMIT_450')
})
it('does not treat target-source project mismatch as implicit authorization to overwrite',async()=>{
 const p=await prepare(),api=memory(p);const changed=structuredClone(p);changed.baseline.root.mapValue.fields.revision.integerValue='3'
 await expect(executeOwnerRecovery(changed,api,{apply:true,reviewedHash:p.hash})).rejects.toThrow('PLAN_HASH_MISMATCH');expect(api.writes).toEqual([])
})
it('rejects a snapshot document beyond conservative Firestore document capacity',async()=>{
 await expect(prepareOwnerRecovery({backup:await backup(p=>{p.collections.display[0].data=encoded({legacyOrderCount:0,note:'x'.repeat(820000)})}),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_large_document',baseline})).rejects.toThrow('RECOVERY_DOCUMENT_TOO_LARGE')
})
it('keeps restored operation/cutoff revisions below the new root even across projects',async()=>{
 const p=await prepareOwnerRecovery({backup:await backup(payload=>{payload.revision=100;payload.root=encoded({...decodeRehearsalValue(payload.root),revision:100,inventoryHistoryCutoff:99})}),projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_newer_source',baseline});expect(p.root.mapValue.fields.revision.integerValue).toBe('101')
})
it('builds an actual empty reset preserving four platform fees and labels without hidden inventory',async()=>{
 const {prepareOwnerReset}=await import('../../scripts/recovery-plan.js')
 const platforms={P1:{revision:1,active:true,gpBasisPoints:0},P2:{revision:2,active:true,gpBasisPoints:3000},P3:{revision:1,active:false,gpBasisPoints:2500},P4:{revision:1,active:true,gpBasisPoints:0}},labels=Object.fromEntries(Object.keys(platforms).map(id=>[id,{name:id,emoji:''}]))
 const resetBaseline={...baseline,root:encoded({status:'active',generation:'g_live_reset_source',revision:12,catalog:{platformIds:['P1','P2','P3','P4'],platforms},materialIds:['OLD']}),display:encoded({platforms:labels,menus:{OLD:{name:'old'}},legacyOrderCount:99})}
 const p=await prepareOwnerReset({projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_empty',baseline:resetBaseline}),root=p.root.mapValue.fields,catalog=root.catalog.mapValue.fields
 expect(root.materialIds).toEqual(encoded([]));expect(catalog.summaryMaterials).toEqual(encoded([]));expect(catalog.counterIds).toEqual(encoded(Array(15).fill('_')));expect(catalog.platforms).toEqual(encoded(platforms));expect(p.documents).toHaveLength(1);expect(p.counts.materials).toBe(0);expect(p.counts.orders).toBe(0);expect(p.source.purpose).toBe('reset');expect(p.documents[0].data.mapValue.fields.platforms).toEqual(encoded(labels));expect(p.documents[0].data.mapValue.fields.legacyOrderCount).toEqual(encoded(0))
 const api=memory(p);api.docs.get(p.rootPath).data=resetBaseline.root;await executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash});await executeOwnerRecovery(p,api,{apply:true,activate:true,reviewedHash:p.hash});expect(api.docs.get(p.rootPath).data.mapValue.fields.materialIds).toEqual(encoded([]))
})
it('refuses a reset if existing platform settings cannot be retained exactly',async()=>{
 const {prepareOwnerReset}=await import('../../scripts/recovery-plan.js');await expect(prepareOwnerReset({projectId:'target-project',shopId:'greek-yogg',generationId:'g_restore_empty',baseline})).rejects.toThrow('RESET_PLATFORM_SETTINGS_REQUIRED')
})
it('admits explicit reset preparation but refuses ambiguous or unreviewed write inputs',()=>{
 expect(parseOwnerRecoveryArgs(['--reset','--project','yoggie-db','--shop','greek-yogg','--generation','g_restore_empty','--account','owner@example.com']).reset).toBe(true)
 expect(()=>parseOwnerRecoveryArgs(['--reset','--backup','file.json'])).toThrow('INVALID_CLI_ARGUMENTS');expect(()=>parseOwnerRecoveryArgs(['--apply','--plan','plan.json','--reviewed-hash','a'.repeat(64)])).toThrow('INVALID_CLI_ARGUMENTS')
})
it('rejects rehashed plans whose staged contents no longer match the registry or manifest',async()=>{
 const {recoveryHash}=await import('../../scripts/recovery-plan.js')
 for(const damage of [p=>p.documents=p.documents.filter(r=>!r.path.includes('/materials/')),p=>p.counts.materials=9]){
  const p=await prepare();damage(p);const {hash,...body}=p;p.hash=await recoveryHash(body);const api=memory(p)
  await expect(executeOwnerRecovery(p,api,{apply:true,reviewedHash:p.hash})).rejects.toThrow();expect(api.writes).toEqual([])
 }
})
