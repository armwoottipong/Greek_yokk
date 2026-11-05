import {readFile} from 'node:fs/promises'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,setDoc,getDoc,serverTimestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
let env
const root='shops/greek-yogg',base=`${root}/generations/g`,imagePath=`${base}/catalogImages/materials_M`
const picture=(overrides={})=>({kind:'materials',entityId:'M',dataURL:'data:image/jpeg;base64,/9j/2Q==',revision:1,updatedBy:'manager',updatedAt:serverTimestamp(),...overrides})
const db=(role='manager',provider='google.com')=>env.authenticatedContext(role,{email:`${role}@example.com`,email_verified:true,firebase:{sign_in_provider:provider}}).firestore()
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('../../firestore.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{
 await env.clearFirestore()
 await env.withSecurityRulesDisabled(async ctx=>{
  const d=ctx.firestore();await setDoc(doc(d,root),{status:'active',generation:'g',allowedEmails:{'admin@example.com':true,'manager@example.com':true,'viewer@example.com':true},userRoles:{'admin@example.com':'admin','manager@example.com':'manager','viewer@example.com':'viewer'},catalog:{menus:{MENU:{id:'MENU'}}}})
  await setDoc(doc(d,`${base}/materials/M`),{id:'M'})
 })
})
afterAll(async()=>env?.cleanup())
it('lets Manager/Admin save square menu/material images and increment revisions',async()=>{
 const d=db();await assertSucceeds(setDoc(doc(d,imagePath),picture()))
 await assertSucceeds(setDoc(doc(d,imagePath),picture({revision:2,dataURL:''})))
 await assertSucceeds(setDoc(doc(db('admin'),`${base}/catalogImages/menus_MENU`),picture({kind:'menus',entityId:'MENU',updatedBy:'admin'})))
 expect((await getDoc(doc(d,imagePath))).data().revision).toBe(2)
})
it('accepts an existing 200-character catalog ID and rejects 201 characters',async()=>{
 for(const size of [200,201]){
  const id='M'.repeat(size)
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),root),{catalog:{menus:{[id]:{id}}}},{merge:true}))
  const write=setDoc(doc(db(),`${base}/catalogImages/menus_${id}`),picture({kind:'menus',entityId:id}))
  if(size===200)await assertSucceeds(write);else await assertFails(write)
 }
})
it('rejects Viewer, unknown email and non-Google writes and catalog-image reads',async()=>{
 for(const [role,provider] of [['viewer','google.com'],['stranger','google.com'],['manager','password']]){
  const d=db(role,provider);await assertFails(setDoc(doc(d,imagePath),picture({updatedBy:role})));await assertFails(getDoc(doc(d,imagePath)))
 }
})
it('rejects stale revisions, oversized/unsafe image data and forged authors',async()=>{
 const d=db();await assertSucceeds(setDoc(doc(d,imagePath),picture()))
 for(const key of ['kind','entityId','dataURL','revision','updatedAt','updatedBy']){const incomplete=picture({revision:2});delete incomplete[key];await assertFails(setDoc(doc(d,imagePath),incomplete))}
 for(const changes of [{revision:1},{revision:3},{dataURL:'data:image/svg+xml;base64,AAAA'},{dataURL:'https://example.com/a.jpg'},{dataURL:'data:image/jpeg;base64,/9j/'+'A'.repeat(204800)},{updatedBy:'admin'},{extra:true}])await assertFails(setDoc(doc(d,imagePath),picture({revision:2,...changes})))
})
it('rejects mismatched entity keys, nonexistent targets and inactive generations',async()=>{
 const d=db()
 await assertFails(setDoc(doc(d,`${base}/catalogImages/other`),picture()))
 await assertFails(setDoc(doc(d,`${base}/catalogImages/materials_NONE`),picture({entityId:'NONE'})))
 await assertFails(setDoc(doc(d,`${root}/generations/old/catalogImages/materials_M`),picture()))
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),root),{status:'maintenance'},{merge:true}))
 await assertFails(setDoc(doc(d,imagePath),picture()))
})
it('allows Add-on images only for existing catalog Add-ons with Manager/Admin permissions',async()=>{
 await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),root),{catalog:{addons:{A:{name:'Option'}}}},{merge:true}))
 const path=`${base}/catalogImages/addons_A`,value=picture({kind:'addons',entityId:'A'})
 await assertSucceeds(setDoc(doc(db(),path),value))
 await assertSucceeds(getDoc(doc(db(),path)))
 await assertFails(setDoc(doc(db('viewer'),path),{...value,revision:2,updatedBy:'viewer'}))
 await assertFails(getDoc(doc(db('viewer'),path)))
 await assertFails(setDoc(doc(db(),`${base}/catalogImages/addons_NONE`),{...value,entityId:'NONE'}))
})
