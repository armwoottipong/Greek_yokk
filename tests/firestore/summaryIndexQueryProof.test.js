import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertFails } from '@firebase/rules-unit-testing'
import { collection,doc,setDoc,getDocs,query,where,orderBy,documentId,limit,startAfter,Timestamp } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { ROOT,GENERATION } from './proofFixture.js'
// Emulator proves query shape/auth/cursors, NOT deployed index enforcement.
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore();await seedSetCatalog(env,summaryFixture())})
afterAll(async()=>{await env?.cleanup()})
it.each(['orders','operations','preparedInventory','preparedPlatforms'])('paginates %s by timestamp and same-direction ID without losing tied rows',async name=>{
  await env.withSecurityRulesDisabled(async c=>{
    for(const id of ['A','B','C','D'])await setDoc(doc(c.firestore(),`${GENERATION}/${name}/${id}`),{createdAt:Timestamp.fromMillis(id==='D'?4000:2000)})
  })
  const page=(db,cursor)=>query(collection(db,`${GENERATION}/${name}`),where('createdAt','>=',Timestamp.fromMillis(1000)),where('createdAt','<',Timestamp.fromMillis(5000)),orderBy('createdAt','desc'),orderBy(documentId(),'desc'),...(cursor?[startAfter(cursor)]:[]),limit(2))
  const a=env.authenticatedContext('cashier').firestore(),b=env.authenticatedContext('second-account').firestore()
  const first=await getDocs(page(a)),second=await getDocs(page(b,first.docs[1]))
  expect(first.docs.map(d=>d.id)).toEqual(['D','C']);expect(second.docs.map(d=>d.id)).toEqual(['B','A'])
  await assertFails(getDocs(page(env.unauthenticatedContext().firestore())))
})
it.each(['inactive-generation','paused'])('denies collection reads for %s',async mode=>{
  if(mode==='paused')await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),ROOT),{status:'maintenance'},{merge:true}))
  const path=mode==='inactive-generation'?`${ROOT}/generations/old/orders`:`${GENERATION}/orders`
  await assertFails(getDocs(query(collection(env.authenticatedContext('cashier').firestore(),path),orderBy('createdAt','desc'),limit(2))))
})
