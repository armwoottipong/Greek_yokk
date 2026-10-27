import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,setDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {typeFixture} from './summaryMaterialTypeFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {ROOT,GENERATION} from './proofFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
function setup(uid='cashier'){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:'device',online:true,ready:true}
 const db=env.authenticatedContext(uid).firestore()
 return {db,api:createCoreTransport({db,getContext:()=>context})}
}
async function seed(base=summaryFixture()){
 base.shop=materialRegistryShop(base.shop,base.materials);await seedSetCatalog(env,base);return base
}
const command=(kind,payload,opId=kind)=>({kind,payload,opId})
it('commits count, waste and lot switching with persisted receipts and semantic retry validation',async()=>{
 const base=await seed(),{api}=setup(),m=base.materials[0],lotId=m.lotIds[0]
 const count=command('stock_count',{requests:[{materialId:m.id,counts:[{id:lotId,to:123}]}]})
 expect((await api.commit(count)).kind).toBe('stock_count')
 expect((await api.commit(count)).rows[0].counts[0].to).toBe(123)
 await expect(api.commit({...count,payload:{requests:[{materialId:m.id,counts:[{id:lotId,to:124}]}]}})).rejects.toThrow('COMMAND_ID_COLLISION')
 await api.commit(command('stock_count',{requests:[{materialId:m.id,mode:'waste',requestedQ:23,counts:[{id:lotId,to:100}],reason:'damaged',note:'proof'}]},'WASTE'))
 await api.commit(command('switch_lot',{materialId:m.id,lotId}))
 expect((await api.snapshot()).materials.find(v=>v.id===m.id).stock).toBe(100)
})
it('requires reconfirmation when another equal account commits after an inventory preview',async()=>{
 const base=await seed(),a=setup().api,b=setup('other').api,m=base.materials[0]
 const request={materialId:m.id,counts:[{id:m.lotIds[0],to:300}]}
 const results=await Promise.allSettled([a.commit(command('stock_count',{requests:[request],expectedRevision:base.shop.revision},'A')),b.commit(command('stock_count',{requests:[request],expectedRevision:base.shop.revision},'B'))])
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
 expect(results.find(r=>r.status==='rejected').reason.message).toBe('STALE_INVENTORY_DRAFT')
 expect((await a.snapshot()).shop.revision).toBe(base.shop.revision+1)
})
it('creates, edits metadata/measurement/details/recipe and archives an unreferenced material',async()=>{
 await seed();const {api}=setup()
 await api.commit(command('material_create',{input:{id:'NEW',name:'New',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}}))
 for(const [kind,payload] of [
  ['material_metadata',{metadata:{name:'Renamed',emoji:'x',minAlertQ:10}}],
  ['material_measure',{measure:{unit:'kg',packSize:10,unitCost:2,packCostCents:200}}],
  ['material_details',{details:{category:'Prep',packUnit:'bag',shelfLifeDays:3,isSubIngredient:true}}],
  ['production_recipe',{recipe:{inputIds:['S0'],quantities:[100],yieldQ:200}}],
  ['production_recipe',{recipe:{}}],
  ['material_archive',{deleted:true}],['material_archive',{deleted:false}],
 ].map((row,i)=>[...row,i]))await api.commit(command(kind,{materialId:'NEW',...payload},`${kind}-${JSON.stringify(payload).length}`))
 const m=(await api.snapshot()).materials.find(v=>v.id==='NEW')
 expect(m.name).toBe('Renamed');expect(m.unit).toBe('kg');expect(m.category).toBe('Prep');expect(m.deleted).toBe(false);expect(m.productionRecipe).toBeUndefined()
})
it('reclassifies a protected material and preserves the declared recipes',async()=>{
 const {base}=typeFixture();await seed(base);const {api}=setup()
 await api.commit(command('material_type',{materialId:'S11',inventoryType:'ingredient'}))
 const after=await api.snapshot();expect(after.materials.find(m=>m.id==='S11').recipeIndex).toEqual(base.materials.find(m=>m.id==='S11').recipeIndex);expect(after.shop.catalog.menus.SIMPLE.rawRecipe).toEqual(base.shop.catalog.menus.SIMPLE.rawRecipe);expect(after.shop.catalog.menus.SIMPLE.recipe.S11).toBe(100)
})
it.each(['omitMaterial','omitOperation','omitShop','forgedCost'])('rejects %s inventory writes atomically',async tamper=>{
 const base=await seed(),{db,api}=setup(),{planInventoryCommand}=await import('../../src/cloud/core/inventoryPlan.js'),m=base.materials[0]
 const f=planInventoryCommand(base.shop,base.materials,command('stock_count',{requests:[{materialId:m.id,counts:[{id:m.lotIds[0],to:123}]}]},'FORGED'),'cashier')
 if(tamper==='forgedCost')f.nextMaterials[0].unitCost++
 const batch=writeBatch(db)
 if(tamper!=='omitShop')batch.set(doc(db,ROOT),f.nextShop)
 if(tamper!=='omitOperation')batch.set(doc(db,`${GENERATION}/operations/FORGED`),f.operation)
 if(tamper!=='omitMaterial')for(const n of f.nextMaterials)batch.set(doc(db,`${GENERATION}/materials/${n.id}`),n)
 await assertFails(batch.commit());expect((await api.snapshot()).shop.revision).toBe(base.shop.revision)
})
it('continues to deny unrelated catalog and display mutations',async()=>{
 const base=await seed(),{db}=setup()
 await assertFails(setDoc(doc(db,ROOT),{...base.shop,revision:base.shop.revision+1,lastOpKind:'catalog'}))
 await assertFails(setDoc(doc(db,`${GENERATION}/display/catalog`),{forged:true}))
})
it('resolves only a proven stale inventory command and fences late replay after journal rejection',async()=>{
 const base=await seed(),{api}=setup(),m=base.materials[0],payload={expectedRevision:base.shop.revision,requests:[{materialId:m.id,counts:[{id:m.lotIds[0],to:500}]}]}
 const stale=command('stock_count',payload,'STALE')
 expect(api.rejectStaleInventory).toBeTypeOf('function')
 await expect(api.rejectStaleInventory(stale)).rejects.toThrow('STALE_NOT_PROVEN')
 await setup('other').api.commit(command('switch_lot',{materialId:m.id,lotId:m.lotIds[0]},'ADVANCE'))
 const {IDBFactory}=await import('fake-indexeddb'),{createCommandJournal}=await import('../../src/cloud/journal.js'),{createCoreCommands}=await import('../../src/cloud/core/commands.js')
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'device',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:'test'}),commands=createCoreCommands({journal,transport:api,getContext:()=>context})
 expect(await commands.execute(stale)).toMatchObject({ok:false,code:'PENDING_RESULT'})
 expect(await commands.rejectStaleInventory()).toEqual({ok:true,value:{opId:'STALE',kind:'stock_count',rejected:true,code:'STALE_INVENTORY_DRAFT'}})
 expect(await commands.pending()).toHaveLength(0)
 expect(await commands.execute(stale)).toMatchObject({ok:true,value:{rejected:true}})
 await expect(api.commit(stale)).rejects.toThrow('STALE_INVENTORY_DRAFT')
 expect((await api.snapshot()).materials.find(v=>v.id===m.id).stock).toBe(m.stock)
 await journal.close()
})
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
it('reclassifies the last protected material with all mandatory projection witnesses',async()=>{
 const p=compileCoreImport(coreSource(),{shopId:'proof-shop',generation:'g_trial_type',sourceSha256:'a'.repeat(64)})
 p.shop.generation='g1';const materials=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 await seedSetCatalog(env,{shop:p.shop,materials});const {api}=setup()
 const targetId=materials.find(m=>m.costRank===15).id
 const f=planInventoryCommand(p.shop,materials,command('material_type',{materialId:targetId,inventoryType:'packaging'},'OMIT-LAST'),'cashier'),db=env.authenticatedContext('cashier').firestore(),batch=writeBatch(db)
 batch.set(doc(db,ROOT),f.nextShop);batch.set(doc(db,`${GENERATION}/operations/OMIT-LAST`),f.operation)
 for(const m of f.nextMaterials)batch.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
 for(const proof of f.checkProofs.filter(p=>p.index!==15))batch.set(doc(db,`${GENERATION}/operations/OMIT-LAST/referenceProofs/type${proof.index}`),proof.data)
 await assertFails(batch.commit())
 const result=await api.commit(command('material_type',{materialId:targetId,inventoryType:'packaging'}))
 expect(result.materialIds).toEqual([targetId])
 const after=await api.snapshot();expect(after.materials.find(m=>m.id===targetId).inventoryType).toBe('packaging')
 expect(Object.fromEntries(after.materials.map(m=>[m.id,m.recipeIndex]))).toEqual(Object.fromEntries(materials.map(m=>[m.id,m.recipeIndex])))
})
it('counts eighteen materials with four live lots per material through the runtime',async()=>{
 const base=summaryFixture({prepareMaterials:materials=>{
  for(let i=15;i<18;i++)materials.push({...structuredClone(materials[0]),id:`S${i}`,costRank:i})
  for(const m of materials){m.lots=[250000,250000,250000,250000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
 }})
 await seed(base);const {api}=setup(),requests=base.materials.map(m=>({materialId:m.id,counts:m.lotIds.map(id=>({id,to:200000}))}))
 expect((await api.commit(command('stock_count',{requests}))).rows).toHaveLength(18)
 expect((await api.snapshot()).materials.every(m=>m.stock===800000)).toBe(true)
})
it('allows the sixty-fourth registry material and refuses a sixty-fifth',async()=>{
 const base=summaryFixture();base.shop=materialRegistryShop(base.shop,base.materials)
 for(let i=15;i<63;i++){
  const f=planInventoryCommand(base.shop,base.materials,command('material_create',{input:{id:`EXTRA${i}`,name:'Extra',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}},`SEED${i}`))
  base.shop=f.nextShop;base.materials.push(f.nextMaterials[0])
 }
 await seed(base);const {api}=setup(),input={id:'FINAL',name:'Last',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}
 await api.commit(command('material_create',{input},'FINAL'))
 expect((await api.snapshot()).materials).toHaveLength(64)
 await expect(api.commit(command('material_create',{input:{...input,id:'TOO_MANY'}},'TOO_MANY'))).rejects.toThrow('Invalid material creation')
})
const editCases=[
 ['switch_lot',{materialId:'S0',lotId:'L0'}],
 ['material_archive',{materialId:'ARCHIVE',deleted:true}],
 ['material_create',{input:{id:'NEW',name:'New',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}}],
 ['material_metadata',{materialId:'S0',metadata:{name:'Renamed',emoji:'',minAlertQ:0}}],
 ['material_measure',{materialId:'S0',measure:{unit:'kg',packSize:1,unitCost:1,packCostCents:100}}],
 ['material_details',{materialId:'S0',details:{category:'Prep'}}],
 ['material_type',{materialId:'S11',inventoryType:'ingredient'}],
 ['production_recipe',{materialId:'S12',recipe:{inputIds:['S0'],quantities:[1],yieldQ:1}}],
]
it.each(editCases.flatMap(([kind,payload])=>['omitMaterial','omitOperation','omitShop','forgedStock'].map(tamper=>({kind,payload,tamper}))))('denies $tamper for $kind',async({kind,payload,tamper})=>{
 const {base}=typeFixture();
 if(kind==='material_archive'){const added=planInventoryCommand(base.shop,base.materials,command('material_create',{input:{id:'ARCHIVE',name:'Archive',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}},'TRUSTED'));base.shop=added.nextShop;base.materials.push(added.nextMaterials[0])}
 await seed(base);const {db,api}=setup(),f=planInventoryCommand(base.shop,base.materials,command(kind,payload,'FORGED-EDIT'),'cashier')
 if(kind==='material_archive')for(let index=0;index<8;index++)await setDoc(doc(db,`${GENERATION}/materialReferences/FORGED-EDIT/parts/${index}`),{opId:'FORGED-EDIT',index,uid:'cashier',sourceRevision:base.shop.revision,kind,materialId:payload.materialId})
 if(tamper==='forgedStock')f.nextMaterials[0].stock++
 const batch=writeBatch(db)
 if(tamper!=='omitShop')batch.set(doc(db,ROOT),f.nextShop)
 if(tamper!=='omitOperation')batch.set(doc(db,`${GENERATION}/operations/FORGED-EDIT`),f.operation)
 for(const proof of f.checkProofs||[])batch.set(doc(db,`${GENERATION}/operations/FORGED-EDIT/referenceProofs/${proof.namespace}${proof.index}`),proof.data)
 if(f.referenceProof)batch.set(doc(db,`${GENERATION}/operations/FORGED-EDIT/referenceProofs/0`),f.referenceProof)
 for(const [i,m] of f.nextMaterials.entries())if(tamper!=='omitMaterial'||i!==f.nextMaterials.length-1)batch.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
 await assertFails(batch.commit());expect((await api.snapshot()).shop.revision).toBe(base.shop.revision)
})

it('refuses a changed create payload on a same-ID receipt retry',async()=>{
 await seed();const {api}=setup(),input={id:'NEW',name:'New',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}
 await api.commit(command('material_create',{input},'SAME-CREATE'))
 await expect(api.commit(command('material_create',{input:{id:'NEW'}},'SAME-CREATE'))).rejects.toThrow('COMMAND_ID_COLLISION')
})
