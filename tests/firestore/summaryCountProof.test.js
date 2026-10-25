import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { summarySale } from './summarySale.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture({batch=false,mode='count',zero=false,four=false}={}){
  const base=summaryFixture({prepareMaterials:materials=>{
    if(batch)for(let i=15;i<18;i++)materials.push({...structuredClone(materials[0]),id:`S${i}`,costRank:i,lots:[{...materials[0].lots[0],id:`L${i}`}],activeLotId:`L${i}`})
    if(four)for(const m of materials){m.lots=[250000,250000,250000,250000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }})
  const selected=batch?base.materials:base.materials.slice(0,1)
  const requests=selected.map(m=>({materialId:m.id,mode,requestedQ:zero?2000000:100,counts:four&&mode==='count'?m.lotIds.map(id=>({id,to:zero&&id===m.lotIds[0]?0:200000})):[{id:m.lotIds[0],to:mode==='waste'?zero?0:m.lotQty[m.lotIds[0]]-100:zero?0:m.stock+100}],reason:'physical count'}))
  return {base,f:summaryCount(base.shop,base.materials,requests)}
}
it.each([{},{batch:true},{mode:'waste'},{mode:'waste',zero:true},{zero:true},{four:true},{four:true,batch:true},{four:true,zero:true},{four:true,zero:true,batch:true},{four:true,mode:'waste',zero:true,batch:true},{four:true,mode:'waste'},{four:true,mode:'waste',zero:true}])('commits exact physical counts/waste atomically %j',async options=>{
  const {base,f}=fixture(options);await seedSetCatalog(env,base)
  await assertSucceeds(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  if(options.batch)expect(f.nextMaterials).toHaveLength(18)
})
it.each(Array.from({length:18},(_,i)=>i))('rejects omitting count material %i',async i=>{
  const {base,f}=fixture({batch:true});await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitOperation:true},{omitShop:true}])('rejects incomplete count command %j',async omit=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['quantity',f=>{f.nextMaterials[0].lotQty.L0++}],
  ['total',f=>{f.nextMaterials[0].stock++}],
  ['unit cost',f=>{f.nextMaterials[0].unitCost++}],
  ['provenance',f=>{f.nextMaterials[0].lots.L0.initialQtyQ++}],
  ['recipe',f=>{f.nextMaterials[0].recipeIndex.quantities[0]++}],
  ['source revision',f=>{f.operation.rows[0].revision--}],
  ['UID',f=>{f.operation.uid='someone-else'}],
])('rejects forged count %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects changing the recorded waste value',async()=>{
  const {base,f}=fixture({mode:'waste'});f.operation.rows[0].lossCents++
  await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects material-only replay of a committed count',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCountBatch(db,f).commit())
  const m=f.nextMaterials[0]
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/${m.id}`),{...m,revision:m.revision+1}))
})

it.each([
  ['omitted positive lot',f=>{const m=f.nextMaterials[0];m.allocationIds.pop();m.slotIds[3]='_'}],
  ['duplicate slot',f=>{const m=f.nextMaterials[0];m.slotIds[1]=m.slotIds[0]}],
  ['wrong order',f=>{const m=f.nextMaterials[0];[m.allocationIds[1],m.allocationIds[2]]=[m.allocationIds[2],m.allocationIds[1]];m.slotIds=[...m.allocationIds]}],
  ['deleted quantity',f=>{const m=f.nextMaterials[0];delete m.lotQty[m.lotIds[2]]}],
  ['new quantity',f=>{f.nextMaterials[0].lotQty.EXTRA=100}],
  ['zero sentinel',f=>{f.nextMaterials[0].lotQty._=1}],
  ['invented flag',f=>{const m=f.nextMaterials[0];m.zeroActiveIds=[m.lotIds[1]];f.operation.rows[0].zeroActiveIds=[...m.zeroActiveIds]}],
])('rejects forged four-lot count index %s',async(_,tamper)=>{
  const {base,f}=fixture({four:true});tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([100,499900])('allows expired waste after a sale exhausts fresh stock %i',async requestedQ=>{
  const initial=summaryFixture(),line={...initial.order.lines[0],qty:1},m=initial.materials[0]
  // Independent original-domain receipt, not the now-reserved menu counter slots.
  const fresh=initial.order.inventory.find(row=>row.materialId===m.id).needed
  expect(fresh).toBeGreaterThan(0)
  const base=summaryFixture({prepareMaterials:materials=>{
    const target=materials[0]
    target.lots=[fresh,499900,1000000-fresh-499900].map((qty,i)=>({...target.lots[0],id:`EXP${i}`,qty,isInUse:i===0,expiryDay:i===0?999999:19000+i}))
    target.activeLotId='EXP0'
  }})
  const sale=summarySale(base.shop,base.materials,[line]),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  await assertSucceeds(setSaleBatch(db,sale).commit())
  const target=sale.nextMaterials[0]
  expect(target.activeLotId).toBe('');expect(target.stock).toBeGreaterThan(0)
  const f=summaryCount(sale.nextShop,sale.nextMaterials,[{materialId:target.id,mode:'waste',requestedQ,counts:[{id:'EXP1',to:499900-requestedQ}]}])
  await assertSucceeds(summaryCountBatch(db,f).commit())
  expect(f.nextMaterials[0].activeLotId).toBe('')
})

it('preserves a still-positive active pointer during counts',async()=>{
  const {base,f}=fixture({four:true}),m=f.nextMaterials[0],active=m.lotIds[1]
  m.activeLotId=active;f.operation.rows[0].activeLotId=active
  m.allocationIds=[active,...m.allocationIds.filter(id=>id!==active)];m.slotIds=[...m.allocationIds]
  await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('binds a confirmed positive next pointer after the counted active lot empties',async()=>{
  const {base,f}=fixture({four:true,zero:true}),m=f.nextMaterials[0],active=m.lotIds[2]
  m.activeLotId=active;f.operation.rows[0].activeLotId=active
  m.lastStockInDay=m.lots[active].receiveDay
  m.expiryDay=m.lots[active].expiryDay===999999?base.materials[0].expiryDay:m.lots[active].expiryDay
  m.allocationIds=[active,...m.allocationIds.filter(id=>id!==active)];m.slotIds=m.allocationIds.concat(['_'])
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([false,true])('counts a retained zero lot with a legacy zero flag %j',async flagged=>{
  const base=summaryFixture({prepareMaterials:materials=>{
    const m=materials[0];m.lots=[500000,500000,0].map((qty,i)=>({...m.lots[0],id:`HIST${i}`,qty,isInUse:flagged?i===2:i===0,receiveDay:20000+i}));m.activeLotId=flagged?'':'HIST0'
  }})
  const f=summaryCount(base.shop,base.materials,[{materialId:base.materials[0].id,counts:[{id:'HIST2',to:100}]}])
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each([false,true])('rejects an empty waste pointer after depletion with stock left %j',async emptyStock=>{
  const {base,f}=fixture(emptyStock?{mode:'waste',zero:true}:{four:true,mode:'waste',zero:true}),m=f.nextMaterials[0]
  const active=emptyStock?base.materials[0].lotIds[0]:''
  m.activeLotId=active;f.operation.rows[0].activeLotId=active
  if(emptyStock){m.allocationIds=[active];m.slotIds=[active,'_','_','_']}
  else{m.allocationIds=m.lotIds.filter(id=>m.lotQty[id]>0).sort((a,b)=>m.lots[a].sortKey-m.lots[b].sortKey);m.slotIds=m.allocationIds.concat(['_'])}
  await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('requires a positive next waste pointer when expired stock remains after active depletion',async()=>{
  const {base}=fixture({four:true}),m=base.materials[0]
  for(const [i,id] of m.lotIds.entries()){m.lots[id].expiryDay=19000+i;m.lots[id].sortKey=(19000+i)*1e9+m.lots[id].receiveDay*1000+m.lots[id].ordinal}
  const f=summaryCount(base.shop,base.materials,[{materialId:m.id,mode:'waste',requestedQ:250000,counts:[{id:m.lotIds[0],to:0}]}])
  const n=f.nextMaterials[0];n.activeLotId='';f.operation.rows[0].activeLotId=''
  n.allocationIds=n.lotIds.filter(id=>n.lotQty[id]>0).sort((a,b)=>n.lots[a].sortKey-n.lots[b].sortKey);n.slotIds=n.allocationIds.concat(['_'])
  await seedSetCatalog(env,base)
  await assertFails(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
