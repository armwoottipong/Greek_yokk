import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDoc,setDoc,writeBatch} from 'firebase/firestore'
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
import {coreSource} from '../fixtures/coreSource.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
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
 const results=await Promise.allSettled([a.commit(sale('A')),b.commit(sale('B'))]);expect(results.map(r=>r.status)).toEqual(['fulfilled','fulfilled'])
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
async function seedExpanded(raw=coreSource()){
 const p=compileCoreImport(raw,{shopId:'proof-shop',generation:'g_trial_test',sourceSha256:'a'.repeat(64)})
 p.shop.generation='g1';p.documents=p.documents.map(d=>({...d,path:d.path.replace('/g_trial_test/','/g1/')}))
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(const d of [{path:ROOT,data:p.shop},...p.documents.filter(d=>d.path.includes('/materials/'))])await setDoc(doc(db,d.path),d.data)})
 return p
}
it('sells four lines with sixteen protected materials and cancels every row including the sixteenth',async()=>{
 const p=await seedExpanded(),db=env.authenticatedContext('cashier').firestore(),{api}=setup(db)
 const ids=p.shop.catalog.menuIds,platformId=p.shop.catalog.platformIds[0]
 const sale={opId:'SIXTEEN',kind:'sale',payload:{platformId,lines:[ids[0],ids[4],ids[0],ids[4]].map(menuId=>({menuId,qty:1,optionIds:[]}))}}
 const r=await api.commit(sale).catch(e=>{throw new Error(`SALE16: ${e.message}`)});expect(r.materialIds).toHaveLength(16)
 await api.commit({opId:'CANCEL-SIXTEEN',kind:'cancel',payload:{orderId:r.opId}}).catch(e=>{throw new Error(`CANCEL16: ${e.message}`)})
 const after=await api.snapshot();expect(after.materials.map(m=>m.stock)).toEqual(Array(16).fill(100000))
 await expect(api.commit({...sale,opId:'TOO-MANY',payload:{...sale.payload,lines:[...sale.payload.lines,sale.payload.lines[0]]}})).rejects.toThrow('SALE_LINE_LIMIT')
})
it('uses four working lots per material for a four-line sixteen-material sale and return',async()=>{
 const raw=coreSource()
 for(const m of raw.materials)m.lots=[1,1,1,997].map((qty,i)=>({id:`${m.id}-LOT${i}`,qty,isInUse:i===0}))
 for(const m of raw.menus)for(const r of m.recipe)r.qty=2
 const p=await seedExpanded(raw),{api}=setup(env.authenticatedContext('cashier').firestore()),ids=p.shop.catalog.menuIds
 const r=await api.commit({opId:'SIXTEEN-LOTS',kind:'sale',payload:{platformId:p.shop.catalog.platformIds[0],lines:[ids[0],ids[4],ids[0],ids[4]].map(menuId=>({menuId,qty:1,optionIds:[]}))}})
 expect(r.inventory[0].lotTakes).toEqual([100,100,100,100])
 await api.commit({opId:'RETURN-LOTS',kind:'cancel',payload:{orderId:r.opId}})
 expect((await api.snapshot()).materials.every(m=>m.stock===100000)).toBe(true)
})
it('serializes two accounts selling from the expanded sixteen-material shop',async()=>{
 const p=await seedExpanded(),a=setup(env.authenticatedContext('cashier').firestore()).api,b=setup(env.authenticatedContext('other').firestore(),'other').api
 const sale=id=>({opId:id,kind:'sale',payload:{platformId:p.shop.catalog.platformIds[0],lines:[{menuId:p.shop.catalog.menuIds[4],qty:1,optionIds:[]}]}})
 const results=await Promise.allSettled([a.commit(sale('EXP-A')),b.commit(sale('EXP-B'))]);expect(results.map(r=>r.status)).toEqual(['fulfilled','fulfilled'])
 expect((await a.snapshot()).shop.revision).toBe(p.shop.revision+2)
})
it('rejects cancellation without the sixteenth material restoration',async()=>{
 const p=await seedExpanded(),db=env.authenticatedContext('cashier').firestore(),{api}=setup(db)
 const r=await api.commit({opId:'CANCEL-FORGE-SOURCE',kind:'sale',payload:{platformId:p.shop.catalog.platformIds[0],lines:[{menuId:p.shop.catalog.menuIds[4],qty:1,optionIds:[]}]}})
 const current=await api.snapshot(),{summaryCancel}=await import('../../src/cloud/core/model/cancel.js'),f=summaryCancel(current.shop,current.materials,r,{opId:'CANCEL-FORGED',uid:'cashier'})
 const batch=writeBatch(db);batch.set(doc(db,ROOT),f.nextShop);batch.set(doc(db,`${ROOT}/generations/g1/orders/${r.opId}`),f.nextOrder);batch.set(doc(db,`${ROOT}/generations/g1/operations/CANCEL-FORGED`),f.operation)
 for(const m of f.nextMaterials.slice(0,15))batch.set(doc(db,`${ROOT}/generations/g1/materials/${m.id}`),m)
 await assertFails(batch.commit());expect((await api.snapshot()).shop.revision).toBe(current.shop.revision)
})
it.skipIf(!process.env.GY_LATEST_BACKUP)('rehearses every production recipe and the new menu from the latest private snapshot',async()=>{
 const raw=JSON.parse(await readFile(process.env.GY_LATEST_BACKUP,'utf8')),p=await seedExpanded(raw),{api}=setup(env.authenticatedContext('cashier').firestore())
 let n=0
 for(const output of (await api.snapshot()).materials.filter(m=>m.productionRecipe)){
  const r=output.productionRecipe
  for(const [i,id] of r.inputIds.entries()){
   const m=(await api.snapshot()).materials.find(m=>m.id===id)
   await api.commit({opId:`LATEST-IN-${n}-${i}`,kind:'receive',payload:{materialId:id,input:{qtyQ:r.quantities[i],unitCost:m.unitCost,receiveDay:21000,expiryDay:22000,newLotId:`LATEST-${n}-${i}`}}}).catch(e=>{throw new Error(`RECEIVE${n}-${i}: ${e.message}`)})
  }
  await api.commit({opId:`LATEST-PROD-${n}`,kind:'produce',payload:{materialId:output.id,input:{qtyQ:r.yieldQ,receiveDay:21000,expiryDay:22000,lotId:`LATEST-OUT-${n}`}}}).catch(e=>{throw new Error(`PRODUCE${n}: ${e.message}`)});n++
 }
 const state=await api.snapshot(),menuId=p.shop.catalog.menuIds.at(-1),platformId=p.shop.catalog.platformIds[0],line={menuId,qty:1,optionIds:[]}
 const {summaryMultiGroupSale}=await import('../../src/cloud/core/model/saleGroups.js'),preview=summaryMultiGroupSale(state.shop,state.materials,[line],{platformId})
 const r=await api.commit({opId:'LATEST-NEW-MENU',kind:'sale',payload:{platformId,lines:[line],approvedShortages:Object.fromEntries(Object.entries(preview.order.approvedShortages).filter(([,q])=>q>0))}}).catch(e=>{throw new Error(`LATEST-SALE: ${e.message}`)})
 await api.commit({opId:'LATEST-RETURN',kind:'cancel',payload:{orderId:r.opId}})
 expect(r.materialIds).toHaveLength(16);expect(p.shop.catalog.menuIds).toHaveLength(5);expect(n).toBe(2)
})
it.each(['missing','cost'])('rejects a sixteen-material sale with %s sixteenth guard',async tamper=>{
 const p=await seedExpanded(),db=env.authenticatedContext('cashier').firestore()
 const {summaryMultiGroupSale}=await import('../../src/cloud/core/model/saleGroups.js')
 const mats=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 const f=summaryMultiGroupSale(p.shop,mats,[{menuId:p.shop.catalog.menuIds[4],qty:1,optionIds:[]}],{platformId:p.shop.catalog.platformIds[0],opId:'FORGED',uid:'cashier'})
 // Seed valid price witnesses as trusted test setup, then forge only final writes.
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();await setDoc(doc(db,`${ROOT}/generations/g1/preparedSales/FORGED/lineProofs/0`),{opId:'FORGED',index:0,uid:'cashier',catalogRevision:1,platformId:f.order.platformId,addonKeys:f.order.addonKeys,lines:f.order.lines})})
 if(tamper==='cost'){f.order.inventory[15].ingredientCostBaht++;f.order.ingredientCostCents+=100;f.order.grossProfitCents-=100}
 const batch=writeBatch(db);batch.set(doc(db,ROOT),f.nextShop);batch.set(doc(db,`${ROOT}/generations/g1/orders/FORGED`),f.order)
 for(const [i,m] of f.nextMaterials.entries())if(tamper!=='missing'||i!==15)batch.set(doc(db,`${ROOT}/generations/g1/materials/${m.id}`),m)
 await assertFails(batch.commit())
})
it.each([0,1])('requires expanded sale price-proof pair %i',async omit=>{
 const p=await seedExpanded(),db=env.authenticatedContext('cashier').firestore(),mats=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 const {summaryMultiGroupSale}=await import('../../src/cloud/core/model/saleGroups.js'),f=summaryMultiGroupSale(p.shop,mats,Array.from({length:4},()=>({menuId:p.shop.catalog.menuIds[4],qty:1,optionIds:[]})),{platformId:p.shop.catalog.platformIds[0],opId:'PROOF-MISSING',uid:'cashier'})
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(let i=0;i<2;i++)if(i!==omit)await setDoc(doc(db,`${ROOT}/generations/g1/preparedSales/PROOF-MISSING/lineProofs/${i}`),{opId:f.order.opId,index:i,uid:'cashier',catalogRevision:1,platformId:f.order.platformId,addonKeys:f.order.addonKeys,lines:f.order.lines.slice(i*2,i*2+2)})})
 const b=writeBatch(db);b.set(doc(db,ROOT),f.nextShop);b.set(doc(db,`${ROOT}/generations/g1/orders/${f.order.opId}`),f.order)
 for(const m of f.nextMaterials)b.set(doc(db,`${ROOT}/generations/g1/materials/${m.id}`),m)
 await assertFails(b.commit())
})
it('rejects a forged five-line expanded sale on the server even when an independent planner creates it',async()=>{
 const p=await seedExpanded(),db=env.authenticatedContext('cashier').firestore(),mats=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 const {summaryMultiGroupSale}=await import('./summaryMultiGroupSale.js'),f=summaryMultiGroupSale(p.shop,mats,Array.from({length:5},()=>({menuId:p.shop.catalog.menuIds[4],qty:1,optionIds:[]})),{platformId:p.shop.catalog.platformIds[0],opId:'FIVE-FORGED',uid:'cashier'})
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore();for(let i=0;i<3;i++)await setDoc(doc(db,`${ROOT}/generations/g1/preparedSales/FIVE-FORGED/lineProofs/${i}`),{opId:f.order.opId,index:i,uid:'cashier',catalogRevision:1,platformId:f.order.platformId,addonKeys:f.order.addonKeys,lines:f.order.lines.slice(i*2,i*2+2)})})
 const b=writeBatch(db);b.set(doc(db,ROOT),f.nextShop);b.set(doc(db,`${ROOT}/generations/g1/orders/${f.order.opId}`),f.order)
 for(const m of f.nextMaterials)b.set(doc(db,`${ROOT}/generations/g1/materials/${m.id}`),m)
 await assertFails(b.commit())
})
it('keeps display/history immutable and rejects another shop and forged stock writes',async()=>{
 const base=summaryFixture();await seedSetCatalog(env,base)
 const db=env.authenticatedContext('cashier').firestore()
 await assertFails(getDoc(doc(db,'shops/other')))
 await assertFails(setDoc(doc(db,`${ROOT}/generations/g1/display/catalog`),{name:'forged'}))
 await assertFails(setDoc(doc(db,`${ROOT}/generations/g1/materials/S0`),{...base.materials[0],stock:999999}))
})
