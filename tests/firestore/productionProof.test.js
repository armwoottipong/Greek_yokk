import {readFile} from 'node:fs/promises'
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertSucceeds,assertFails} from '@firebase/rules-unit-testing'
import {doc,setDoc,getDoc,writeBatch,serverTimestamp} from 'firebase/firestore'
import {allocateInventory,aggregateRequirements} from '../../src/domain/inventory.js'
import {DEFAULT_MATERIALS} from '../../src/data/initialData.js'
import {businessDateKey} from '../../src/domain/businessDate.js'
import {recomputeFromDomain} from './proofDomainAdapter.js'
import {createRulesTest} from './helpers.js'
import {proofFixture,seedProof,saleBatch,ROOT,GENERATION} from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidate.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(config={}) {
 const base=proofFixture(),materials=config.materials||base.materials.slice(0,3).map(m=>structuredClone(m))
 if(!config.materials){materials[0].unitCost=0.2075;materials[1].unitCost=0.045}
 const requirements=aggregateRequirements(config.requirements||[{materialId:'YOGURT',qty:40},{materialId:'FRUIT',qty:10},{materialId:'TOPPING',qty:2}])
 const source=materials.map(m=>({...m,stock:m.stock/100,lots:m.lots.map(l=>({...l,qty:l.qty/100,expiryDate:null,receiveDate:'2026-01-01'}))}))
 const allocation=allocateInventory(source,requirements)
 if(!allocation.ok)throw new Error('invalid production fixture')
 const inputs=materials.map(m=>{
  const needed=Math.round(requirements.find(r=>r.materialId===m.id).qty*100)
  const taken=id=>Math.round(allocation.allocations.filter(a=>a.materialId===m.id&&a.lotId===id).reduce((n,a)=>n+a.qty,0)*100)
  return {materialId:m.id,revision:m.revision,costRank:m.costRank,needed,lot0Id:m.lots[0].id,lot1Id:m.lots[1].id,
   take0:taken(m.lots[0].id),take1:taken(m.lots[1].id),
   ...(m.lots.length>2?{four:{ids:[...m.lots.map(l=>l.id),...Array(4-m.lots.length).fill('')],order:[0,1,2,3],takes:[...m.lots.map(l=>taken(l.id)),...Array(4-m.lots.length).fill(0)]}}:{}),shortage:0,ingredientCostBaht:(needed/100)*m.unitCost,packagingCostCents:0}
 })
 const rawCost=inputs.reduce((n,r)=>n+r.ingredientCostBaht,0),outputQty=config.outputQty||2500
 const target=config.target||{id:'PRODUCED',revision:1,inventoryType:'ingredient',hasSubRecipe:true,deleted:false,costRank:10,unitCost:0.3,stock:1000,lastOpId:'',activeLotId:'OLD',lotIds:['OLD'],
  lots:[{id:'OLD',qty:1000,expiryDay:999999,receiveDay:20000,isInUse:true}]}
 const day=Math.floor(Date.parse(businessDateKey(new Date())+'T00:00:00Z')/86400000)
 const receipt={schemaVersion:1,kind:'produce',status:'committed',opId:'PRODUCE-001',uid:'owner',createdAt:serverTimestamp(),
  materialIds:materials.map(m=>m.id),inputs,outputId:target.id,outputRevision:target.revision,outputQty,rawCostBaht:rawCost,shopRevision:2,note:'test batch',
  newLot:{id:'NEW-LOT',qty:outputQty,initialQty:outputQty,receiveDay:day,expiryDay:day+7,unitCost:rawCost/(outputQty/100),isInUse:false,note:'test batch',createdAt:new Date().toISOString()}}
 const nextInputs=materials.map((m,i)=>({...structuredClone(m),stock:Math.round(allocation.materials[i].stock*100),revision:m.revision+1,lastOpId:receipt.opId,lastOpKind:'produce',lastOpIndex:i,
  activeLotId:allocation.materials[i].lots.find(l=>l.isInUse)?.id||'',lots:m.lots.map((l,j)=>({...l,qty:Math.round(allocation.materials[i].lots[j].qty*100),isInUse:allocation.materials[i].lots[j].isInUse}))}))
 const output={...structuredClone(target),revision:target.revision+1,lastOpId:receipt.opId,lastOpKind:'produce',stock:target.stock+outputQty,
  unitCost:((target.stock/100)*target.unitCost+rawCost)/(target.stock/100+outputQty/100),lotIds:[...target.lotIds,receipt.newLot.id],lots:[...structuredClone(target.lots),receipt.newLot]}
 return {base,materials,target,receipt,nextInputs,output,shop:{...structuredClone(base.records[ROOT]),revision:2,lastOpId:receipt.opId,lastOpKind:'produce'}}
}
async function seed(f) {
 await seedProof(env,f.base)
 f.shop.catalog=structuredClone(f.base.records[ROOT].catalog)
 await env.withSecurityRulesDisabled(async ctx=>{
  for(const m of [...f.materials,f.target])await setDoc(doc(ctx.firestore(),`${GENERATION}/materials/${m.id}`),m)
 })
}
function batch(f,{omitInput,omitInputProof,omitOutput=false,omitShop=false}={}) {
 const db=(f.signedOut?env.unauthenticatedContext():env.authenticatedContext(f.receipt.uid)).firestore(),b=writeBatch(db)
 b.set(doc(db,`${GENERATION}/productions/${f.receipt.opId}`),f.receipt)
 for(const m of f.nextInputs)if(m.id!==omitInput)b.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
 for(let i=0;i<f.receipt.inputs.length;i++)if(f.receipt.inputs[i].four&&i!==omitInputProof)b.set(doc(db,`${GENERATION}/productions/${f.receipt.opId}/inputProofs/${i}`),{opId:f.receipt.opId,index:i})
 if(!omitOutput)b.set(doc(db,`${GENERATION}/materials/${f.output.id}`),f.output)
 if(!omitShop)b.set(doc(db,ROOT),f.shop)
 return b
}
it('atomically consumes source-domain allocations and appends a new lot with weighted material cost',async()=>{
 const f=fixture();await seed(f)
 await assertSucceeds(batch(f).commit())
 const db=env.authenticatedContext('owner').firestore()
 const saved=(await getDoc(doc(db,`${GENERATION}/materials/PRODUCED`))).data()
 expect(saved.stock).toBe(3500);expect(saved.unitCost).toBe(f.output.unitCost)
 expect(saved.lots[0]).toEqual(f.target.lots[0]);expect(saved.lots[1].unitCost).toBe(f.receipt.rawCostBaht/25)
 for(const m of f.nextInputs)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
})
it.each([
 ['not logged in',f=>{f.signedOut=true}],
 ['wrong output cost',f=>{f.output.unitCost+=0.01}],
 ['wrong new lot cost',f=>{f.receipt.newLot.unitCost+=0.01}],
 ['rewritten old lot',f=>{f.output.lots[0].id='FORGED'}],
 ['duplicate lot ID',f=>{f.receipt.newLot.id='OLD'}],
 ['extra manufactured stock',f=>{f.output.stock++}],
 ['wrong input deduction',f=>{f.nextInputs[0].stock++;f.nextInputs[0].lots[0].qty++}],
 ['cost forged with matching output',f=>{f.receipt.inputs[0].ingredientCostBaht++;f.receipt.rawCostBaht++;f.receipt.newLot.unitCost=f.receipt.rawCostBaht/25;f.output.unitCost=(3+f.receipt.rawCostBaht)/35}],
 ['expired before production date',f=>{f.receipt.newLot.expiryDay=f.receipt.newLot.receiveDay-1}],
 ['omitted input',()=>{},{omitInput:'FRUIT'}],
 ['omitted output',()=>{},{omitOutput:true}],
 ['omitted shop',()=>{},{omitShop:true}]
])('rejects %s without partially producing stock',async(_label,alter,options)=>{
 const f=fixture();await seed(f);alter(f)
 await assertFails(batch(f,options).commit())
 const db=env.authenticatedContext('owner').firestore()
 expect((await getDoc(doc(db,`${GENERATION}/materials/PRODUCED`))).data().stock).toBe(f.target.stock)
 expect((await getDoc(doc(db,`${GENERATION}/materials/YOGURT`))).data().stock).toBe(f.materials[0].stock)
})
it('does not apply the same production operation twice',async()=>{
 const f=fixture();await seed(f)
 await assertSucceeds(batch(f).commit());await assertFails(batch(f).commit())
})

it('appends after many historical lots without rewriting or dropping their identities',async()=>{
 const f=fixture()
 for(let i=1;i<7;i++) {
  f.target.lots.push({...structuredClone(f.target.lots[0]),id:`HISTORY-${i}`,qty:0,isInUse:false})
  f.target.lotIds.push(`HISTORY-${i}`)
 }
 f.output.lots=[...structuredClone(f.target.lots),f.receipt.newLot]
 f.output.lotIds=[...f.target.lotIds,f.receipt.newLot.id]
 await seed(f)
 await assertSucceeds(batch(f).commit())
 const saved=(await getDoc(doc(env.authenticatedContext('owner').firestore(),`${GENERATION}/materials/PRODUCED`))).data()
 expect(saved.lots).toHaveLength(8)
 expect(saved.lots.slice(0,7)).toEqual(f.target.lots)
})
it('rejects reusing a lot ID buried in historical lots',async()=>{
 const f=fixture()
 f.target.lots.push({...structuredClone(f.target.lots[0]),id:'HISTORIC',qty:0,isInUse:false})
 f.target.lotIds.push('HISTORIC');f.receipt.newLot.id='HISTORIC'
 f.output.lots=[...structuredClone(f.target.lots),f.receipt.newLot];f.output.lotIds=[...f.target.lotIds,'HISTORIC']
 await seed(f);await assertFails(batch(f).commit())
})
it('activates the newly produced lot when no existing non-empty lot is active',async()=>{
 const f=fixture();f.target.stock=0;f.target.lots[0].qty=0;f.target.lots[0].isInUse=false;f.target.activeLotId=''
 f.receipt.newLot.isInUse=true
 f.output.stock=f.receipt.outputQty;f.output.activeLotId=f.receipt.newLot.id
 f.output.unitCost=f.receipt.rawCostBaht/(f.receipt.outputQty/100)
 f.output.lots=[...structuredClone(f.target.lots),f.receipt.newLot]
 await seed(f);await assertSucceeds(batch(f).commit())
})

it('produces the shipped Greek Base recipe from milk and starter at source precision',async()=>{
 const greek=DEFAULT_MATERIALS.find(m=>m.id==='MAT001')
 const materials=greek.subRecipe.map((r,i)=>{
  const source=DEFAULT_MATERIALS.find(m=>m.id===r.materialId),stock=Math.round(source.stock*100),first=Math.min(stock,10000)
  return {id:source.id,revision:1,costRank:i,unitCost:source.unitCost,inventoryType:'ingredient',deleted:false,stock,lastOpId:'',activeLotId:`${source.id}-0`,
   lots:[first,stock-first].map((qty,j)=>({id:`${source.id}-${j}`,qty,expiryDay:999999,receiveDay:20000+j,isInUse:j===0}))}
 })
 const target={id:greek.id,revision:1,costRank:10,unitCost:greek.unitCost,inventoryType:'ingredient',hasSubRecipe:true,deleted:false,stock:greek.stock*100,
  lastOpId:'',activeLotId:'GREEK-OLD',lotIds:['GREEK-OLD'],lots:[{id:'GREEK-OLD',qty:greek.stock*100,expiryDay:999999,receiveDay:20000,isInUse:true}]}
 const f=fixture({materials,target,requirements:greek.subRecipe,outputQty:greek.yieldQty*100})
 expect(f.receipt.rawCostBaht).toBe(249)
 expect(f.receipt.newLot.unitCost).toBe(0.2075)
 await seed(f);await assertSucceeds(batch(f).commit())
 const db=env.authenticatedContext('owner').firestore()
 expect((await getDoc(doc(db,`${GENERATION}/materials/MAT001`))).data().stock).toBe(470000)
 expect((await getDoc(doc(db,`${GENERATION}/materials/MAT002`))).data().stock).toBe(1000000)
})
it('rejects production from an input lot that expired after the preview was prepared',async()=>{
 const f=fixture()
 const day=f.receipt.newLot.receiveDay
 f.materials[0].lots.forEach(l=>{l.expiryDay=day-1})
 await seed(f);await assertFails(batch(f).commit())
})
it('rejects stale input revisions after another device has already changed them',async()=>{
 const f=fixture();f.materials[0].revision++
 await seed(f);await assertFails(batch(f).commit())
})
it('rejects unrelated shop metadata in a production command',async()=>{
 const f=fixture();f.receipt.uid='cashier';f.shop.injected=true
 await seed(f);await assertFails(batch(f).commit())
})

it('sells the newly produced material using its committed lots and weighted cost',async()=>{
 const p=fixture();await seed(p);await assertSucceeds(batch(p).commit())
 const owner=env.authenticatedContext('owner').firestore(),f=proofFixture()
 f.order.lines=[f.order.lines[0]];const line=f.order.lines[0]
 line.options=[];line.catalog.recipe={PRODUCED:1000,FRUIT:100,CUP:100}
 f.materials=[]
 for(const id of ['FRUIT','CUP','PRODUCED'])f.materials.push((await getDoc(doc(owner,`${GENERATION}/materials/${id}`))).data())
 f.materials.sort((a,b)=>a.costRank-b.costRank);f.order.materialIds=f.materials.map(m=>m.id)
 f.order.packaging={}
 f.nextShop={...p.shop,revision:3,lastOpId:f.order.opId,lastOpKind:'sale'}
 recomputeFromDomain(f)
 await env.withSecurityRulesDisabled(async ctx=>{
  const catalog=(await getDoc(doc(ctx.firestore(),`${GENERATION}/catalog/current`))).data()
  catalog.menus.BOWL=structuredClone(line.catalog)
  await setDoc(doc(ctx.firestore(),`${GENERATION}/catalog/current`),catalog)
  f.nextShop.catalog=structuredClone(catalog)
  const root=(await getDoc(doc(ctx.firestore(),ROOT))).data()
  await setDoc(doc(ctx.firestore(),ROOT),{...root,catalog})
 })
 await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
 const saved=(await getDoc(doc(owner,`${GENERATION}/materials/PRODUCED`))).data()
 expect(saved.stock).toBe(p.output.stock-1000)
 expect(saved.unitCost).toBe(p.output.unitCost)
 expect(saved.activeLotId).toBe('NEW-LOT')
})

it('appends a second production lot without replacing the first produced lot',async()=>{
 const first=fixture();await seed(first);await assertSucceeds(batch(first).commit())
 const db=env.authenticatedContext('owner').firestore(),materials=[]
 for(const m of first.materials)materials.push((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data())
 const target=(await getDoc(doc(db,`${GENERATION}/materials/PRODUCED`))).data()
 const second=fixture({materials,target,outputQty:2500})
 second.receipt.opId='PRODUCE-002';second.receipt.newLot.id='NEW-LOT-2';second.receipt.shopRevision=3
 for(const m of second.nextInputs)m.lastOpId=second.receipt.opId
 second.output.lastOpId=second.receipt.opId;second.output.lotIds=[...target.lotIds,'NEW-LOT-2']
 second.shop={...first.shop,revision:3,lastOpId:second.receipt.opId}
 await assertSucceeds(batch(second).commit())
 const saved=(await getDoc(doc(db,`${GENERATION}/materials/PRODUCED`))).data()
 expect(saved.lots).toHaveLength(3);expect(saved.stock).toBe(6000)
 expect(saved.lots.slice(0,2)).toEqual(target.lots)
})
it('commits exactly one of two simultaneous production commands based on the same stock',async()=>{
 const a=fixture();await seed(a)
 const b=fixture();b.receipt.opId='PRODUCE-RACE';b.receipt.newLot.id='RACE-LOT'
 for(const m of b.nextInputs)m.lastOpId=b.receipt.opId
 b.output.lastOpId=b.receipt.opId;b.output.lotIds=[...b.target.lotIds,'RACE-LOT'];b.shop.lastOpId=b.receipt.opId
 const results=await Promise.allSettled([batch(a).commit(),batch(b).commit()])
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 const saved=(await getDoc(doc(env.authenticatedContext('owner').firestore(),`${GENERATION}/materials/PRODUCED`))).data()
 expect(saved.stock).toBe(3500)
})

it('rejects silently deleting an empty historical input lot',async()=>{
 const f=fixture()
 f.materials[0].lots.push({...structuredClone(f.materials[0].lots[1]),id:'HISTORY-KEEP',qty:0,isInUse:false})
 await seed(f)
 await assertFails(batch(f).commit())
})

it('allows any newly signed-in account to produce without assigning a role',async()=>{
 const f=fixture();f.receipt.uid='new-google-user';await seed(f)
 await assertSucceeds(batch(f).commit())
})

function multiInput(quantities) {
 const materials=proofFixture().materials.slice(0,3).map(m=>structuredClone(m)),first=materials[0]
 first.lots=quantities.map((qty,i)=>({...structuredClone(first.lots[0]),id:`RAW-${i}`,qty,isInUse:i===0,receiveDay:20000+i}))
 first.activeLotId=first.lots[0].id
 return fixture({materials})
}
it.each([{q:[1000,2000,7000]},{q:[500,500,1000,8000]}])('produces across source lots $q with exact domain deductions',async({q})=>{
 const f=multiInput(q);await seed(f);await assertSucceeds(batch(f).commit())
 const saved=(await getDoc(doc(env.authenticatedContext('owner').firestore(),`${GENERATION}/materials/YOGURT`))).data()
 expect(saved.stock).toBe(6000);expect(saved.lots).toEqual(f.nextInputs[0].lots)
})
it('rejects a multi-lot production if its input validation proof is omitted',async()=>{
 const f=multiInput([500,500,1000,8000]);await seed(f)
 await assertFails(batch(f,{omitInputProof:0}).commit())
})
it('rejects forged third-lot stock in a production with coherent overall totals',async()=>{
 const f=multiInput([500,500,1000,8000]);await seed(f)
 f.nextInputs[0].lots[2].qty++
 await assertFails(batch(f).commit())
})

it.each(['valid','prefix metadata','suffix ID','extra stock','omitted input proof'])('checks retained source history during production: %s',async mode=>{
 const f=multiInput([500,500,1000,8000]),source=f.materials[0],offset=6
 const history=(side,n)=>Array.from({length:n},(_,i)=>({...structuredClone(source.lots[0]),id:`${side}-${i}`,qty:0,isInUse:false}))
 const prefix=history('CONSUMED',offset),suffix=history('LATER',5)
 source.lots=[...structuredClone(prefix),...source.lots,...structuredClone(suffix)]
 f.nextInputs[0].lots=[...structuredClone(prefix),...f.nextInputs[0].lots,...structuredClone(suffix)]
 f.receipt.inputs[0].four.offset=offset
 await seed(f)
 if(mode==='prefix metadata')f.nextInputs[0].lots[0].receiveDay++
 if(mode==='suffix ID')f.nextInputs[0].lots.at(-1).id='FORGED-HISTORY'
 if(mode==='extra stock'){f.nextInputs[0].lots[offset].qty++;f.nextInputs[0].stock++}
 const commit=batch(f,mode==='omitted input proof'?{omitInputProof:0}:{}).commit()
 const db=env.authenticatedContext('owner').firestore()
 if(mode==='valid'){
  await assertSucceeds(commit)
  expect((await getDoc(doc(db,`${GENERATION}/materials/YOGURT`))).data().lots).toEqual(f.nextInputs[0].lots)
 }else{
  await assertFails(commit)
  expect((await getDoc(doc(db,`${GENERATION}/productions/${f.receipt.opId}`))).exists()).toBe(false)
  expect((await getDoc(doc(db,`${GENERATION}/materials/YOGURT`))).data()).toEqual(source)
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.target.id}`))).data()).toEqual(f.target)
 }
})
