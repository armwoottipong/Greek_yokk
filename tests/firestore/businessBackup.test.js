import {beforeAll,afterAll,it,expect} from 'vitest'
import {doc,writeBatch,Timestamp,getDocFromServer} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {createBackupReader} from '../../src/cloud/core/backupReader.js'
import {verifyBusinessBackup} from '../../src/cloud/core/businessBackup.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})});await env.clearFirestore()})
afterAll(async()=>env.cleanup())
it('downloads a complete typed snapshot across pages for equal accounts without writing to the shop',async()=>{
 const f=summaryFixture(),base=`shops/proof-shop/generations/${f.shop.generation}`
 f.shop=materialRegistryShop(f.shop,f.materials)
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.set(doc(db,'shops/proof-shop'),f.shop);for(const m of f.materials)b.set(doc(db,`${base}/materials/${m.id}`),m);b.set(doc(db,`${base}/display/catalog`),{legacyOrderCount:1});b.set(doc(db,`${base}/legacyRecords/header`),{kind:'header',index:0,json:'{}'});b.set(doc(db,`${base}/legacyRecords/orders_0`),{kind:'orders',index:0,json:'{"orderId":"OLD"}'});for(let i=0;i<251;i++)b.set(doc(db,`${base}/orders/O${String(i).padStart(3,'0')}`),{opId:`O${i}`,createdAt:new Timestamp(123,456789),subtotalCents:i,status:'committed'});await b.commit()})
 for(const uid of ['alice','bob']){
  const db=env.authenticatedContext(uid).firestore(),stored=(await getDocFromServer(doc(db,`${base}/orders/O000`))).data().createdAt
  const reader=createBackupReader({db,getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:f.shop.generation,uid,ready:true,online:true})})
  const result=await reader.read();expect(await verifyBusinessBackup(result.text)).toBe(true)
  const payload=JSON.parse(result.text).payload;expect(payload.revision).toBe(f.shop.revision);expect(payload.counts.orders).toBe(251);expect(payload.counts.materials).toBe(15)
  expect(payload.collections.orders[0].data.mapValue.fields.createdAt.timestampValue).toEqual({seconds:stored.seconds,nanoseconds:stored.nanoseconds})
  reader.close()
 }
 const reader=createBackupReader({db:env.unauthenticatedContext().firestore(),getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:f.shop.generation,uid:'unknown',ready:true,online:true})})
 await expect(reader.read()).rejects.toThrow();reader.close()
})
