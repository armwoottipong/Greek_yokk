import {readFile} from 'node:fs/promises'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {seedProof,saleBatch,GENERATION} from './proofFixture.js'
import {four} from './multiLotFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidate.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('deducts all four original lots in a single protected sale',async()=>{
 const f=four();await seedProof(env,f)
 await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
 const saved=(await getDoc(doc(env.authenticatedContext('owner').firestore(),`${GENERATION}/materials/YOGURT`))).data()
 expect(saved.stock).toBe(0);expect(saved.lots.map(l=>l.qty)).toEqual([0,0,0,0])
})
it.each([
 ['wrong lot ID',f=>{f.order.inventory[0].four.ids[2]='FORGED'}],
 ['forged ordering',f=>{f.order.inventory[0].four.order=[3,2,1,0]}],
 ['wrong fourth deduction',f=>{f.order.inventory[0].four.takes[3]--}],
 ['negative fourth stock',f=>{f.nextMaterials[0].lots[3].qty=-1}],
 ['unrelated third lot change',f=>{f.nextMaterials[0].lots[2].receiveDay++}]
])('rejects %s atomically',async(_label,alter)=>{
 const f=four();await seedProof(env,f);alter(f)
 await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('handles three stored lots after two production batches',async()=>{
 const f=four([2000,3000,5000]);await seedProof(env,f)
 await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
 const saved=(await getDoc(doc(env.authenticatedContext('owner').firestore(),`${GENERATION}/materials/YOGURT`))).data()
 expect(saved.lots).toHaveLength(3);expect(saved.stock).toBe(0)
})

it('rejects disguising a four-lot row as a two-lot witness to forge untouched stock',async()=>{
 const f=four();await seedProof(env,f)
 f.nextMaterials[0].lots[2].qty=999999;f.nextMaterials[0].lots[2].receiveDay++
 await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f,{omitFourFlag:true}).commit())
})
