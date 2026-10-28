import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,writeBatch,setLogLevel,setDoc} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env,f,api,context
setLogLevel('silent')
beforeAll(async()=>env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})}))
beforeEach(async()=>{
 await env.clearFirestore();f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.set(doc(db,'shops/proof-shop'),f.shop);for(const m of f.materials)b.set(doc(db,`shops/proof-shop/generations/${f.shop.generation}/materials/${m.id}`),m);await b.commit()})
 context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:f.shop.generation,uid:'cashier',deviceId:'device',online:true,ready:true};api=createCoreTransport({db:env.authenticatedContext('cashier').firestore(),getContext:()=>context})
})
afterAll(async()=>env.cleanup())
it.each(['ingredient','negative','reason','note','fields','snapshotCost','snapshotBaseline'])('denies forged package stock certification: %s',async tamper=>{
 const id=f.materials.find(m=>m.inventoryType===(tamper==='ingredient'?'ingredient':'packaging')).id,m=f.materials.find(m=>m.id===id),entry={quantity:100,reason:'separate_bag',note:''}
 if(tamper==='negative')entry.quantity=-1
 if(tamper==='reason')entry.reason='invalid'
 if(tamper==='note'){entry.reason='other';entry.note=''}
 if(tamper==='fields')entry.extra=1
 const packageSnapshots=tamper.startsWith('snapshot')?{[id]:{name:m.name||m.id,unit:m.unit||'',unitCost:m.unitCost,baselineQuantity:0}}:{}
 if(tamper==='snapshotCost')packageSnapshots[id].unitCost++
 if(tamper==='snapshotBaseline')packageSnapshots[id].baselineQuantity=999
 const base=`shops/proof-shop/generations/${f.shop.generation}`
 await env.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),`${base}/preparedSales/FORGED/lineProofs/0`),{uid:'cashier',catalogRevision:f.shop.catalogRevision,billOperands:{packages:{[id]:entry},packageSnapshots}}))
 const db=env.authenticatedContext('cashier').firestore()
 await assertFails(setDoc(doc(db,`${base}/materials/${id}`),{...m,billPreparationId:'FORGED',billPreparations:{FORGED:{uid:'cashier',catalogRevision:f.shop.catalogRevision,needed:entry.quantity}}}))
})
it.each([0,100,300])('atomically sells adjusted packaging %i and returns to original lots exactly once',async quantity=>{
 const packageId=f.materials.find(m=>m.inventoryType==='packaging').id,menu=Object.values(f.shop.catalog.menus).find(m=>m.min===0),command={kind:'sale',opId:'PACK',payload:{platformId:'P',lines:[{menuId:menu.id,qty:1,optionIds:[]}],packages:{[packageId]:{quantity,reason:'separate_bag',note:''}}}}
 const receipt=await api.commit(command);expect(receipt.inventory.find(r=>r.materialId===packageId).needed).toBe(quantity);expect((await api.commit(command)).opId).toBe('PACK')
 const stock=(await api.snapshot()).materials.find(m=>m.id===packageId);expect(stock.stock).toBe(f.materials.find(m=>m.id===packageId).stock-quantity)
 await expect(api.commit({...command,payload:{...command.payload,packages:{[packageId]:{quantity:quantity+1,reason:'separate_bag',note:''}}}})).rejects.toThrow('COMMAND_ID_COLLISION')
 await api.commit({kind:'cancel',opId:'RETURN',payload:{orderId:'PACK'}})
 const final=(await api.snapshot()).materials.find(m=>m.id===packageId);expect(final.stock).toBe(f.materials.find(m=>m.id===packageId).stock);expect(final.lotQty).toEqual(f.materials.find(m=>m.id===packageId).lotQty)
 await expect(api.commit({kind:'cancel',opId:'DOUBLE',payload:{orderId:'PACK'}})).rejects.toThrow('Order already cancelled')
})
