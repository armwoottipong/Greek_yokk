import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,writeBatch,setDoc,getDocFromServer,deleteDoc,serverTimestamp,Timestamp} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
async function fixture(count=1){
 const imported=compileCoreImport(coreSource(),{shopId:'proof-shop',generation:'g_trial_dynamic',sourceSha256:'a'.repeat(64)})
 const shop=imported.shop,materials=imported.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 shop.generation='g1'
 for(let i=16;i<20;i++){const m=structuredClone(materials[0]);m.id=`NEW${i}`;m.costRank=i;m.recipeIndex={catalogRevision:0,menus:{_:0},addons:{_:0}};materials.push(m);shop.materialIds.push(m.id);shop.productionUsers[m.id]=[]}
 const menu=shop.catalog.menus[shop.catalog.menuIds[0]];menu.rawRecipe=count===1?{NEW16:100}:Object.fromEntries(shop.materialIds.slice(20-count).map(id=>[id,100]));menu.recipe={...menu.rawRecipe};menu.materialIds=Object.keys(menu.recipe)
 const root='shops/proof-shop',gen=root+'/generations/g1'
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.set(doc(db,root),shop);for(const m of materials)b.set(doc(db,gen+'/materials/'+m.id),m);await b.commit()})
 const db=env.authenticatedContext('cashier').firestore(),api=createCoreTransport({db,getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'a',ready:true,online:true})})
 const sale={kind:'sale',opId:'DYNAMIC',payload:{platformId:shop.catalog.platformIds[0],lines:[{menuId:menu.id,qty:1,optionIds:[]}],approvedShortages:{}}}
 return {api,sale,shop,materials,db,root,gen}
}
it('deducts a new ingredient outside the old sixteen guards and returns it exactly once',async()=>{
 const {api,sale,materials}=await fixture(),before=materials.find(m=>m.id==='NEW16').stock
 const receipt=await api.commit(sale)
 expect(receipt.materialIds).toContain('NEW16')
 expect((await api.snapshot()).materials.find(m=>m.id==='NEW16').stock).toBe(before-100)
 await api.commit({kind:'cancel',opId:'RETURN',payload:{orderId:sale.opId}})
 expect((await api.snapshot()).materials.find(m=>m.id==='NEW16').stock).toBe(before)
})

it('deducts all sixteen selected materials and rejects seventeen before any write',async()=>{
 const {api,sale}=await fixture(16)
 const r=await api.commit(sale);expect(r.inventory).toHaveLength(16);expect(r.inventory.every(row=>row.needed===100)).toBe(true)
})
it('refuses a seventeen-material runtime bill without a partial stock deduction',async()=>{
 const {api,sale,shop}=await fixture(17)
 await expect(api.commit(sale)).rejects.toThrow('SALE_MATERIAL_LIMIT')
 expect((await api.snapshot()).shop.revision).toBe(shop.revision)
})
async function prepare(f,db,gen,ids=f.order.materialIds){
 const o=f.order
 await setDoc(doc(db,`${gen}/preparations/sale_${o.opId}`),{kind:'sale_set',opId:o.opId,uid:o.uid,proofCount:1,stepCount:0,materialCount:0,state:'open',createdAt:serverTimestamp(),lifetimeDays:7})
 await setDoc(doc(db,`${gen}/preparedSales/${o.opId}/lineProofs/0`),{opId:o.opId,index:0,uid:o.uid,catalogRevision:f.shop.catalogRevision,platformId:o.platformId,addonKeys:o.addonKeys,materialIds:ids,billOperands:o.billOperands,coverageCount:0,lines:o.lines})
 await setDoc(doc(db,`${gen}/preparedSales/${o.opId}/lineProofs/0`),{opId:o.opId,index:0,uid:o.uid,catalogRevision:f.shop.catalogRevision,platformId:o.platformId,addonKeys:o.addonKeys,materialIds:ids,billOperands:o.billOperands,coverageCount:1,lines:o.lines})
 await setDoc(doc(db,`${gen}/preparedSales/${o.opId}/certificates/bill`),{opId:o.opId,uid:o.uid,catalogRevision:f.shop.catalogRevision,platformId:o.platformId,addonKeys:o.addonKeys,materialIds:ids,billOperands:o.billOperands,lines:o.lines})
 const cache=writeBatch(db)
 for(const row of o.inventory){const m=f.materials.find(m=>m.id===row.materialId);cache.set(doc(db,`${gen}/materials/${m.id}`),{...m,billPreparationId:o.opId,billPreparations:{...m.billPreparations,[o.opId]:{uid:o.uid,catalogRevision:f.shop.catalogRevision,needed:row.needed}}})}
 await cache.commit()
 for(const m of f.nextMaterials)m.billPreparationId=o.opId
}
it('refuses preparing a line whose material list omits its new ingredient',async()=>{
 const {shop,materials,db,gen,sale}=await fixture(),f=summaryMultiGroupSale(shop,materials,sale.payload.lines,{platformId:sale.payload.platformId,opId:sale.opId,uid:'cashier'})
 await assertFails(prepare(f,db,gen,shop.catalog.summaryMaterials))
})
it.each(['omitStock','forgedNeed','mismatchedFootprint'])('refuses %s in a dynamic sale atomically',async tamper=>{
 const {shop,materials,db,gen,root,sale,api}=await fixture(),f=summaryMultiGroupSale(shop,materials,sale.payload.lines,{platformId:sale.payload.platformId,opId:sale.opId,uid:'cashier'})
 await prepare(f,db,gen)
 if(tamper==='forgedNeed')f.order.inventory.find(row=>row.materialId==='NEW16').needed--
 if(tamper==='mismatchedFootprint')f.order.materialIds=[...shop.catalog.summaryMaterials]
 const b=writeBatch(db);b.set(doc(db,root),f.nextShop);b.set(doc(db,`${gen}/orders/${sale.opId}`),f.order)
 for(const m of f.nextMaterials)if(tamper!=='omitStock'||m.id!=='NEW16')b.set(doc(db,`${gen}/materials/${m.id}`),m)
 await assertFails(b.commit());expect((await api.snapshot()).shop.revision).toBe(shop.revision)
})

it('cleans only its own abandoned quantity preparation and preserves another pending command',async()=>{
 const {api,sale,shop,materials,db,gen}=await fixture()
 const options={platformId:sale.payload.platformId,uid:'cashier',opId:sale.opId}
 await prepare(summaryMultiGroupSale(shop,materials,sale.payload.lines,options),db,gen)
 const fresh=await api.snapshot()
 await prepare(summaryMultiGroupSale(fresh.shop,fresh.materials,sale.payload.lines,{...options,opId:'OTHER'}),db,gen)
 expect((await api.snapshot()).materials.some(m=>m.billPreparations?.[sale.opId])).toBe(true)
 expect(await api.abandonSale(sale)).toMatchObject({abandoned:true})
 const after=await api.snapshot()
 expect(after.materials.some(m=>m.billPreparations?.[sale.opId])).toBe(false)
 expect(after.materials.some(m=>m.billPreparations?.OTHER)).toBe(true)
 expect(after.shop.revision).toBe(shop.revision)
})

it('rejects changing the immutable bill descriptor or certifying a forged quantity',async()=>{
 const {api,sale,shop,materials,db,gen}=await fixture(),f=summaryMultiGroupSale(shop,materials,sale.payload.lines,{platformId:sale.payload.platformId,opId:sale.opId,uid:'cashier'})
 await prepare(f,db,gen)
 const proofRef=doc(db,`${gen}/preparedSales/${sale.opId}/lineProofs/0`),proof=(await getDocFromServer(proofRef)).data()
 await assertFails(setDoc(proofRef,{...proof,billOperands:{...proof.billOperands,lineQtys:[2,0,0,0,0,0]}}))
 const material=(await api.snapshot()).materials.find(m=>m.id==='NEW16'),ref=doc(db,`${gen}/materials/NEW16`)
 await assertFails(setDoc(ref,{...material,billPreparations:{...material.billPreparations,[sale.opId]:{...material.billPreparations[sale.opId],needed:99}}}))
 expect((await api.snapshot()).shop.revision).toBe(shop.revision)
})
it('requires the complete price/coverage certificate and fences its recreation after abandonment',async()=>{
 const {api,sale,shop,materials,db,gen,root}=await fixture(),f=summaryMultiGroupSale(shop,materials,sale.payload.lines,{platformId:sale.payload.platformId,opId:sale.opId,uid:'cashier'})
 await prepare(f,db,gen)
 const certificateRef=doc(db,`${gen}/preparedSales/${sale.opId}/certificates/bill`),certificate=(await getDocFromServer(certificateRef)).data()
 // A certificate may not be removed while its preparation is open.
 await assertFails(deleteDoc(certificateRef))
 await api.abandonSale(sale)
 await assertFails(setDoc(certificateRef,certificate))
 const b=writeBatch(db);b.set(doc(db,root),f.nextShop);b.set(doc(db,`${gen}/orders/${sale.opId}`),f.order)
 for(const m of f.nextMaterials)b.set(doc(db,`${gen}/materials/${m.id}`),m)
 await assertFails(b.commit());expect((await api.snapshot()).shop.revision).toBe(shop.revision)
})

it.each(['open','abandoned'])('recovers full %s preparation capacity after another account disappears without removing live pending work',async state=>{
 const {api,sale,shop,materials,db,gen}=await fixture(),oldTime=Timestamp.fromMillis(Date.now()-8*86400000)
 const entries=Object.fromEntries(Array.from({length:64},(_,i)=>[`OLD${i}`,{uid:'departed',catalogRevision:shop.catalogRevision,needed:0}]))
 await env.withSecurityRulesDisabled(async c=>{
  const b=writeBatch(c.firestore())
  for(let i=0;i<64;i++)b.set(doc(c.firestore(),`${gen}/preparations/sale_OLD${i}`),{kind:'sale_set',opId:`OLD${i}`,uid:'departed',proofCount:1,stepCount:0,materialCount:0,state:i===63?'open':state,createdAt:i===63?Timestamp.now():oldTime,lifetimeDays:7})
  for(const m of materials)b.set(doc(c.firestore(),`${gen}/materials/${m.id}`),{...m,billPreparationId:'OLD63',billPreparations:entries})
  await b.commit()
 })
 const before=(await api.snapshot()).materials.find(m=>m.id==='NEW16'),forged={...before,billPreparations:{...before.billPreparations}};delete forged.billPreparations.OLD63
 await assertFails(setDoc(doc(db,`${gen}/materials/NEW16`),forged))
 expect((await api.commit(sale)).kind).toBe('sale_set')
 const after=await api.snapshot()
 expect(after.materials.every(m=>m.billPreparations?.OLD63?.uid==='departed')).toBe(true)
 expect(after.materials.every(m=>!m.billPreparations?.OLD0)).toBe(true)
 expect((await getDocFromServer(doc(db,`${gen}/preparations/sale_OLD0`))).data().state).toBe(state==='open'?'expired':'abandoned')
})
