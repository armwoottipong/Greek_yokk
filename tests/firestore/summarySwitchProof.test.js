import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summarySale } from './summarySale.js'
import { summarySwitch,summarySwitchBatch } from './summarySwitch.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture({zero=false}={}){
  const base=summaryFixture({prepareMaterials:materials=>{
    const m=materials[0];m.lots=[zero?0:1000,1000,1000,zero?997000:996000].map((qty,i)=>({...m.lots[0],id:`L${i}`,qty,isInUse:i===1,receiveDay:20000+i}));m.activeLotId='L1';m.stock=m.lots.reduce((n,l)=>n+l.qty,0)
  }})
  return {base,f:summarySwitch(base.shop,base.materials[0],zero?'L0':'L3')}
}
it.each([{},{zero:true}])('switches all flags and dates without changing quantities %j',async options=>{
  const {base,f}=fixture(options);await seedSetCatalog(env,base)
  expect(f.next.lotQty).toEqual(base.materials[0].lotQty);expect(f.next.lots).toEqual(base.materials[0].lots)
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([{omitMaterial:true},{omitShop:true},{omitOperation:true}])('rejects incomplete switch %j',async omit=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['quantity',f=>{f.next.lotQty.L0++}],
  ['cost',f=>{f.next.unitCost++}],
  ['metadata flag',f=>{f.next.lots.L0.isInUse=true}],
  ['date',f=>{f.next.expiryDay--}],
  ['index',f=>{f.next.slotIds.reverse()}],
  ['UID',f=>{f.operation.uid='someone-else'}],
])('rejects altered switch %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('uses the selected positive lot first on the next sale',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  const sale=summarySale(f.nextShop,base.materials.map(m=>m.id===f.next.id?f.next:m),base.order.lines)
  expect(sale.order.inventory[0].lotIds[0]).toBe('L3')
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('rejects replay of a committed switch receipt',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${f.next.id}`),{...f.next,revision:f.next.revision+1}))
})
