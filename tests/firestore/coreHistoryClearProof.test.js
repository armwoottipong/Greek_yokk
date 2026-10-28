import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDoc,setDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {ROOT,GENERATION} from './proofFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {projectInventoryHistory} from '../../src/cloud/core/inventoryHistory.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
function setup(uid='cashier'){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:uid,online:true,ready:true},db=env.authenticatedContext(uid).firestore()
 return {db,api:createCoreTransport({db,getContext:()=>context})}
}
async function seed(){const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials);await seedSetCatalog(env,f);return f}
const command=(kind,payload={},opId=kind)=>({kind,payload,opId})
it('clears the shared view without deleting receipts, and keeps later old-bill cancellation visible',async()=>{
 await seed();const {api,db}=setup(),other=setup('other').api
 const sale=await api.commit(command('sale',{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]},'OLD-SALE'))
 const before=await api.snapshot(),clear=command('history_clear',{expectedRevision:before.shop.revision},'CLEAR')
 const receipt=await api.commit(clear),after=await other.snapshot()
 expect(after.materials).toEqual(before.materials);expect(after.shop.inventoryHistoryCutoff).toBe(after.shop.revision)
 expect(await api.commit(clear)).toEqual(receipt)
 expect((await getDoc(doc(db,`${GENERATION}/orders/OLD-SALE`))).exists()).toBe(true)
 expect(projectInventoryHistory({orders:[sale],materials:after.materials,clearedThroughRevision:after.shop.inventoryHistoryCutoff})).toHaveLength(0)
 const cancelled=await other.commit(command('cancel',{orderId:sale.opId},'LATER-CANCEL'))
 const logs=projectInventoryHistory({orders:[sale],operations:[cancelled],materials:after.materials,clearedThroughRevision:after.shop.inventoryHistoryCutoff})
 expect(logs.length).toBeGreaterThan(0);expect(logs.every(l=>l.action==='order_cancel')).toBe(true)
 await assertFails(setDoc(doc(db,`${GENERATION}/operations/CLEAR`),{...receipt,uid:'other'}))
})
it.each(['omitRoot','omitReceipt','futureCutoff','decreaseCutoff','stockMutation'])('denies %s',async tamper=>{
 const f=await seed(),{db,api}=setup(),plan=planInventoryCommand(f.shop,f.materials,command('history_clear',{},'BAD'),'cashier'),batch=writeBatch(db)
 if(tamper==='futureCutoff')plan.nextShop.inventoryHistoryCutoff++
 if(tamper==='decreaseCutoff')plan.nextShop.inventoryHistoryCutoff=0
 if(tamper!=='omitRoot')batch.set(doc(db,ROOT),plan.nextShop)
 if(tamper!=='omitReceipt')batch.set(doc(db,`${GENERATION}/operations/BAD`),plan.operation)
 if(tamper==='stockMutation')batch.set(doc(db,`${GENERATION}/materials/${f.materials[0].id}`),{...f.materials[0],stock:0})
 await assertFails(batch.commit());expect((await api.snapshot()).shop.revision).toBe(f.shop.revision)
})
it('refuses a stale clear and denies an unauthenticated clear',async()=>{
 const f=await seed(),{api}=setup()
 await api.commit(command('history_clear',{},'FIRST'))
 await expect(api.commit(command('history_clear',{expectedRevision:f.shop.revision},'STALE'))).rejects.toThrow('STALE_INVENTORY_DRAFT')
 const db=env.unauthenticatedContext().firestore()
 await assertFails(setDoc(doc(db,`${GENERATION}/operations/UNAUTH`),planInventoryCommand(f.shop,f.materials,command('history_clear',{},'UNAUTH')).operation))
})
