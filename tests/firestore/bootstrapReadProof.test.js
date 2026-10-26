import {readFile} from 'node:fs/promises'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,setDoc,deleteDoc,collection,getDocs} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/bootstrap.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('allows a signed-in user to detect that the target shop still needs setup',async()=>{
 const db=env.authenticatedContext('cashier').firestore()
 expect((await assertSucceeds(getDoc(doc(db,'shops/greek-yogg')))).exists()).toBe(false)
})
it('allows two signed-in accounts to read the same shop status with no role',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'shops/greek-yogg'),{status:'importing',generation:'g1'}))
 for(const uid of ['first','second']){
  const db=env.authenticatedContext(uid).firestore()
  expect((await assertSucceeds(getDoc(doc(db,'shops/greek-yogg')))).data().status).toBe('importing')
 }
})
it('blocks unauthenticated reads even when the document does not exist',async()=>{
 await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'shops/greek-yogg')))
})
it('keeps bootstrap reads closed if an admin adds fields beyond status and generation',async()=>{
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'shops/greek-yogg'),{status:'importing',generation:'g1',futureField:'not part of bootstrap'}))
 await assertFails(getDoc(doc(env.authenticatedContext('cashier').firestore(),'shops/greek-yogg')))
})
it('blocks listing shops and reading another shop',async()=>{
 const db=env.authenticatedContext('cashier').firestore()
 await assertFails(getDocs(collection(db,'shops')))
 await assertFails(getDoc(doc(db,'shops/other')))
})
it.each(['materials','orders','operations','preparations'])('does not activate %s access through bootstrap Rules',async name=>{
 const db=env.authenticatedContext('cashier').firestore(),ref=doc(db,`shops/greek-yogg/generations/g1/${name}/x`)
 await assertFails(getDoc(ref));await assertFails(setDoc(ref,{value:1}))
})
it('rejects client creation, updates and deletion of the shop status',async()=>{
 const db=env.authenticatedContext('cashier').firestore(),ref=doc(db,'shops/greek-yogg')
 await assertFails(setDoc(ref,{status:'active',generation:'g1'}))
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'shops/greek-yogg'),{status:'importing',generation:'g1'}))
 await assertFails(setDoc(ref,{status:'active'},{merge:true}));await assertFails(deleteDoc(ref))
 expect((await getDoc(ref)).data().status).toBe('importing')
})
