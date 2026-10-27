import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDoc,setDoc,deleteDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {ROOT,GENERATION} from './proofFixture.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
const input=id=>({id,name:id,emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0})
const command=(kind,payload,opId=kind)=>({kind,payload,opId})
function setup(){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'device',online:true,ready:true}
 const db=env.authenticatedContext('cashier').firestore()
 return {db,api:createCoreTransport({db,getContext:()=>context})}
}
function fixture(){
 const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
 for(const id of ['REMOVE','KEEP']){const p=planInventoryCommand(f.shop,f.materials,command('material_create',{input:input(id)},`CREATE-${id}`));f.shop=p.nextShop;f.materials.push(p.nextMaterials[0])}
 f.materials.find(m=>m.id==='REMOVE').deleted=true
 return f
}
async function referenceParts(db,shop,kind,opId='FORGED'){
 for(let index=0;index<8;index++)await setDoc(doc(db,`${GENERATION}/materialReferences/${opId}/parts/${index}`),{opId,index,uid:'cashier',sourceRevision:shop.revision,kind,materialId:'REMOVE'})
}
it('atomically deletes with an immutable receipt, retries, recreates without rank reuse and still cancels earlier sales',async()=>{
 const f=fixture();await seedSetCatalog(env,f);const {api,db}=setup()
 const sale=await api.commit(command('sale',{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]},'OLD-SALE'))
 const current=await api.snapshot(),request=command('material_delete',{materialId:'REMOVE',expectedRevision:current.shop.revision},'DELETE')
 const receipt=await api.commit(request)
 expect(receipt.materialSnapshot.name).toBe('REMOVE');expect((await getDoc(doc(db,`${GENERATION}/materials/REMOVE`))).exists()).toBe(false)
 expect(await api.commit(request)).toEqual(receipt)
 await expect(api.commit({...request,payload:{...request.payload,materialId:'KEEP'}})).rejects.toThrow('COMMAND_ID_COLLISION')
 await assertFails(setDoc(doc(db,`${GENERATION}/operations/DELETE`),{...receipt,materialId:'KEEP'}))
 await api.commit(command('material_create',{input:input('REMOVE')},'RECREATE'))
 expect((await api.snapshot()).materials.find(m=>m.id==='REMOVE').costRank).toBe(17)
 expect((await api.snapshot()).materials.find(m=>m.id==='KEEP').costRank).toBe(16)
 expect(await api.commit(request)).toEqual(receipt)
 expect((await api.commit(command('cancel',{orderId:sale.opId},'CANCEL-OLD'))).kind).toBe('cancel')
})
it.each(['omitRoot','omitReceipt','omitDelete','snapshot','rank','registry'])('rejects %s deletion atomically',async tamper=>{
 const f=fixture();await seedSetCatalog(env,f);const {db,api}=setup()
 const p=planInventoryCommand(f.shop,f.materials,command('material_delete',{materialId:'REMOVE'},'FORGED'),'cashier')
 if(tamper==='snapshot')p.operation.materialSnapshot.name='forged'
 if(tamper==='rank')p.nextShop.nextMaterialCostRank=16
 if(tamper==='registry')p.nextShop.materialIds=p.nextShop.materialIds.filter(id=>id!=='KEEP')
 await referenceParts(db,f.shop,'material_delete')
 const batch=writeBatch(db)
 batch.set(doc(db,`${GENERATION}/operations/FORGED/referenceProofs/0`),p.referenceProof)
 if(tamper!=='omitRoot')batch.set(doc(db,ROOT),p.nextShop)
 if(tamper!=='omitReceipt')batch.set(doc(db,`${GENERATION}/operations/FORGED`),p.operation)
 if(tamper!=='omitDelete')batch.delete(doc(db,`${GENERATION}/materials/REMOVE`))
 await assertFails(batch.commit());expect((await api.snapshot()).materials).toHaveLength(17)
})
it.each(['live','stock','lot','menu','addon','sold','input','output','protected'])('denies direct forged deletion of %s materials',async condition=>{
 const f=fixture(),m=f.materials.find(m=>m.id==='REMOVE')
 // Build the attempted transaction first, then seed an ineligible before state.
 const p=planInventoryCommand(f.shop,f.materials,command('material_delete',{materialId:m.id},'FORGED'),'cashier')
 if(condition==='live')m.deleted=false
 if(condition==='stock')m.stock=1
 if(condition==='lot')m.lotQty._=1
 if(condition==='menu')f.shop.catalog.menus.SIMPLE.rawRecipe={...f.shop.catalog.menus.SIMPLE.recipe,REMOVE:1}
 if(condition==='addon')f.shop.catalog.addons[f.shop.catalog.addonIds[0]].recipe.REMOVE=1
 if(condition==='sold')f.shop.returnMaterials={REMOVE:true}
 if(condition==='input')f.shop.productionUsers[m.id]=['KEEP']
 if(condition==='output')m.productionRecipe={inputIds:['S0'],quantities:[1],yieldQ:1}
 if(condition==='protected'){f.shop.catalog.summaryMaterials.push(m.id);p.nextShop.catalog.summaryMaterials.push(m.id)}
 p.operation.materialSnapshot=structuredClone(m)
 await seedSetCatalog(env,f);const {db}=setup()
 if(['menu','addon'].includes(condition)){await expect(referenceParts(db,f.shop,'material_delete')).rejects.toMatchObject({code:'permission-denied'});await assertFails(deleteDoc(doc(db,`${GENERATION}/materials/REMOVE`)));return}
 await referenceParts(db,f.shop,'material_delete')
 const batch=writeBatch(db)
 batch.set(doc(db,`${GENERATION}/operations/FORGED/referenceProofs/0`),p.referenceProof)
 batch.set(doc(db,ROOT),p.nextShop);batch.set(doc(db,`${GENERATION}/operations/FORGED`),p.operation);batch.delete(doc(db,`${GENERATION}/materials/REMOVE`))
 await assertFails(batch.commit());await assertFails(deleteDoc(doc(db,`${GENERATION}/materials/REMOVE`)))
})
it('resolves a stale deletion through the journal and fences late replay',async()=>{
 const f=fixture();await seedSetCatalog(env,f);const {api}=setup()
 const request=command('material_delete',{materialId:'REMOVE',expectedRevision:f.shop.revision},'STALE-DELETE')
 await expect(api.rejectStaleInventory(request)).rejects.toThrow('STALE_NOT_PROVEN')
 await api.commit(command('material_metadata',{materialId:'KEEP',metadata:{name:'Renamed',emoji:'',minAlertQ:0}},'ADVANCE'))
 const {IDBFactory}=await import('fake-indexeddb'),{createCommandJournal}=await import('../../src/cloud/journal.js'),{createCoreCommands}=await import('../../src/cloud/core/commands.js')
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'device',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:'delete-test'}),commands=createCoreCommands({journal,transport:api,getContext:()=>context})
 expect(await commands.execute(request)).toMatchObject({ok:false,code:'PENDING_RESULT'})
 expect(await commands.rejectStaleInventory()).toMatchObject({ok:true,value:{opId:request.opId,kind:'material_delete',rejected:true}})
 expect(await commands.pending()).toEqual([])
 await expect(api.commit(request)).rejects.toThrow('STALE_INVENTORY_DRAFT')
 expect((await api.snapshot()).materials.some(m=>m.id==='REMOVE')).toBe(true)
 await journal.close()
})
