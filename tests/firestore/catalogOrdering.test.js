import {readFileSync} from 'node:fs'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,setDoc,getDoc,updateDoc,serverTimestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
let env
const root='shops/greek-yogg',display=`${root}/generations/g/display/catalog`
const db=(role='manager',provider='google.com')=>env.authenticatedContext(role,{email:`${role}@example.com`,email_verified:true,firebase:{sign_in_provider:provider}}).firestore()
const patch=changes=>({menuOrder:['B','A','OLD'],menuOrderRevision:1,menuOrderCatalogRevision:7,menuOrderUpdatedBy:'manager',menuOrderUpdatedAt:serverTimestamp(),...changes})
beforeAll(async()=>{env=await createRulesTest({rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{
 await env.clearFirestore()
 await env.withSecurityRulesDisabled(async ctx=>{
  await setDoc(doc(ctx.firestore(),root),{status:'active',generation:'g',revision:20,catalogRevision:7,allowedEmails:{'manager@example.com':true,'admin@example.com':true,'viewer@example.com':true},userRoles:{'manager@example.com':'manager','admin@example.com':'admin','viewer@example.com':'viewer'},catalog:{menuIds:['A','B','OLD'],menus:{A:{recipe:{I:100},pricesCents:{P:6900}},B:{},OLD:{active:false}}}})
  await setDoc(doc(ctx.firestore(),display),{menus:{A:{name:'A'},B:{name:'B'},OLD:{deleted:true}},groups:{},addons:{},trial:false})
 })
})
afterAll(async()=>env?.cleanup())
it('allows Manager/Admin ordering as metadata only and preserves the business root',async()=>{
 const d=db(),before=(await getDoc(doc(d,root))).data()
 await assertSucceeds(updateDoc(doc(d,display),patch()))
 expect((await getDoc(doc(d,root))).data()).toEqual(before)
 await assertSucceeds(updateDoc(doc(db('admin'),display),patch({menuOrder:['A','B','OLD'],menuOrderRevision:2,menuOrderUpdatedBy:'admin'})))
})
it.each(['viewer','stranger'])('rejects %s ordering',async role=>{await assertFails(updateDoc(doc(db(role),display),patch({menuOrderUpdatedBy:role})))})
it('rejects a non-Google account and wrong generation',async()=>{
 await assertFails(updateDoc(doc(db('manager','password'),display),patch()))
 await assertFails(setDoc(doc(db(),`${root}/generations/other/display/catalog`),patch()))
})
it.each([{menuOrder:['A','A','B']},{menuOrder:['A','B']},{menuOrder:['A','B','UNKNOWN']},{menuOrderRevision:2},{menuOrderCatalogRevision:6},{menuOrderUpdatedBy:'admin'},{menuOrderUpdatedAt:'client time'},{menus:{A:{deleted:true}}},{groups:{G:{name:'forged'}}}])('rejects malformed, stale or unrelated metadata changes %j',async changes=>{
 await assertFails(updateDoc(doc(db(),display),patch(changes)))
})
