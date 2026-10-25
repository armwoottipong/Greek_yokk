import {readFile} from 'node:fs/promises'
import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,getDoc,writeBatch,serverTimestamp,updateDoc} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {proofFixture,seedProof,saleBatch,ROOT,GENERATION} from './proofFixture.js'
import {four} from './multiLotFixture.js'
import {realMenuFixture} from './realMenuFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidate.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
async function sold(f=proofFixture()) {
 await seedProof(env,f)
 await saleBatch(env.authenticatedContext('cashier').firestore(),f).commit()
 const db=env.authenticatedContext('owner').firestore()
 const order=(await getDoc(doc(db,`${GENERATION}/orders/${f.order.opId}`))).data()
 const receipt={schemaVersion:1,kind:'cancel',status:'committed',opId:'CANCEL-001',uid:'owner',orderId:order.opId,
  materialIds:order.materialIds,createdAt:serverTimestamp(),shopRevision:3,witnessCount:Math.ceil(order.materialIds.length/4)}
 const materials=f.nextMaterials.map((m,i)=>{
  const row=order.inventory[i], next=structuredClone(m)
  const takes=row.four ? row.four.takes : [row.take0,row.take1]
  for(let j=0;j<next.lots.length;j++)next.lots[j].qty+=takes[j]
  next.stock+=takes.reduce((n,q)=>n+q,0);next.revision++;next.lastOpId=receipt.opId;next.lastOpKind='cancel';next.lastOpIndex=i
  // Existing undo preserves the active lot; when none is active it selects the first non-empty stored lot.
  if(!next.lots.some(l=>l.isInUse&&l.qty>0)) {
   next.lots.forEach(l=>{l.isInUse=false})
   const first=next.lots.find(l=>l.qty>0);if(first)first.isInUse=true
  }
  next.activeLotId=next.lots.find(l=>l.isInUse)?.id||''
  return next
 })
 return {f,db,receipt,materials,order:{...order,status:'cancelled',cancellationId:receipt.opId,cancelledAt:serverTimestamp()},shop:{...f.nextShop,revision:3,lastOpId:receipt.opId,lastOpKind:'cancel'}}
}
function cancelBatch(c,{omitMaterial,omitWitness,omitMaterials=false,omitOrder=false,omitShop=false}={}) {
 const b=writeBatch(c.db),r=c.receipt
 b.set(doc(c.db,`${GENERATION}/cancellations/${r.opId}`),r)
 if(!omitOrder)b.set(doc(c.db,`${GENERATION}/orders/${r.orderId}`),c.order)
 if(!omitShop)b.set(doc(c.db,ROOT),c.shop)
 for(const m of c.materials)if(!omitMaterials&&m.id!==omitMaterial)b.set(doc(c.db,`${GENERATION}/materials/${m.id}`),m)
 for(let i=0;i<r.witnessCount;i++)if(i!==omitWitness)b.set(doc(c.db,`${GENERATION}/cancellations/${r.opId}/proofs/${i}`),{opId:r.opId,index:i})
 return b
}
it('returns only actual original lot deductions, including a confirmed shortage',async()=>{
 const c=await sold()
 await assertSucceeds(cancelBatch(c).commit())
 for(let i=0;i<c.materials.length;i++) {
  const saved=(await getDoc(doc(c.db,`${GENERATION}/materials/${c.materials[i].id}`))).data()
  expect(saved.stock).toBe(c.f.materials[i].stock)
 }
 expect((await getDoc(doc(c.db,`${GENERATION}/orders/${c.receipt.orderId}`))).data().status).toBe('cancelled')
})
it('returns all eleven materials for all four shipped menus atomically',async()=>{
 const c=await sold(realMenuFixture(['MENU01','MENU02','MENU03','MENU04']))
 await assertSucceeds(cancelBatch(c).commit())
})
it.each([
 ['not logged in',c=>{c.db=env.unauthenticatedContext().firestore()}],
 ['extra returned stock',c=>{c.materials[0].stock++;c.materials[0].lots[0].qty++}],
 ['wrong original lot',c=>{c.materials[0].lots[0].id='FORGED'}],
 ['cost changed on return',c=>{c.materials[0].unitCost++}],
 ['edited sale amount',c=>{c.order.subtotalCents++}],
 ['omitted material',()=>{}, {omitMaterial:'FRUIT'}],
 ['omitted proof',()=>{}, {omitWitness:0}],
 ['omitted sale status',()=>{}, {omitOrder:true}],
 ['omitted shop revision',()=>{}, {omitShop:true}]
])('rejects %s without returning any stock',async(_label,alter,options)=>{
 const c=await sold();alter(c)
 await assertFails(cancelBatch(c,options).commit())
 const owner=env.authenticatedContext('owner').firestore()
 expect((await getDoc(doc(owner,`${GENERATION}/orders/${c.receipt.orderId}`))).data().status).toBe('committed')
 expect((await getDoc(doc(owner,`${GENERATION}/materials/YOGURT`))).data().stock).toBe(c.f.nextMaterials[0].stock)
})
it('accepts exactly one of two simultaneous cancellation commands',async()=>{
 const a=await sold(),b={...a,receipt:{...a.receipt,opId:'CANCEL-002'},order:{...a.order,cancellationId:'CANCEL-002'},shop:{...a.shop,lastOpId:'CANCEL-002'},materials:a.materials.map(m=>({...m,lastOpId:'CANCEL-002'}))}
 const results=await Promise.allSettled([cancelBatch(a).commit(),cancelBatch(b).commit()])
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 expect((await getDoc(doc(a.db,`${GENERATION}/materials/YOGURT`))).data().stock).toBe(a.f.materials[0].stock)
})

it('refuses cancellation when an original lot has disappeared',async()=>{
 const c=await sold()
 await env.withSecurityRulesDisabled(async ctx=>{
  const altered=structuredClone(c.f.nextMaterials[0]);altered.lots[0].id='REPLACEMENT'
  await updateDoc(doc(ctx.firestore(),`${GENERATION}/materials/YOGURT`),{lots:altered.lots})
 })
 await assertFails(cancelBatch(c).commit())
})
it('refuses a second cancellation ID after the first committed',async()=>{
 const c=await sold()
 await assertSucceeds(cancelBatch(c).commit())
 c.receipt.opId='CANCEL-SECOND';c.order.cancellationId=c.receipt.opId;c.shop.lastOpId=c.receipt.opId;c.shop.revision++
 for(const m of c.materials){m.lastOpId=c.receipt.opId;m.revision++}
 await assertFails(cancelBatch(c).commit())
})
it('refuses a removed intermediate witness in an eleven-material return',async()=>{
 const c=await sold(realMenuFixture(['MENU01','MENU02','MENU03','MENU04']))
 await assertFails(cancelBatch(c,{omitWitness:1}).commit())
})
it('preserves historical shortage evidence while returning no phantom stock',async()=>{
 const c=await sold()
 expect(c.order.inventory.find(r=>r.materialId==='TOPPING').shortage).toBe(100)
 await assertSucceeds(cancelBatch(c).commit())
 const saved=(await getDoc(doc(c.db,`${GENERATION}/orders/${c.receipt.orderId}`))).data()
 expect(saved.approvedShortages.TOPPING).toBe(100)
 expect(saved.inventory.find(r=>r.materialId==='TOPPING').shortage).toBe(100)
 const material=(await getDoc(doc(c.db,`${GENERATION}/materials/TOPPING`))).data()
 expect(material.stock).toBe(500)
})
it('rejects unrelated shop metadata in a cancellation command',async()=>{
 const c=await sold();c.receipt.uid='cashier';c.db=env.authenticatedContext('cashier').firestore()
 c.shop.injected=true
 await assertFails(cancelBatch(c).commit())
})

it.each([{quantities:[2000,3000,5000]},{quantities:[1000,2000,3000,4000]}])('returns every original allocation for stored lots $quantities',async ({quantities})=>{
 const c=await sold(four(quantities));await assertSucceeds(cancelBatch(c).commit())
 const saved=(await getDoc(doc(c.db,`${GENERATION}/materials/YOGURT`))).data()
 expect(saved.stock).toBe(10000);expect(saved.lots.map(l=>l.qty)).toEqual(quantities)
})
it('rejects returning a four-lot allocation into a substituted third lot',async()=>{
 const c=await sold(four());c.materials[0].lots[2].id='FORGED'
 await assertFails(cancelBatch(c).commit())
})

it('rejects reusing the original sale ID to certify a cancellation without any stock return',async()=>{
 const c=await sold()
 c.receipt.opId=c.receipt.orderId;c.receipt.shopRevision=c.f.nextShop.revision
 c.order.cancellationId=c.receipt.opId
 await assertFails(cancelBatch(c,{omitShop:true,omitMaterials:true}).commit())
})

it('allows a newly signed-in account to cancel without a role or membership setup',async()=>{
 const c=await sold();c.receipt.uid='new-google-user';c.db=env.authenticatedContext('new-google-user').firestore()
 await assertSucceeds(cancelBatch(c).commit())
})

it.each([{name:'two-lot',make:proofFixture},{name:'four-lot',make:four}])('cancels a $name sale after a later production appended another active lot',async({make})=>{
 const c=await sold(make()),current=structuredClone(c.f.nextMaterials[0])
 const later={...structuredClone(current.lots[0]),id:'LATER-PRODUCTION',qty:500,isInUse:true}
 current.lots.push(later);current.stock+=500;current.revision++;current.lastOpId='LATER-PRODUCE';current.lastOpKind='produce';current.activeLotId=later.id
 await env.withSecurityRulesDisabled(async ctx=>{
  await updateDoc(doc(ctx.firestore(),`${GENERATION}/materials/YOGURT`),current)
  await updateDoc(doc(ctx.firestore(),ROOT),{revision:3,lastOpId:'LATER-PRODUCE',lastOpKind:'produce'})
 })
 const returned=c.materials[0];returned.lots.forEach(l=>{l.isInUse=false});returned.lots.push(structuredClone(later))
 returned.stock+=500;returned.revision=current.revision+1;returned.activeLotId=later.id
 c.receipt.shopRevision=4;c.shop.revision=4
 await assertSucceeds(cancelBatch(c).commit())
 const saved=(await getDoc(doc(c.db,`${GENERATION}/materials/YOGURT`))).data()
 expect(saved.stock).toBe(10500);expect(saved.lots.at(-1)).toEqual(later)
 expect(saved.activeLotId).toBe(later.id)
})
