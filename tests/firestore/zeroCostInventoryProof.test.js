import {readFileSync} from 'node:fs'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {summaryStock} from '../../src/cloud/core/model/stock.js'
import {summaryCount} from '../../src/cloud/core/model/count.js'
let env,shop,materials,db,api,base
beforeAll(async()=>{env=await createRulesTest({rules:readFileSync(process.env.ZERO_COST_RULES_PATH||'firestore.rules','utf8')})})
beforeEach(async()=>{
 await env.clearFirestore()
 const source=coreSource();source.materials[0].unitCost=0
 Object.assign(source.materials[0].lots[0],{unitCost:0,receiveDate:'2026-11-07',expiryDate:'2026-12-07'})
 const imported=compileCoreImport(source,{shopId:'greek-yogg',generation:'g_trial_zero',sourceSha256:'a'.repeat(64)})
 shop=imported.shop;shop.allowedEmails={'manager@example.com':true};shop.userRoles={'manager@example.com':'manager'}
 materials=imported.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 base=`shops/greek-yogg/generations/${shop.generation}`
 await env.withSecurityRulesDisabled(async c=>{const b=writeBatch(c.firestore());b.set(doc(c.firestore(),'shops/greek-yogg'),shop);for(const d of imported.documents)b.set(doc(c.firestore(),d.path),d.data);await b.commit()})
 db=env.authenticatedContext('manager',{email:'manager@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
 const context={projectId:'demo-greek-yogg',shopId:'greek-yogg',generation:shop.generation,uid:'manager',deviceId:'device',online:true,ready:true}
 api=createCoreTransport({db,getContext:()=>context})
})
afterAll(async()=>env?.cleanup())
it.each([0,1])('receives paid stock into an existing lot with actual unit cost %s',async oldCost=>{
 const m=materials.find(m=>m.unitCost===0),lot=m.lots[m.lotIds[0]]
 if(oldCost!==0){m.unitCost=oldCost;lot.unitCost=oldCost;await env.withSecurityRulesDisabled(c=>{const b=writeBatch(c.firestore());b.set(doc(c.firestore(),`${base}/materials/${m.id}`),m);return b.commit()})}
 await api.commit({kind:'receive',opId:'ZERO-MERGE',payload:{materialId:m.id,input:{qtyQ:m.stock,unitCost:1,receiveDay:lot.receiveDay,expiryDay:lot.expiryDay,newLotId:'UNUSED'}}})
 const saved=(await api.snapshot()).materials.find(row=>row.id===m.id)
 expect(saved.unitCost).toBe((oldCost+1)/2);expect(saved.lots[lot.id].unitCost).toBe((oldCost+1)/2)
})
it('records zero loss for wasting a free lot when material average cost differs',async()=>{
 const m=materials.find(m=>m.unitCost===0),id=m.lotIds[0];m.unitCost=5
 await env.withSecurityRulesDisabled(c=>{const b=writeBatch(c.firestore());b.set(doc(c.firestore(),`${base}/materials/${m.id}`),m);return b.commit()})
 const saved=await api.commit({kind:'stock_count',opId:'ZERO-WASTE',payload:{requests:[{materialId:m.id,mode:'waste',requestedQ:100,counts:[{id,to:m.lotQty[id]-100}]}]}})
 expect(saved.rows[0].lossCents).toBe(0)
})
it.each(['receive','waste'])('rejects a forged nonzero lot cost/loss for %s',async kind=>{
 const m=materials.find(m=>m.unitCost===0),id=m.lotIds[0],opId='FORGED-'+kind
 let f
 if(kind==='receive'){
  const lot=m.lots[id];f=summaryStock(shop,m,{qtyQ:m.stock,unitCost:1,receiveDay:lot.receiveDay,expiryDay:lot.expiryDay,newLotId:'UNUSED',opId,uid:'manager'});f.next.lots[id].unitCost=1
 }else{
  f=summaryCount(shop,materials,[{materialId:m.id,mode:'waste',requestedQ:100,counts:[{id,to:m.lotQty[id]-100}]}],{opId,uid:'manager'});f.operation.rows[0].lossCents=500
 }
 const b=writeBatch(db);b.set(doc(db,'shops/greek-yogg'),f.nextShop);b.set(doc(db,`${base}/operations/${opId}`),f.operation)
 for(const next of f.nextMaterials||[f.next])b.set(doc(db,`${base}/materials/${next.id}`),next)
 await assertFails(b.commit())
})
