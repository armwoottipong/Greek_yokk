import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {readFile} from 'node:fs/promises'
import {collection,doc,onSnapshot,writeBatch} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'

let env
const root='shops/proof-shop'
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
function decode(v){
 if(v.mapValue)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,x])=>[k,decode(x)]))
 if(v.arrayValue)return(v.arrayValue.values||[]).map(decode)
 if('integerValue' in v)return Number(v.integerValue)
 if('doubleValue' in v)return v.doubleValue
 if('booleanValue' in v)return v.booleanValue
 if('nullValue' in v)return null
 return v.stringValue??v.timestampValue
}
async function source(file){
 if(file){
  const backup=JSON.parse(await readFile(file,'utf8')),data=d=>decode({mapValue:{fields:d.fields}})
  return {shop:data(backup.root),materials:backup.rows.documents.map(data)}
 }
 const f=summaryFixture()
 f.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
 f.shop=materialRegistryShop(f.shop,f.materials)
 return f
}
// Separate authenticated SDK clients observe server snapshots; no refresh/load
// calls are used to obtain the expected receiving/production/sale/return changes.
function observe(db,path){
 let latest,error
 const waiters=new Set()
 const stop=onSnapshot(collection(db,path),{includeMetadataChanges:true},snapshot=>{
  if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return
  latest=Object.fromEntries(snapshot.docs.map(d=>[d.id,d.data()]))
  for(const w of [...waiters])if(w.matches(latest)){clearTimeout(w.timer);waiters.delete(w);w.resolve(latest)}
 },e=>{error=e;for(const w of waiters){clearTimeout(w.timer);w.reject(e)}waiters.clear()})
 return {
  until(matches){
   if(error)return Promise.reject(error)
   if(latest&&matches(latest))return Promise.resolve(latest)
   return new Promise((resolve,reject)=>{const w={matches,resolve,reject};w.timer=setTimeout(()=>{waiters.delete(w);reject(new Error('Server snapshot did not reach expected inventory'))},8000);waiters.add(w)})
  },
  close(){stop();for(const w of waiters)clearTimeout(w.timer);waiters.clear()}
 }
}
async function workflow(file){
 const f=await source(file),gen=`${root}/generations/${f.shop.generation}`
 await env.withSecurityRulesDisabled(async c=>{const b=writeBatch(c.firestore());b.set(doc(c.firestore(),root),f.shop);for(const m of f.materials)b.set(doc(c.firestore(),`${gen}/materials/${m.id}`),m);await b.commit()})
 const clients=['acceptance-a','acceptance-b'].map(uid=>{
  const db=env.authenticatedContext(uid).firestore(),context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:f.shop.generation,uid,deviceId:uid,ready:true,online:true}
  return {api:createCoreTransport({db,getContext:()=>context}),watch:observe(db,`${gen}/materials`)}
 })
 const [a,b]=clients,expected=Object.fromEntries(f.materials.map(m=>[m.id,m.stock])),wait=async()=>{
  const all=await Promise.all(clients.map(c=>c.watch.until(rows=>Object.entries(expected).every(([id,q])=>rows[id]?.stock===q))))
  expect(Object.fromEntries(Object.entries(all[0]).map(([id,m])=>[id,m.stock]))).toEqual(expected)
  expect(Object.fromEntries(Object.entries(all[1]).map(([id,m])=>[id,m.stock]))).toEqual(expected)
 }
 try{
  await wait()
  const c=f.shop.catalog,platformId=c.platformIds.find(id=>c.platforms[id].active)
  const outputs=f.materials.filter(m=>!m.deleted&&m.productionRecipe?.inputIds?.length)
  const eligible=Object.values(c.menus).filter(m=>m.active&&m.min===0&&(!m.groupId||c.groups[m.groupId].min===0)&&(!m.groupIds?.length||m.groupIds.every(id=>c.groups[id].min===0)))
  const menu=eligible.filter(m=>outputs.some(out=>(m.rawRecipe||m.recipe)[out.id]>0)).sort((x,y)=>x.pricesCents[platformId]-y.pricesCents[platformId])[0]
  expect(menu).toBeTruthy()
  const out=outputs.find(out=>(menu.rawRecipe||menu.recipe)[out.id]>0),recipe=out.productionRecipe,day=Math.floor(Date.now()/86400000)
  if(recipe.inputIds.some((id,i)=>expected[id]<recipe.quantities[i])){
   await expect(a.api.commit({kind:'produce',opId:'SHORTAGE',payload:{materialId:out.id,input:{qtyQ:recipe.yieldQ,receiveDay:day,expiryDay:day+7,lotId:'NO-STOCK'}}})).rejects.toThrow('Production input unavailable')
   expect((await a.api.snapshot()).shop.revision).toBe(f.shop.revision)
  }
  for(const [i,id] of recipe.inputIds.entries()){
   const m=f.materials.find(m=>m.id===id),command={kind:'receive',opId:`ACCEPT-IN-${i}`,payload:{materialId:id,input:{qtyQ:recipe.quantities[i],unitCost:m.unitCost,receiveDay:day,expiryDay:day+7,newLotId:`ACCEPT-FRESH-${i}`}}}
   const receipt=await a.api.commit(command);expect((await a.api.commit(command)).opId).toBe(receipt.opId)
   expected[id]+=recipe.quantities[i];await wait()
  }
  const produce={kind:'produce',opId:'ACCEPT-PRODUCE',payload:{materialId:out.id,input:{qtyQ:recipe.yieldQ,lotId:'ACCEPT-OUTPUT',receiveDay:day,expiryDay:day+7}}}
  expect((await b.api.commit(produce)).kind).toBe('produce')
  expect((await b.api.commit(produce)).opId).toBe(produce.opId)
  for(const [i,id] of recipe.inputIds.entries())expected[id]-=recipe.quantities[i]
  expected[out.id]+=recipe.yieldQ;await wait()
  const beforeSale=await a.api.snapshot(),line={menuId:menu.id,qty:1,...(menu.groupIds?.length===2?{selections:[]}:{optionIds:[]})},sale={kind:'sale',opId:'ACCEPT-SALE',payload:{platformId,lines:[line]}}
  const order=await a.api.commit(sale);expect(order.subtotalCents).toBe(menu.pricesCents[platformId])
  expect(Object.values(order.approvedShortages).every(q=>q===0)).toBe(true)
  for(const row of order.inventory)expected[row.materialId]-=row.take
  await wait()
  expect((await a.api.commit(sale)).opId).toBe(sale.opId)
  const cancel={kind:'cancel',opId:'ACCEPT-CANCEL',payload:{orderId:order.opId}}
  expect((await b.api.commit(cancel)).kind).toBe('cancel')
  for(const row of order.inventory)expected[row.materialId]+=row.take
  await wait()
  expect((await b.api.commit(cancel)).opId).toBe(cancel.opId)
  await expect(a.api.commit({...cancel,opId:'DUPLICATE-RETURN'})).rejects.toThrow('Order already cancelled')
  const final=await a.api.snapshot()
  for(const m of final.materials){const old=beforeSale.materials.find(x=>x.id===m.id);expect(m.stock).toBe(old.stock);expect(m.lotQty).toEqual(old.lotQty);expect(m.unitCost).toBe(old.unitCost);expect(m.packCostCents).toBe(old.packCostCents)}
  expect(final.shop.revision).toBe(f.shop.revision+recipe.inputIds.length+3)
 }finally{for(const c of clients)c.watch.close()}
}
it('replicates receiving, production, sale and exactly-once cancellation between two equal clients',async()=>workflow(),45000)
it.skipIf(!process.env.GY_ACCEPTANCE_SNAPSHOT)('repeats the complete two-client workflow on an isolated copy of the current shop snapshot',async()=>workflow(process.env.GY_ACCEPTANCE_SNAPSHOT),45000)
