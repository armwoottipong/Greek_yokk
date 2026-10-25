import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,serverTimestamp,deleteDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { materialRegistryShop,summaryMaterialCreate,summaryMaterialArchive } from './summaryMaterialAuthor.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(type='ingredient'){
  const base=summaryFixture(),id='NEW-MATERIAL',opId='MATERIAL-CREATE'
  base.shop.materialIds=base.materials.map(m=>m.id)
  base.shop.productionUsers=Object.fromEntries(base.shop.materialIds.map(id=>[id,[]]))
  const next={id,revision:1,costRank:base.shop.materialIds.length,deleted:false,inventoryType:type,
    name:'New material',emoji:'',unit:'g',minAlertQ:0,unitCost:0,packSize:1000,packCostCents:0,stock:0,
    lots:{_:{id:'_',qty:0,isInUse:false,expiryDay:999999,receiveDay:999999,ordinal:999999,sortKey:999999*1e9+999999*1000+999999}},
    lotIds:[],lotQty:{_:0},zeroActiveIds:[],allocationIds:[],slotIds:['_','_','_','_'],activeLotId:'',lastStockInDay:999999,expiryDay:999999,
    recipeIndex:{catalogRevision:base.shop.catalogRevision,quantities:Array(15).fill(0),
      menus:{_:0,...Object.fromEntries(base.shop.catalog.menuIds.map(id=>[id,0]))},addons:{_:0,...Object.fromEntries(base.shop.catalog.addonIds.map(id=>[id,0]))}},
    lastOpId:opId,lastOpKind:'material_create',lastOpIndex:0}
  const f={next,nextShop:{...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'material_create',
    materialIds:base.shop.materialIds.concat(id),productionUsers:{...structuredClone(base.shop.productionUsers),[id]:[]}},
    operation:{schemaVersion:2,kind:'material_create',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:id,materialRevision:0,shopRevision:base.shop.revision+1,materialSnapshot:structuredClone(next)}}
  return {base,f}
}
it.each(['ingredient','packaging'])('creates a zero-stock %s without changing sale guards',async type=>{
  const {base,f}=fixture(type),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().catalog).toEqual(base.shop.catalog)
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data()).toEqual(f.next)
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects incomplete material creation %s',async key=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>{f.next.stock=1}],['cost',f=>{f.next.unitCost=1}],['cost rank',f=>{f.next.costRank=0}],
  ['lot',f=>{f.next.lotQty.EXTRA=1}],['active lot',f=>{f.next.activeLotId='EXTRA'}],
  ['recipe coefficient',f=>{f.next.recipeIndex.menus.SIMPLE=1}],['hidden coefficient',f=>{f.next.recipeIndex.addons.HIDDEN=1}],
  ['legacy coefficient',f=>{f.next.recipeIndex.quantities[0]=1}],['type',f=>{f.next.inventoryType='unknown'}],
  ['production recipe',f=>{f.next.productionRecipe={inputIds:['S0'],yieldQ:100,quantities:[100]}}],
  ['deleted',f=>{f.next.deleted=true}],['sentinel',f=>{f.next.lots._.qty=1}],
  ['recipe revision',f=>{f.next.recipeIndex.catalogRevision++}],['name',f=>{f.next.name=''}],
  ['fractional pack',f=>{f.next.packSize=0.5}],['unit',f=>{f.next.unit=''}],
  ['membership',f=>{f.nextShop.catalog.summaryMaterials[0]=f.next.id}],
  ['reverse references',f=>{f.nextShop.productionUsers.S0=['S1']}],
  ['own reference',f=>{f.nextShop.productionUsers[f.next.id]=['S0']}],
  ['registry reorder',f=>{f.nextShop.materialIds.reverse()}],
])('rejects coherent creation forgery: %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);f.operation.materialSnapshot=structuredClone(f.next);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['ingredient','packaging'])('creates, receives, archives and restores %s preserving lots and costs',async inventoryType=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const created=summaryMaterialCreate(base.shop,{id:'CREATED',name:'New',emoji:'',unit:'g',minAlertQ:0,packSize:1000,inventoryType})
  await seedSetCatalog(env,base);await assertSucceeds(summarySwitchBatch(db,created).commit())
  const received=summaryStock(created.nextShop,created.next,{qtyQ:10000,unitCost:0.5,receiveDay:21000,expiryDay:22000})
  await assertSucceeds(setStockInBatch(db,received).commit())
  const archived=summaryMaterialArchive(received.nextShop,received.next,true)
  await assertSucceeds(summarySwitchBatch(db,archived).commit())
  await assertFails(deleteDoc(doc(db,`${GENERATION}/materials/${created.next.id}`)))
  const blocked=summaryStock(archived.nextShop,archived.next,{opId:'ARCHIVED-RECEIVE'})
  await assertFails(setStockInBatch(db,blocked).commit())
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(archived.nextShop.revision)
  const restored=summaryMaterialArchive(archived.nextShop,archived.next,false,{opId:'RESTORE'})
  await assertSucceeds(summarySwitchBatch(db,restored).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${created.next.id}`))).data().lotQty).toEqual(received.next.lotQty)
  const again=summaryStock(restored.nextShop,restored.next,{opId:'RECEIVE-AGAIN',qtyQ:100,unitCost:0.6,receiveDay:21000,expiryDay:22000})
  await assertSucceeds(setStockInBatch(db,again).commit())
})
it('allows one of two creates, then replans the second with a distinct stable cost rank',async()=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore()
  const input={id:'ONE',name:'New',emoji:'',unit:'g',minAlertQ:0,packSize:1,inventoryType:'ingredient'}
  const first=summaryMaterialCreate(base.shop,input),second=summaryMaterialCreate(base.shop,{...input,id:'TWO'},{opId:'SECOND'})
  await seedSetCatalog(env,base);await assertSucceeds(summarySwitchBatch(db,first).commit())
  await assertFails(summarySwitchBatch(db,second).commit())
  const fresh=summaryMaterialCreate(first.nextShop,{...input,id:'TWO'},{opId:'SECOND'})
  await assertSucceeds(summarySwitchBatch(db,fresh).commit());expect(fresh.next.costRank).toBe(first.next.costRank+1)
})
it('keeps prepared sales working after create/archive while enforcing fresh shop revisions',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore(),sale=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale);await assertSucceeds(summarySwitchBatch(db,f).commit())
  await assertFails(preparedSaleBatch(db,sale).commit())
  const archived=summaryMaterialArchive(f.nextShop,f.next,true)
  await assertSucceeds(summarySwitchBatch(db,archived).commit())
  const fresh=preparedSale(summarySale(archived.nextShop,[...base.materials,archived.next],base.order.lines))
  await assertSucceeds(preparedSaleBatch(db,fresh).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data().deleted).toBe(true)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${fresh.order.opId}`))).data()
  const returned=summaryCancel(fresh.nextShop,[...fresh.nextMaterials,archived.next],order)
  await assertSucceeds(summaryCancelBatch(db,returned).commit())
  for(const m of returned.nextMaterials)expect(m.lotQty).toEqual(base.materials.find(before=>before.id===m.id).lotQty)
  await assertFails(summaryCancelBatch(db,returned).commit())
})
it('blocks a production ingredient using a reverse index compiled from actual recipes',async()=>{
  const {base,f}=archiveFixture(),raw=base.materials.at(-1)
  base.materials[0].productionRecipe={inputIds:[raw.id],quantities:[100],yieldQ:100}
  base.shop=materialRegistryShop(base.shop,base.materials)
  f.nextShop.productionUsers=structuredClone(base.shop.productionUsers)
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([63,64])('enforces material registry capacity from %i even with client validation bypassed',async count=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  for(let i=15;i<count;i++)base.materials.push({...structuredClone(f.next),id:`EXTRA${i}`,costRank:i})
  base.shop=materialRegistryShop(base.shop,base.materials)
  f.next.costRank=count;f.operation.materialSnapshot=structuredClone(f.next)
  f.nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:f.operation.opId,lastOpKind:'material_create',
    materialIds:base.shop.materialIds.concat(f.next.id),productionUsers:{...structuredClone(base.shop.productionUsers),[f.next.id]:[]}}
  await seedSetCatalog(env,base)
  if(count===63)await assertSucceeds(summarySwitchBatch(db,f).commit())
  else await assertFails(summarySwitchBatch(db,f).commit())
})
it('does not let archival erase its own production reference',async()=>{
  const {base,f}=archiveFixture();base.shop.productionUsers[f.next.id]=['S0']
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('requires trusted registry initialization and cannot bootstrap it from a client command',async()=>{
  const {base,f}=fixture();delete base.shop.materialIds;delete base.shop.productionUsers
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects anonymous, stale-generation, duplicate-ID and replayed creates',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.unauthenticatedContext().firestore(),f).commit())
  await assertSucceeds(summarySwitchBatch(db,f).commit());await assertFails(summarySwitchBatch(db,f).commit())
  await assertFails(deleteDoc(doc(db,`${GENERATION}/operations/${f.operation.opId}`)))
  await env.clearFirestore();base.shop.generation='different';f.nextShop.generation='different';await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(db,f).commit())
  await env.clearFirestore();base.shop.generation='g1';f.nextShop.generation='g1'
  f.next.id='S0';f.operation.materialId='S0';f.operation.materialSnapshot=structuredClone(f.next);f.nextShop.materialIds[15]='S0';delete f.nextShop.productionUsers['NEW-MATERIAL']
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(db,f).commit())
})
it.each(['count','waste'])('retains the prepared policy budget for 18 materials and four-lot %s',async mode=>{
  const base=summaryFixture({prepareMaterials:materials=>{
    for(let i=15;i<18;i++)materials.push({...structuredClone(materials[0]),id:`S${i}`,costRank:i})
    for(const m of materials){m.lots=Array.from({length:4},(_,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty:250000,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }})
  base.shop=materialRegistryShop(base.shop,base.materials)
  const f=summaryCount(base.shop,base.materials,base.materials.map(m=>({materialId:m.id,mode,requestedQ:1000000,
    counts:mode==='waste'?[{id:m.lotIds[0],to:0}]:m.lotIds.map(id=>({id,to:200000})),reason:'Count'})))
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCountBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.nextMaterials).toHaveLength(18)
  for(const m of f.nextMaterials)expect(m.stock).toBe(Object.values(m.lotQty).reduce((a,b)=>a+b,0))
})
function archiveFixture(){
  const {base,f:create}=fixture(),opId='ARCHIVE'
  base.materials.push(create.next);base.shop=create.nextShop
  const m=base.materials.at(-1)
  const f={next:{...structuredClone(m),deleted:true,revision:m.revision+1,lastOpId:opId,lastOpKind:'material_archive',lastOpIndex:0},
    nextShop:{...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'material_archive'},
    operation:{schemaVersion:2,kind:'material_archive',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,materialRevision:m.revision,shopRevision:base.shop.revision+1,deleted:true}}
  return {base,f}
}
it('archives an unreferenced material without deleting its document or registry entry',async()=>{
  const {base,f}=archiveFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().materialIds).toEqual(base.shop.materialIds)
  expect((await getDoc(doc(db,`${GENERATION}/materials/${f.next.id}`))).data().deleted).toBe(true)
})
it.each(['omitShop','omitMaterial','omitOperation'])('rejects incomplete archive %s',async key=>{
  const {base,f}=archiveFixture();await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each(['production','menu','addon','sale membership'])('rejects archive with %s reference',async kind=>{
  const {base,f}=archiveFixture(),m=base.materials.at(-1)
  if(kind==='production'){base.shop.productionUsers[m.id]=['S0'];f.nextShop.productionUsers[m.id]=['S0']}
  if(kind==='menu'){m.recipeIndex.menus.SIMPLE=1;f.next.recipeIndex.menus.SIMPLE=1}
  if(kind==='addon'){m.recipeIndex.addons.A0=1;f.next.recipeIndex.addons.A0=1}
  if(kind==='sale membership'){base.shop.catalog.summaryMaterials[0]=m.id;f.nextShop.catalog.summaryMaterials[0]=m.id}
  await seedSetCatalog(env,base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  ['stock',f=>{f.next.stock++}],['lot quantities',f=>{f.next.lotQty._++}],['recipe',f=>{f.next.recipeIndex.menus.SIMPLE=0.1}],
  ['drop registry',f=>{f.nextShop.materialIds.pop()}],['drop references',f=>{delete f.nextShop.productionUsers[f.next.id]}],
  ['catalog',f=>{f.nextShop.catalogRevision++}],['stale material',f=>{f.operation.materialRevision--}],
  ['stale shop',f=>{f.operation.shopRevision--}],['wrong uid',f=>{f.operation.uid='other'}],
  ['receipt flag',f=>{f.operation.deleted=false}],['no toggle',f=>{f.next.deleted=false;f.operation.deleted=false}],
])('rejects archive forgery: %s',async(_,tamper)=>{
  const {base,f}=archiveFixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
