import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {readFile} from 'node:fs/promises'
import {doc,writeBatch,getDocFromServer,getDocsFromServer,collection} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {planBackupRehearsal} from '../../scripts/backup-rehearsal.js'
import {createBackupReader} from '../../src/cloud/core/backupReader.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {encodeBackupValue,verifyBusinessBackup} from '../../src/cloud/core/businessBackup.js'

const target={host:'127.0.0.1:8088',projectId:'demo-greek-yogg-restore',shopId:'restore-shop',generation:'g_restore_rehearsal'}
const sourceProject='demo-greek-yogg-recovery-source',sourceShop='source-shop'
let sourceEnv,restoreEnv
beforeAll(async()=>{
 sourceEnv=await createRulesTest({projectId:sourceProject,rules:buildCorePolicy({legacyTestAuth:true,shopId:sourceShop})})
 restoreEnv=await createRulesTest({projectId:target.projectId,rules:buildCorePolicy({legacyTestAuth:true,shopId:target.shopId})})
})
beforeEach(async()=>{await sourceEnv.clearFirestore();await restoreEnv.clearFirestore()})
afterAll(async()=>{await sourceEnv.cleanup();await restoreEnv.cleanup()})
async function seed(env,documents){
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore()
  for(let start=0;start<documents.length;start+=200){const b=writeBatch(db);for(const row of documents.slice(start,start+200))b.set(doc(db,row.path),row.data);await b.commit()}
 })
}
function client(env,{projectId,shopId,generation},uid){
 const db=env.authenticatedContext(uid).firestore(),context={projectId,shopId,generation,uid,deviceId:uid,ready:true,online:true}
 return {db,context,api:createCoreTransport({db,getContext:()=>context})}
}
function simpleSale(shop,materials){
 const c=shop.catalog,platformId=c.platformIds.find(id=>c.platforms[id].active)
 for(const [id,m] of Object.entries(c.menus)){
  if(!m.active||m.min>0||m.groupId&&c.groups[m.groupId].min>0||m.groupIds?.some(id=>c.groups[id].min>0))continue
  const line={menuId:id,qty:1,...(m.groupIds?.length?{selections:[]}:{optionIds:[]})}
  try{
   const preview=summaryMultiGroupSale(shop,materials,[line],{platformId}).order
   if(Object.values(preview.approvedShortages).every(q=>q===0)&&preview.inventory.some(row=>row.take>0))return {platformId,lines:[line]}
  }catch{ /* Try another supported menu; never approve a synthetic shortage. */ }
 }
 throw new Error('No zero-shortage simple sale available in this snapshot')
}
function businessMaterial(m){const data={...m};for(const key of ['revision','lastOpId','lastOpKind','lastOpIndex','billPreparations','billPreparationId'])delete data[key];return data}
async function restoreAndExercise(text){
 const plan=await planBackupRehearsal(text,target),source=JSON.parse(text).payload
 await seed(restoreEnv,plan.documents)
 const a=client(restoreEnv,target,'recovery-a'),b=client(restoreEnv,target,'recovery-b'),base=`shops/${target.shopId}/generations/${target.generation}`
 // Read every restored document independently, not only a derived row count.
 for(const row of plan.documents){const saved=await getDocFromServer(doc(a.db,row.path));expect(saved.exists()).toBe(true);expect(saved.data()).toEqual(row.data)}
 for(const [name,count] of Object.entries(plan.counts))expect((await getDocsFromServer(collection(a.db,`${base}/${name}`))).size).toBe(count)
 const reader=createBackupReader({db:a.db,getContext:()=>a.context})
 try{
  const exported=await reader.read();expect(await verifyBusinessBackup(exported.text)).toBe(true)
  const roundtrip=JSON.parse(exported.text).payload
  expect(roundtrip.collections).toEqual(source.collections)
  expect(roundtrip.root).toEqual(encodeBackupValue(plan.documents[0].data))
  expect(roundtrip.counts).toEqual(source.counts)
 }finally{reader.close()}
 const before=await a.api.snapshot(),sale={kind:'sale',opId:'RECOVERY-NEW-SALE',payload:simpleSale(before.shop,before.materials)}
 const receipt=await a.api.commit(sale);expect((await a.api.commit(sale)).opId).toBe(receipt.opId)
 const afterSale=await b.api.snapshot();expect(afterSale.shop.revision).toBe(before.shop.revision+1)
 for(const row of receipt.inventory)expect(afterSale.materials.find(m=>m.id===row.materialId).stock).toBe(before.materials.find(m=>m.id===row.materialId).stock-row.take)
 const cancel={kind:'cancel',opId:'RECOVERY-NEW-RETURN',payload:{orderId:receipt.opId}}
 expect((await b.api.commit(cancel)).kind).toBe('cancel');expect((await b.api.commit(cancel)).opId).toBe(cancel.opId)
 await expect(a.api.commit({...cancel,opId:'RECOVERY-DOUBLE-RETURN'})).rejects.toThrow('Order already cancelled')
 const returned=await a.api.snapshot();expect(returned.shop.revision).toBe(before.shop.revision+2)
 for(const m of returned.materials)expect(businessMaterial(m)).toEqual(businessMaterial(before.materials.find(old=>old.id===m.id)))
 // Existing receipts, including original timestamps/status, remain exact.
 for(const row of plan.documents.filter(r=>r.path.startsWith(`${base}/orders/`)||r.path.startsWith(`${base}/operations/`)))expect((await getDocFromServer(doc(a.db,row.path))).data()).toEqual(row.data)
 return {a,b,plan,before,base,summary:{revision:plan.sourceRevision,documents:plan.documents.length,...plan.counts,newSaleReturned:true,duplicateSalePrevented:true,duplicateReturnPrevented:true,roundtripExact:true}}
}
it('round-trips a snapshot, sells/returns exactly once and can return a sale recorded before the backup',async()=>{
 const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
 const scope={projectId:sourceProject,shopId:sourceShop,generation:f.shop.generation},base=`shops/${sourceShop}/generations/${f.shop.generation}`
 await seed(sourceEnv,[{path:`shops/${sourceShop}`,data:f.shop},...f.materials.map(m=>({path:`${base}/materials/${m.id}`,data:m})),{path:`${base}/display/catalog`,data:{legacyOrderCount:0}},{path:`${base}/legacyRecords/header`,data:{kind:'header',index:0,json:'{}'}}])
 const origin=client(sourceEnv,scope,'source-cashier'),original=await origin.api.commit({kind:'sale',opId:'BEFORE-BACKUP',payload:simpleSale(f.shop,f.materials)})
 const reader=createBackupReader({db:origin.db,getContext:()=>origin.context});let text
 try{text=(await reader.read()).text}finally{reader.close()}
 const restored=await restoreAndExercise(text)
 expect((await restored.b.api.commit({kind:'cancel',opId:'RETURN-ORIGINAL',payload:{orderId:original.opId}})).kind).toBe('cancel')
 const final=await restored.a.api.snapshot()
 for(const m of final.materials)expect(businessMaterial(m)).toEqual(businessMaterial(f.materials.find(old=>old.id===m.id)))
 await expect(restored.a.api.commit({kind:'cancel',opId:'RETURN-ORIGINAL-TWICE',payload:{orderId:original.opId}})).rejects.toThrow('Order already cancelled')
},45000)
it.skipIf(!process.env.GY_RESTORE_BACKUP)('recovers the downloaded real-shop file only in the fixed local demo project',async()=>{
 const text=await readFile(process.env.GY_RESTORE_BACKUP,'utf8'),result=await restoreAndExercise(text)
 console.log('Private recovery rehearsal verified:',JSON.stringify(result.summary))
},45000)
