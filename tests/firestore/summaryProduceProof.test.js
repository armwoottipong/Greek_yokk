import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
import { summarySale } from './summarySale.js'
import { doc,setDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(options={}){
  const base=summaryFixture(options)
  base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  return {base,f:summaryProduce(base.shop,base.materials,'S12')}
}
it('produces a new lot with exact source-domain input deductions and unrounded weighted cost',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  expect(f.nextOutput.unitCost).toBe(((base.materials[12].stock/100)*base.materials[12].unitCost+f.operation.rawCostBaht)/((base.materials[12].stock+f.operation.qtyQ)/100))
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([{omitInput:'S0'},{omitInput:'S1'},{omitOutput:true},{omitOperation:true},{omitShop:true}])('rejects incomplete production %j',async omit=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['quantity',f=>{f.nextInputs[0].lotQty.L0++}],
  ['requirement',f=>{f.operation.inputs[0].needed--}],
  ['raw cost',f=>{f.operation.rawCostBaht++}],
  ['output yield',f=>{f.nextOutput.stock++}],
  ['output cost',f=>{f.nextOutput.unitCost++}],
  ['output initial quantity',f=>{f.nextOutput.lots['PRODUCED-LOT'].initialQtyQ++}],
  ['output expiry',f=>{f.nextOutput.lots['PRODUCED-LOT'].expiryDay--}],
  ['input recipe',f=>{f.nextOutput.productionRecipe.quantities[0]--}],
  ['source revision',f=>{f.operation.outputRevision--}],
  ['UID',f=>{f.operation.uid='someone-else'}],
])('rejects forged production %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('can sell six lines from the produced state',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(db,f).commit())
  const changed=[...f.nextInputs,f.nextOutput]
  const materials=base.materials.map(m=>changed.find(next=>next.id===m.id)||m)
  const sale=summarySale(f.nextShop,materials,base.order.lines.concat(base.order.lines,base.order.lines,base.order.lines,base.order.lines,base.order.lines))
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('consumes four input lots and appends the fourth output lot',async()=>{
  const {base,f}=fixture({prepareMaterials:materials=>{
    for(const m of materials){m.lots=[500,500,999000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
    for(const m of materials.slice(0,2)){m.lots=[100,100,100,999700].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects material-only replay for both output and input after production',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(db,f).commit())
  for(const m of [f.nextOutput,...f.nextInputs])await assertFails(setDoc(doc(db,`${GENERATION}/materials/${m.id}`),{...m,revision:m.revision+1}))
})
it('allows another signed-in user to produce, without a role',async()=>{
  const {base}=fixture(),f=summaryProduce(base.shop,base.materials,'S12',{uid:'another-cashier'})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('another-cashier').firestore(),f).commit())
})
it('rejects signed-out production',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryProduceBatch(env.unauthenticatedContext().firestore(),f).commit())
})
it('preserves the original unrounded cost with fractional starting stock and yield',async()=>{
  const base=summaryFixture(),output=base.materials[12]
  output.stock=10;output.lotQty[output.lotIds[0]]=10
  output.productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  const f=summaryProduce(base.shop,base.materials,output.id,{qtyQ:20})
  expect(f.nextOutput.unitCost).toBe(((output.stock/100)*output.unitCost+f.operation.rawCostBaht)/(output.stock/100+f.operation.qtyQ/100))
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('supports an unspecified production expiry date',async()=>{
  const {base}=fixture(),f=summaryProduce(base.shop,base.materials,'S12',{expiryDay:999999})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryProduceBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
