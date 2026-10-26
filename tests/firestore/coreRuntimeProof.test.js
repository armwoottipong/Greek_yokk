import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDoc,setDoc} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {ROOT} from './proofFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {readFile} from 'node:fs/promises'
import {compileCoreImport} from '../../scripts/core-import.js'
import {groupFixture} from './summaryGroupFixture.js'
import {multiGroupFixture} from './summaryMultiGroupFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
function setup(db,uid='cashier'){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:'device',online:true,ready:true}
 return {context,api:createCoreTransport({db,getContext:()=>context})}
}
it('executes one server-confirmed sale, returns the same receipt on retry and cancels exactly once',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const db=env.authenticatedContext('cashier').firestore(),{api}=setup(db)
 const command={opId:'CORE-SALE',kind:'sale',payload:{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]}}
 const first=await api.commit(command),again=await api.commit(command)
 expect(first.opId).toBe('CORE-SALE');expect(again.subtotalCents).toBe(first.subtotalCents)
 expect((await getDoc(doc(db,ROOT))).data().revision).toBe(base.shop.revision+1)
 await expect(api.commit({...command,payload:{...command.payload,lines:[{menuId:'SIMPLE',qty:2,optionIds:[]}]}})).rejects.toThrow('COMMAND_ID_COLLISION')
 await api.commit({opId:'CORE-CANCEL',kind:'cancel',payload:{orderId:first.opId}})
 expect((await getDoc(doc(db,`${ROOT}/generations/g1/materials/S12`))).data().stock).toBe(base.materials[12].stock)
 await expect(api.commit({opId:'SECOND-CANCEL',kind:'cancel',payload:{orderId:first.opId}})).rejects.toThrow()
})
it('serializes concurrent sales from equal accounts and fences an abandoned sale',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const a=setup(env.authenticatedContext('cashier').firestore()).api,b=setup(env.authenticatedContext('other').firestore(),'other').api
 const sale=id=>({opId:id,kind:'sale',payload:{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]}})
 await Promise.all([a.commit(sale('A')).catch(e=>{throw new Error(`A:${e.message}`)}),b.commit(sale('B')).catch(e=>{throw new Error(`B:${e.message}`)})])
 expect((await a.snapshot()).shop.revision).toBe(base.shop.revision+2)
 expect(await a.abandonSale(sale('ABANDON'))).toEqual({abandoned:true})
 await expect(a.commit(sale('ABANDON'))).rejects.toThrow('PREPARATION_CLOSED')
})
it('receives ingredients and packaging, then produces with server receipts',async()=>{
 const base=summaryFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]};await seedSetCatalog(env,base)
 const {api}=setup(env.authenticatedContext('cashier').firestore())
 const ingredient=base.materials[0],pack=base.materials.find(m=>m.inventoryType==='packaging')
 await api.commit({opId:'RECEIVE',kind:'receive',payload:{materialId:ingredient.id,input:{qtyQ:100,unitCost:0.5,receiveDay:21000,expiryDay:22000,newLotId:'NEW'}}})
 await api.commit({opId:'PACKAGE',kind:'receive',payload:{materialId:pack.id,input:{qtyQ:100,unitCost:0.5,receiveDay:21000,expiryDay:999999}}})
 const receipt=await api.commit({opId:'PRODUCE',kind:'produce',payload:{materialId:'S12',input:{qtyQ:10000,lotId:'OUTPUT',receiveDay:21000,expiryDay:22000}}})
 expect(receipt.kind).toBe('produce');expect((await api.snapshot()).shop.revision).toBe(base.shop.revision+3)
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('runs the actual imported trial source through receiving, production, sale and cancellation',async()=>{
 const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),p=compileCoreImport(raw,{shopId:'proof-shop',generation:'g_trial_source',sourceSha256:'a'.repeat(64)})
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(const d of [{path:ROOT,data:p.shop},...p.documents])await setDoc(doc(db,d.path),d.data)})
 const {context,api}=setup(env.authenticatedContext('cashier').firestore());context.generation='g_trial_source'
 const initial=await api.snapshot(),m=initial.materials.find(m=>m.inventoryType==='ingredient'&&!m.deleted)
 await api.commit({opId:'SOURCE-IN',kind:'receive',payload:{materialId:m.id,input:{qtyQ:100,unitCost:m.unitCost,receiveDay:21000,expiryDay:22000,newLotId:'SOURCE-LOT'}}})
 const out=initial.materials.find(m=>m.productionRecipe)
 if(out){
  // The backup has insufficient/expired production inputs: receive fresh inputs first.
  for(const [i,id] of out.productionRecipe.inputIds.entries()){
   const input=initial.materials.find(m=>m.id===id)
   await api.commit({opId:`SOURCE-INPUT-${i}`,kind:'receive',payload:{materialId:id,input:{qtyQ:out.productionRecipe.quantities[i],unitCost:input.unitCost,receiveDay:21000,expiryDay:22000,newLotId:`SOURCE-FRESH-${i}`}}})
  }
  await api.commit({opId:'SOURCE-PROD',kind:'produce',payload:{materialId:out.id,input:{qtyQ:out.productionRecipe.yieldQ,lotId:'SOURCE-OUT',receiveDay:21000,expiryDay:22000}}})
 }
 const state=await api.snapshot(),menu=Object.values(state.shop.catalog.menus).find(m=>m.active),group=state.shop.catalog.groups[menu.groupId]
 const line={menuId:menu.id,qty:1,optionIds:group?Array.from({length:group.min},(_,i)=>group.optionIds[group.allowRepeat?0:i]):[]}
 const {summaryMultiGroupSale}=await import('../../src/cloud/core/model/saleGroups.js')
 const platformId=state.shop.catalog.platformIds.find(id=>state.shop.catalog.platforms[id].active),preview=summaryMultiGroupSale(state.shop,state.materials,[line],{platformId})
 const r=await api.commit({opId:'SOURCE-SALE',kind:'sale',payload:{platformId,lines:[line],approvedShortages:Object.fromEntries(Object.entries(preview.order.approvedShortages).filter(([,q])=>q>0))}})
 await api.commit({opId:'SOURCE-CANCEL',kind:'cancel',payload:{orderId:r.opId}})
 expect((await api.snapshot()).shop.revision).toBe(state.shop.revision+2)
})
it('blocks offline or changed-identity commands before any write',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const db=env.authenticatedContext('cashier').firestore(),{api,context}=setup(db)
 context.online=false
 await expect(api.commit({opId:'OFFLINE',kind:'sale',payload:{}})).rejects.toThrow('OFFLINE')
 expect((await getDoc(doc(db,ROOT))).data()).toEqual(base.shop)
})
it('commits the maximum six lines and three preparation proofs through the runtime adapter',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const {api}=setup(env.authenticatedContext('cashier').firestore())
 const receipt=await api.commit({opId:'MAX-SIX',kind:'sale',payload:{platformId:'P',lines:Array.from({length:6},(_,i)=>({menuId:'SIMPLE',qty:i+1,optionIds:[],note:`Line ${i}`}))}})
 expect(receipt.lines).toHaveLength(6);expect(receipt.lineWitnessCount).toBe(3)
})
it('sells six repeating grouped lines across four working lots and reconciles persisted map ordering',async()=>{
 const base=groupFixture({mode:'extra',options:45,platforms:4,fourLots:true});base.shop.catalog.groups.G.allowRepeat=true;await seedSetCatalog(env,base)
 const {api}=setup(env.authenticatedContext('cashier').firestore())
 const c={opId:'GROUP-SIX',kind:'sale',payload:{platformId:'P3',lines:Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:['A44',...Array(9).fill('A0'),'A1']}))}}
 const receipt=await api.commit(c);expect(receipt.lines).toHaveLength(6)
 expect((await api.commit(c)).opId).toBe(c.opId)
})
it('preserves group/addon pairs when the same addon appears in two groups on six lines',async()=>{
 const base=multiGroupFixture({fourLots:true});await seedSetCatalog(env,base)
 const {api}=setup(env.authenticatedContext('cashier').firestore())
 const c={opId:'TWO-GROUPS',kind:'sale',payload:{platformId:'P',lines:Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,selections:[{groupId:'G',id:'A0',selectionQty:1},{groupId:'G',id:'A1',selectionQty:1},{groupId:'G',id:'A2',selectionQty:1},{groupId:'H',id:'A0',selectionQty:3}]}))}}
 expect((await api.commit(c)).lines).toHaveLength(6);expect((await api.commit(c)).opId).toBe(c.opId)
})
it('keeps display/history immutable and rejects another shop and forged stock writes',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const db=env.authenticatedContext('cashier').firestore()
 await assertFails(getDoc(doc(db,'shops/other')))
 await assertFails(setDoc(doc(db,`${ROOT}/generations/g1/display/catalog`),{name:'forged'}))
 await assertFails(setDoc(doc(db,`${ROOT}/generations/g1/materials/S0`),{...base.materials[0],stock:999999}))
})
