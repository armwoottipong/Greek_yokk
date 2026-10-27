import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest'
import {doc,writeBatch,getDocFromServer,setDoc} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {summaryMaterialDelete} from '../../src/cloud/core/model/materialDelete.js'
import {planCatalogCommand,applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
let env;const memory=new Map(),root='shops/proof-shop',gen=root+'/generations/g1'
beforeAll(async()=>{vi.stubGlobal('sessionStorage',{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)});env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{memory.clear();await env.clearFirestore()})
afterAll(async()=>{await env.cleanup();vi.unstubAllGlobals()})
async function setup(count=20){
 const imported=compileCoreImport(coreSource(),{shopId:'proof-shop',generation:'g_trial_dynamic',sourceSha256:'a'.repeat(64)}),shop=imported.shop
 shop.generation='g1';const materials=imported.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 for(let i=16;i<count;i++){const m=structuredClone(materials[0]);m.id=`NEW${i}`;m.name=`New material ${i}`;m.costRank=i;m.recipeIndex={catalogRevision:shop.catalogRevision,menus:{_:0},addons:{_:0},quantities:Array(15).fill(0)};materials.push(m);shop.materialIds.push(m.id);shop.productionUsers[m.id]=[]}
 const display=imported.documents.find(d=>d.path.endsWith('/display/catalog')).data
 await env.withSecurityRulesDisabled(async c=>{const db=c.firestore(),b=writeBatch(db);b.set(doc(db,root),shop);for(const m of materials)b.set(doc(db,gen+'/materials/'+m.id),m);b.set(doc(db,gen+'/display/catalog'),display);await b.commit()})
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'a',deviceId:'a',ready:true,online:true},db=env.authenticatedContext('a').firestore()
 const api=createCoreTransport({db,getContext:()=>context}),other=createCoreTransport({db:env.authenticatedContext('b').firestore(),getContext:()=>({...context,uid:'b',deviceId:'b'})})
 const load=async()=>({...await api.snapshot(),display:(await getDocFromServer(doc(db,gen+'/display/catalog'))).data()})
 let data=await load(),model
 model=createInventoryModel({getData:()=>data,loadServer:load,execute:async command=>{const result=await api.commit(command);data=await load();model.update(data);return {ok:true,value:{opId:command.opId,kind:command.kind,result}}},isReady:()=>true,isBlocked:()=>false,storageKey:'dynamic-recipe'})
 return {api,other,model,load,db,platform:shop.catalog.platformIds[0],prices:Object.fromEntries(shop.catalog.platformIds.map(id=>[id,10]))}
}
it('saves a new warehouse ingredient through the original editor model, sells and returns across accounts',async()=>{
 const {api,other,model,platform,prices}=await setup()
 try{
  expect(await model.saveMenu({name:'New warehouse recipe',emoji:'x',prices,hasPackage:true,hasAddons:false,recipe:[{materialId:'NEW16',qty:1}]})).toMatchObject({ok:true})
  const menu=model.menus.find(m=>m.name==='New warehouse recipe')
  expect((await other.snapshot()).shop.catalog.menus[menu.id].baseMaterialIds).toEqual(['NEW16'])
  const before=(await api.snapshot()).materials.find(m=>m.id==='NEW16').stock
  const receipt=await api.commit({kind:'sale',opId:'NEW-SALE',payload:{platformId:platform,lines:[{menuId:menu.id,qty:1,optionIds:[]}],approvedShortages:{}}})
  expect(receipt.inventory.find(row=>row.materialId==='NEW16').needed).toBe(100)
  await other.commit({kind:'cancel',opId:'NEW-RETURN',payload:{orderId:receipt.opId}})
  expect((await api.snapshot()).materials.find(m=>m.id==='NEW16').stock).toBe(before)
 } finally {model.close()}
})

function menuCommand(shop,raw={NEW16:100}){
 return {kind:'menu',opId:'ADMIT',payload:{input:{id:'ADMIT-MENU',name:'Admitted',active:true,pricesCents:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,1000])),rawRecipe:raw,recipe:{...raw},hasPackage:true,optionIds:[],min:0,max:0,priceMode:'addon',optionPrices:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,{_:0}])),groupIds:[]},display:{name:'Admitted',emoji:''}}}
}
async function admissionParts(db,command,f,shop){
 for(let index=0;index*4<f.operation.validationIds.length;index++)await setDoc(doc(db,`${gen}/recipeAdmissions/${command.opId}/parts/${index}`),{opId:command.opId,index,uid:'a',sourceRevision:shop.revision,kind:command.kind,entityId:f.operation.entityId,input:f.operation.input,entitySnapshot:f.operation.entitySnapshot,materialIds:f.operation.validationIds.slice(index*4,index*4+4)})
}
function catalogBatch(db,command,f,display,omitCheck=false){
 const b=writeBatch(db);b.set(doc(db,root),f.nextShop);b.set(doc(db,`${gen}/operations/${command.opId}`),f.operation)
 b.set(doc(db,`${gen}/display/catalog`),applyCatalogDisplay(display,f.displayChange))
 b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/input`),f.inputProof)
 b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/admitted`),f.admittedProof)
 if(f.shapeProof)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/shape`),f.shapeProof)
 if(f.referenceProof)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/0`),f.referenceProof)
 for(const p of f.checkProofs)if(!omitCheck||p.index!==4)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/check${p.index}`),p.data)
 return b
}
it.each(['omitAdmission','omitCheck','forgedUsedIds','forgedRegistry','forgedQuantity'])('rejects %s without changing catalog or inventory',async tamper=>{
 const {api,model,db,load}=await setup()
 try{
  const before=await load(),command=menuCommand(before.shop),f=planCatalogCommand(before.shop,before.materials,command,'a')
  if(tamper!=='omitAdmission')await admissionParts(db,command,f,before.shop)
  if(tamper==='forgedUsedIds'){f.operation.entitySnapshot.baseMaterialIds=[];f.nextShop.catalog.menus['ADMIT-MENU'].baseMaterialIds=[]}
  if(tamper==='forgedRegistry')f.nextShop.catalog.recipeRegistryIds.push('GHOST')
  if(tamper==='forgedQuantity'){f.operation.entitySnapshot.recipe.NEW16++;f.nextShop.catalog.menus['ADMIT-MENU'].recipe.NEW16++}
  await assertFails(catalogBatch(db,command,f,before.display,tamper==='omitCheck').commit())
  expect((await api.snapshot()).shop.revision).toBe(before.shop.revision)
 } finally {model.close()}
})
it('uses all sixty-four registered materials across recipes while each bill deducts at most sixteen',async()=>{
 const {api,model}=await setup(64)
 try{
  const before=await api.snapshot()
  for(let i=0;i<4;i++){
   const raw=Object.fromEntries(before.shop.materialIds.slice(i*16,i*16+16).map(id=>[id,100])),command=menuCommand(before.shop,raw)
   command.opId=`ADMIT_${i}`;command.payload.input.id=`ADMIT-MENU_${i}`
   await api.commit(command)
  }
  const sale=await api.commit({kind:'sale',opId:'SIXTYFOUR-SALE',payload:{platformId:before.shop.catalog.platformIds[0],lines:[{menuId:'ADMIT-MENU_3',qty:1,optionIds:[]}],approvedShortages:{}}})
  expect(sale.inventory.filter(row=>row.needed>0)).toHaveLength(16)
  expect(sale.materialIds.every(id=>before.shop.materialIds.slice(48).includes(id))).toBe(true)
 } finally {model.close()}
})

it('refuses archiving a newly referenced ingredient even when its old leaf cache is zero',async()=>{
 const {api,model,db}=await setup()
 try{
  await api.commit(menuCommand((await api.snapshot()).shop))
  await expect(api.commit({kind:'material_archive',opId:'ARCHIVE-USED',payload:{materialId:'NEW16',deleted:true}})).rejects.toThrow()
  expect((await api.snapshot()).materials.find(m=>m.id==='NEW16').deleted).toBe(false)
  const current=await api.snapshot()
  await assertFails(setDoc(doc(db,`${gen}/materialReferences/FORGED-ARCHIVE/parts/0`),{opId:'FORGED-ARCHIVE',index:0,uid:'a',sourceRevision:current.shop.revision,kind:'material_archive',materialId:'NEW16'}))
 } finally {model.close()}
})

it('reclassifies a new recipe material without stale caches and updates packaging coverage',async()=>{
 const {api,model}=await setup()
 try{
  const before=await api.snapshot(),command=menuCommand(before.shop);command.payload.input.hasPackage=false
  await api.commit(command)
  await api.commit({kind:'material_type',opId:'TO-PACK',payload:{materialId:'NEW16',inventoryType:'packaging'}})
  const pack=await api.snapshot();expect(pack.shop.catalog.menus['ADMIT-MENU'].baseMaterialIds).toEqual([])
  const payload={platformId:before.shop.catalog.platformIds[0],lines:[{menuId:'ADMIT-MENU',qty:1,optionIds:[]}],approvedShortages:{}}
  const sale=await api.commit({kind:'sale',opId:'PACK-OFF',payload})
  expect(sale.inventory.every(row=>row.needed===0)).toBe(true)
  await api.commit({kind:'material_type',opId:'TO-INGREDIENT',payload:{materialId:'NEW16',inventoryType:'ingredient'}})
  expect((await api.snapshot()).shop.catalog.menus['ADMIT-MENU'].baseMaterialIds).toEqual(['NEW16'])
  const next=await api.commit({kind:'sale',opId:'INGREDIENT-ON',payload})
  expect(next.inventory.find(row=>row.materialId==='NEW16').needed).toBe(100)
 } finally {model.close()}
})

it('retains a sold ingredient for old-bill cancellation after recipe removal and archival',async()=>{
 const {api,other,model,db}=await setup()
 try{
  const initial=await api.snapshot(),ingredient=initial.materials.find(m=>m.id==='NEW16')
  await api.commit({kind:'stock_count',opId:'COUNT-ONE',payload:{requests:[{materialId:'NEW16',counts:[{id:ingredient.lotIds[0],to:100}],mode:'count',reason:'count',note:''}]}})
  await api.commit(menuCommand((await api.snapshot()).shop))
  const sale=await api.commit({kind:'sale',opId:'SELL-ONE',payload:{platformId:initial.shop.catalog.platformIds[0],lines:[{menuId:'ADMIT-MENU',qty:1,optionIds:[]}],approvedShortages:{}}})
  expect((await api.snapshot()).shop.returnMaterials.NEW16).toBe(true)
  const empty=menuCommand((await api.snapshot()).shop,{});empty.opId='EMPTY-RECIPE';await api.commit(empty)
  await api.commit({kind:'material_archive',opId:'ARCHIVE-EMPTY',payload:{materialId:'NEW16',deleted:true}})
  await expect(api.commit({kind:'material_delete',opId:'DELETE-SOLD',payload:{materialId:'NEW16'}})).rejects.toThrow()
  // Bypass the client pin check; the server must independently preserve it.
  const before=await api.snapshot(),m=before.materials.find(m=>m.id==='NEW16'),forgedShop=structuredClone(before.shop);delete forgedShop.returnMaterials.NEW16
  const f=summaryMaterialDelete(forgedShop,m,{opId:'FORGED-DELETE',uid:'a'});f.nextShop.returnMaterials=before.shop.returnMaterials
  for(let index=0;index<8;index++)await setDoc(doc(db,`${gen}/materialReferences/FORGED-DELETE/parts/${index}`),{opId:'FORGED-DELETE',index,uid:'a',sourceRevision:before.shop.revision,kind:'material_delete',materialId:'NEW16'})
  const b=writeBatch(db);b.set(doc(db,root),f.nextShop);b.set(doc(db,`${gen}/operations/FORGED-DELETE`),f.operation);b.set(doc(db,`${gen}/operations/FORGED-DELETE/referenceProofs/0`),f.referenceProof);b.delete(doc(db,`${gen}/materials/NEW16`));await assertFails(b.commit())
  await other.commit({kind:'cancel',opId:'RETURN-ARCHIVED',payload:{orderId:sale.opId}})
  const returned=(await api.snapshot()).materials.find(m=>m.id==='NEW16');expect(returned.stock).toBe(100);expect(returned.deleted).toBe(true)
 } finally {model.close()}
})
it('still archives and permanently deletes an empty never-sold unreferenced material after catalog edits',async()=>{
 const {api,model}=await setup()
 try{
  const first=await api.snapshot(),m=first.materials.find(m=>m.id==='NEW17')
  await api.commit(menuCommand(first.shop))
  await api.commit({kind:'stock_count',opId:'COUNT-ZERO',payload:{requests:[{materialId:'NEW17',counts:[{id:m.lotIds[0],to:0}],mode:'count',reason:'count',note:''}]}})
  await api.commit({kind:'material_archive',opId:'ARCHIVE-IDLE',payload:{materialId:'NEW17',deleted:true}})
  await api.commit({kind:'material_delete',opId:'DELETE-IDLE',payload:{materialId:'NEW17'}})
  expect((await api.snapshot()).materials.some(m=>m.id==='NEW17')).toBe(false)
 } finally {model.close()}
})
