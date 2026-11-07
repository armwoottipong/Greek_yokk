import {readFileSync} from 'node:fs'
import {beforeAll,beforeEach,afterAll,it} from 'vitest'
import {doc,getDoc,writeBatch} from 'firebase/firestore'
import {assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
let env
const base='shops/greek-yogg/generations/g'
const internal=['operations/OP','materialReferences/OP/parts/0','recipeAdmissions/OP/parts/0','preparations/OP','preparedSales/OP/lineProofs/0','preparedSales/OP/operandProofs/0','preparedSales/OP/certificates/bill','legacyRecords/activityLogs_0','legacyRecords/materials_0']
const dashboard=['materials/M','orders/O','display/catalog','legacyRecords/orders_0']
const db=role=>env.authenticatedContext(role,{email:role+'@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
beforeAll(async()=>{env=await createRulesTest({rules:readFileSync('firestore.rules','utf8')})})
beforeEach(async()=>{
 await env.clearFirestore()
 await env.withSecurityRulesDisabled(async c=>{
  const b=writeBatch(c.firestore());b.set(doc(c.firestore(),'shops/greek-yogg'),{status:'active',generation:'g',allowedEmails:{'viewer@example.com':true,'manager@example.com':true,'admin@example.com':true},userRoles:{'viewer@example.com':'viewer','manager@example.com':'manager','admin@example.com':'admin'}})
  for(const path of [...internal,...dashboard])b.set(doc(c.firestore(),base+'/'+path),{test:true})
  await b.commit()
 })
})
afterAll(async()=>env?.cleanup())
it.each(internal)('denies Viewer internal document %s while preserving Manager/Admin reads',async path=>{
 await assertFails(getDoc(doc(db('viewer'),base+'/'+path)))
 for(const role of ['manager','admin'])await assertSucceeds(getDoc(doc(db(role),base+'/'+path)))
})
it('preserves the server reads used to render Viewer Dashboard',async()=>{
 for(const path of dashboard)await assertSucceeds(getDoc(doc(db('viewer'),base+'/'+path)))
})
it.each([false,null])('denies stale operator roles when allowlist membership is %s',async membership=>{
 await env.withSecurityRulesDisabled(async c=>{
  const b=writeBatch(c.firestore())
  b.update(doc(c.firestore(),'shops/greek-yogg'),{allowedEmails:membership===null?{}:{'manager@example.com':membership}})
  await b.commit()
 })
 for(const path of internal)await assertFails(getDoc(doc(db('manager'),base+'/'+path)))
})
it.each(['unverified','password','anonymous'])('denies internal reads for invalid operator identity: %s',async kind=>{
 const client=kind==='anonymous'?env.unauthenticatedContext().firestore():env.authenticatedContext('manager',{email:'manager@example.com',email_verified:kind!=='unverified',firebase:{sign_in_provider:kind==='password'?'password':'google.com'}}).firestore()
 for(const path of internal)await assertFails(getDoc(doc(client,base+'/'+path)))
})
