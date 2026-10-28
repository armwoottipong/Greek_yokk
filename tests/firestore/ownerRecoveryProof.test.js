import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {readFile} from 'node:fs/promises'
import {createRulesTest,assertEmulatorTarget} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileOwnerDemo,migrateLegacyReceipts} from '../../scripts/owner-imports.mjs'
import {prepareOwnerRecovery,prepareOwnerReset} from '../../scripts/recovery-plan.js'
import {executeOwnerRecovery,rollbackOwnerRecovery,decodeRestDocument,encodeRestValue} from '../../scripts/owner-recovery.mjs'
import {decodeRehearsalValue} from '../../scripts/backup-rehearsal.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
const projectId='demo-owner-recovery',shopId='proof-shop',rootPath=`shops/${shopId}`,host='127.0.0.1:8088',base=`projects/${projectId}/databases/(default)`,names=['materials','display','orders','operations','legacyRecords']
let env,api,demo
beforeAll(async()=>{
 assertEmulatorTarget(projectId,host);env=await createRulesTest({projectId,rules:buildCorePolicy({legacyTestAuth:true,shopId})});demo=await compileOwnerDemo()
 async function request(path,body){const r=await fetch(`http://${host}/v1/${base}/${path}`,{method:body?'POST':'GET',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},...body?{body:JSON.stringify(body)}:{}});if(r.status===404)return null;const x=await r.json();if(!r.ok)throw Object.assign(new Error(x.error?.message||'EMULATOR_REQUEST_FAILED'),{code:x.error?.status});return x}
 api={async get(path){return decodeRestDocument(await request('documents/'+path))},async listGeneration(path){const rows=[];for(const name of names){let token;do{const page=await request(`documents/${path}/${name}?pageSize=100${token?'&pageToken='+encodeURIComponent(token):''}`);for(const d of page?.documents||[])rows.push({path:d.name.split('/documents/')[1],...decodeRestDocument(d)});token=page?.nextPageToken}while(token)}return rows},async commit(writes){return request('documents:commit',{writes:writes.map(w=>({...w.verify?{verify:base+'/documents/'+w.path}:{update:{name:base+'/documents/'+w.path,fields:encodeRestValue(w.data).mapValue.fields}},currentDocument:w.updateTime?{updateTime:w.updateTime}:{exists:w.exists}}))})}}
})
beforeEach(async()=>{
 await env.clearFirestore();const p=JSON.parse(demo).payload,root=decodeRehearsalValue(p.root),generation=root.generation
 await api.commit([{path:rootPath,data:p.root,exists:false},...Object.entries(p.collections).flatMap(([name,rows])=>rows.map(r=>({path:`${rootPath}/generations/${generation}/${name}/${r.id}`,data:r.data,exists:false})))])
})
afterAll(async()=>env.cleanup())
const baseline=async()=>{const root=await api.get(rootPath),r=decodeRehearsalValue(root.data),display=await api.get(`${rootPath}/generations/${r.generation}/display/catalog`);return {root:root.data,display:display.data,updateTime:root.updateTime}}
async function stageActivate(plan){const options={apply:true,reviewedHash:plan.hash};expect((await executeOwnerRecovery(plan,api,options)).mode).toBe('staged');return executeOwnerRecovery(plan,api,{...options,activate:true})}
function commands(generation){const context={projectId,shopId,generation,uid:'equal-account',deviceId:'one',online:true,ready:true};return createCoreTransport({db:env.authenticatedContext(context.uid).firestore(),getContext:()=>context})}
it('stages/verifies/activates a demo generation using actual REST preconditions and rejects rollback after a business write',async()=>{
 const b=await baseline(),plan=await prepareOwnerRecovery({backup:demo,projectId,shopId,generationId:'g_restore_demo',baseline:b}),receipt=await stageActivate(plan)
 expect(receipt.mode).toBe('activated');expect((await api.get(rootPath)).data).toEqual(plan.root)
 const client=commands(plan.generationId),s=await client.snapshot(),rates=Object.fromEntries(s.shop.catalog.platformIds.map(id=>[id,s.shop.catalog.platforms[id].gpBasisPoints]))
 await client.commit({kind:'platform_gp',opId:'AFTER-ACTIVATION',payload:{expectedRevision:s.shop.revision,rates}})
 await expect(rollbackOwnerRecovery(plan,receipt,api,{apply:true,reviewedHash:plan.hash})).rejects.toThrow('ROLLBACK_WINDOW_CLOSED')
})
it('activates a genuinely empty reset and rolls back before any later write',async()=>{
 const b=await baseline(),plan=await prepareOwnerReset({projectId,shopId,generationId:'g_restore_reset',baseline:b}),receipt=await stageActivate(plan)
 expect((await commands(plan.generationId).snapshot()).materials).toEqual([])
 expect((await rollbackOwnerRecovery(plan,receipt,api,{apply:true,reviewedHash:plan.hash})).mode).toBe('rolled-back')
 expect(decodeRehearsalValue((await api.get(rootPath)).data).generation).toBe(decodeRehearsalValue(b.root).generation)
})
it.skipIf(!process.env.GY_RESTORE_BACKUP)('converts private legacy receipts only in a staged demo generation and returns each eligible historical sale once',async()=>{
 const backup=await migrateLegacyReceipts(await readFile(process.env.GY_RESTORE_BACKUP,'utf8')),plan=await prepareOwnerRecovery({backup,projectId,shopId,generationId:'g_restore_legacy',baseline:await baseline()})
 await stageActivate(plan);const client=commands(plan.generationId),before=await client.snapshot(),orders=plan.documents.filter(r=>r.path.includes('/orders/')).map(r=>decodeRehearsalValue(r.data)),legacy=orders.filter(o=>o.origin==='legacy')
 expect(legacy).toHaveLength(4)
 const expected=Object.fromEntries(before.materials.map(m=>[m.id,m.stock]))
 for(const order of legacy){
  if(order.status==='cancelled'){await expect(client.commit({kind:'cancel',opId:'DENY-'+order.opId,payload:{orderId:order.opId}})).rejects.toThrow('Order already cancelled');continue}
  const command={kind:'cancel',opId:'RETURN-'+order.opId,payload:{orderId:order.opId}}
  await client.commit(command);expect((await client.commit(command)).opId).toBe(command.opId)
  for(const row of order.inventory)expected[row.materialId]+=row.take
 }
 const after=await client.snapshot();expect(Object.fromEntries(after.materials.map(m=>[m.id,m.stock]))).toEqual(expected)
},45000)
