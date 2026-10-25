import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryCatalogBatch,summaryCatalog } from './summaryCatalog.js'
import { enrolFixture } from './summaryMaterialEnrolFixture.js'
import { summaryMaterialEnrol } from './summaryMaterialEnrol.js'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop,summaryMaterialCreate,summaryMaterialArchive } from './summaryMaterialAuthor.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryPreparedMenu } from './summaryPreparedMenu.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('replaces an unused protected role without changing stocks, costs or original IDs',async()=>{
  const {base,f}=enrolFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().catalog.summaryMaterials).toEqual(f.operation.materialIds)
  expect((await getDoc(doc(db,`${GENERATION}/materials/S0`))).data()).toEqual(base.materials[0])
  for(const m of f.nextMaterials){expect(m.stock).toBe(base.materials.find(old=>old.id===m.id).stock);expect(m.lots).toEqual(base.materials.find(old=>old.id===m.id).lots)}
})
it.each(Array.from({length:15},(_,i)=>i))('rejects missing material guard %i',async i=>{
  const {base,f}=enrolFixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each(['omitShop','omitOperation'])('rejects incomplete enrolment %s',async key=>{
  const {base,f}=enrolFixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>{f.nextMaterials[0].stock++}],['cost',f=>{f.nextMaterials[0].unitCost++}],
  ['old coefficient',f=>{f.nextMaterials[0].recipeIndex.menus.SIMPLE++}],
  ['new coefficient',f=>{f.nextMaterials.at(-1).recipeIndex.addons.A0++}],
  ['new hidden key',f=>{f.nextMaterials.at(-1).recipeIndex.menus.HIDDEN=0}],
  ['guard order',f=>{f.nextShop.catalog.summaryMaterials.reverse();f.operation.materialIds.reverse()}],
  ['extra guard',f=>{f.nextShop.catalog.summaryMaterials.push('S0')}],
  ['catalog price',f=>{f.nextShop.catalog.menus.SIMPLE.pricesCents.P++}],
  ['registry',f=>{f.nextShop.materialIds.reverse()}],['production refs',f=>{f.nextShop.productionUsers.S0=['S1']}],
  ['removed revision',f=>{f.operation.removedRevision--}],['catalog revision',f=>{f.operation.sourceCatalogRevision--}],
  ['uid',f=>{f.operation.uid='other'}],['recipe revision',f=>{f.nextMaterials[0].recipeIndex.catalogRevision--}],
])('rejects enrolment forgery %s',async(_,tamper)=>{
  const {base,f}=enrolFixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
function denseFixture(){
  const {base}=enrolFixture(),c=base.shop.catalog
  for(let i=4;i<64;i++){const id=`M${i}`;c.menuIds.push(id);c.menus[id]={...structuredClone(c.menus.SIMPLE),id}}
  for(let i=11;i<64;i++){const id=`A${i}`;c.addonIds.push(id);c.addons[id]=structuredClone(c.addons.A1);for(const p of c.platformIds)c.addonPrices[p][id]=c.addons[id].pricesCents[p]}
  for(const m of base.materials){m.recipeIndex.menus={_:0,...Object.fromEntries(c.menuIds.map(id=>[id,c.menus[id].recipe[m.id]||0]))};m.recipeIndex.addons={_:0,...Object.fromEntries(c.addonIds.map(id=>[id,c.addons[id].recipe[m.id]||0]))}}
  return {base,f:summaryMaterialEnrol(base.shop,base.materials,'S0','NEW')}
}
it('enrols at 64 menus and 64 addons without extra witness documents',async()=>{
  const {base,f}=denseFixture();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(Array.from({length:128},(_,i)=>({collection:i<64?'menus':'addons',index:i%64})))('rejects hidden zero-valued reference $collection:$index',async({collection,index})=>{
  const {base,f}=denseFixture(),c=base.shop.catalog,id=c[collection==='menus'?'menuIds':'addonIds'][index]
  c[collection][id].recipe.S0=0
  if(collection==='menus')c.menus[id].materialIds.push('S0')
  f.nextShop.catalog=structuredClone(c);f.nextShop.catalog.summaryMaterials=[...f.operation.materialIds]
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('sorts an existing incoming raw material into the first cost-rank position',async()=>{
  const {base}=enrolFixture();base.materials.unshift(base.materials.pop());base.materials.forEach((m,i)=>{m.costRank=i})
  base.shop=materialRegistryShop(base.shop,base.materials)
  const f=summaryMaterialEnrol(base.shop,base.materials,'S0','NEW')
  expect(f.operation.materialIds[0]).toBe('NEW');await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([null,'take','quantity','cost','approval','missing approval'])('checks an empty incoming guard with explicit shortages: %s',async tamper=>{
  const {base}=enrolFixture(),db=env.authenticatedContext('cashier').firestore()
  base.materials.unshift(base.materials.pop());base.materials.forEach((m,i)=>{m.costRank=i});base.shop=materialRegistryShop(base.shop,base.materials)
  const enrol=summaryMaterialEnrol(base.shop,base.materials,'S0','NEW')
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,enrol).commit())
  let materials=base.materials.map(m=>enrol.nextMaterials.find(n=>n.id===m.id)||m)
  const input=structuredClone(enrol.nextShop.catalog.menus.SIMPLE);input.recipe.NEW=100
  const edit=summaryPreparedMenu(enrol.nextShop,materials,input)
  await assertSucceeds(summaryCatalogBatch(db,edit).commit());materials=materials.map(m=>edit.nextMaterials.find(n=>n.id===m.id)||m)
  const sale=preparedSale(summarySale(edit.nextShop,materials,Array.from({length:6},()=>base.order.lines[0])))
  expect(sale.order.inventory[0].shortage).toBe(600)
  await prepareSummarySale(db,sale)
  if(tamper==='take'){sale.order.inventory[0].take=1;sale.order.inventory[0].shortage=599;sale.order.inventory[0].lotTakes[0]=1;sale.order.approvedShortages.NEW=599;sale.nextMaterials[0].stock=-1;sale.nextMaterials[0].lotQty._=-1}
  if(tamper==='quantity'){sale.nextMaterials[0].lotQty.HIDDEN=1;sale.nextMaterials[0].stock=1}
  if(tamper==='cost')sale.nextMaterials[0].unitCost=1
  if(tamper==='approval')sale.order.approvedShortages.NEW--
  if(tamper==='missing approval')delete sale.order.approvedShortages.NEW
  if(tamper)await assertFails(preparedSaleBatch(db,sale).commit())
  else await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it('invalidates old staged prices and requires preparing them again after replacement',async()=>{
  const {base,f}=enrolFixture(),db=env.authenticatedContext('cashier').firestore(),old=preparedSale(summarySale(base.shop,base.materials,base.order.lines))
  await seedSetCatalog(env,base);await prepareSummarySale(db,old);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const materials=base.materials.map(m=>f.nextMaterials.find(n=>n.id===m.id)||m)
  const fresh=preparedSale(summarySale(f.nextShop,materials,base.order.lines))
  await assertFails(preparedSaleBatch(db,fresh).commit())
  await assertSucceeds(prepareSummarySale(db,fresh));await assertSucceeds(preparedSaleBatch(db,fresh).commit())
})
it('rejects a stale competing replacement and replans against the new protected roles',async()=>{
  const {base}=enrolFixture(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('other').firestore()
  const created=summaryMaterialCreate(base.shop,{id:'OTHER',name:'Other',emoji:'',unit:'g',packSize:1000,minAlertQ:0,inventoryType:'ingredient'})
  base.shop=created.nextShop;base.materials.push(created.next)
  const a=summaryMaterialEnrol(base.shop,base.materials,'S0','NEW'),b=summaryMaterialEnrol(base.shop,base.materials,'S0','OTHER',{opId:'SECOND',uid:'other'})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,a).commit());await assertFails(summaryCatalogBatch(other,b).commit())
  const materials=base.materials.map(m=>a.nextMaterials.find(n=>n.id===m.id)||m)
  const fresh=summaryMaterialEnrol(a.nextShop,materials,'NEW','OTHER',{opId:'SECOND',uid:'other'})
  await assertSucceeds(summaryCatalogBatch(other,fresh).commit());await assertFails(summaryCatalogBatch(other,fresh).commit())
})
it.each(['menus','addons'])('rejects a hidden incoming zero reference in %s',async collection=>{
  const {base,f}=enrolFixture(),id=base.shop.catalog[collection==='menus'?'menuIds':'addonIds'][0]
  base.shop.catalog[collection][id].recipe.NEW=0
  f.nextShop.catalog=structuredClone(base.shop.catalog);f.nextShop.catalog.summaryMaterials=[...f.operation.materialIds]
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['anonymous','generation','inactive shop','deleted incoming','deleted outgoing'])('rejects replacement with %s',async kind=>{
  const {base,f}=enrolFixture()
  if(kind==='generation'){base.shop.generation='another';f.nextShop.generation='another'}
  if(kind==='inactive shop'){base.shop.status='paused';f.nextShop.status='paused'}
  if(kind==='deleted incoming'){base.materials.at(-1).deleted=true;f.nextMaterials.at(-1).deleted=true}
  if(kind==='deleted outgoing')base.materials[0].deleted=true
  await seedSetCatalog(env,base)
  const db=kind==='anonymous'?env.unauthenticatedContext().firestore():env.authenticatedContext('cashier').firestore()
  await assertFails(summaryCatalogBatch(db,f).commit())
})
it('uses native edits to sell with a replacement, archives the old material, and returns an older bill exactly once',async()=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore()
  let shop=materialRegistryShop(base.shop,base.materials),materials=base.materials
  await seedSetCatalog(env,{...base,shop})
  const replace=rows=>{materials=materials.map(m=>rows.find(n=>n.id===m.id)||m)}
  const created=summaryMaterialCreate(shop,{id:'NEW',name:'New',emoji:'',unit:'g',minAlertQ:0,packSize:1000,inventoryType:'ingredient'})
  await assertSucceeds(summarySwitchBatch(db,created).commit());shop=created.nextShop;materials.push(created.next)
  const lines=Array.from({length:6},()=>base.order.lines[0]),original=preparedSale(summarySale(shop,materials,lines,{opId:'BEFORE'}))
  await prepareSummarySale(db,original);await assertSucceeds(preparedSaleBatch(db,original).commit());shop=original.nextShop;replace(original.nextMaterials)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/BEFORE`))).data()
  const received=summaryStock(shop,materials.find(m=>m.id==='NEW'),{qtyQ:100000,unitCost:0.5})
  await assertSucceeds(setStockInBatch(db,received).commit());shop=received.nextShop;replace([received.next])
  const addon=summaryCatalog(shop,materials,c=>{delete c.addons.A0.recipe.S0})
  await assertSucceeds(summaryCatalogBatch(db,addon).commit());shop=addon.nextShop;replace(addon.nextMaterials)
  for(const id of shop.catalog.menuIds){
    const input=structuredClone(shop.catalog.menus[id]);delete input.recipe.S0
    const edit=summaryPreparedMenu(shop,materials,input,{opId:`CLEAR-${id}`})
    await assertSucceeds(summaryCatalogBatch(db,edit).commit());shop=edit.nextShop;replace(edit.nextMaterials)
  }
  const enrol=summaryMaterialEnrol(shop,materials,'S0','NEW')
  await assertSucceeds(summaryCatalogBatch(db,enrol).commit());shop=enrol.nextShop;replace(enrol.nextMaterials)
  const archived=summaryMaterialArchive(shop,materials.find(m=>m.id==='S0'),true)
  await assertSucceeds(summarySwitchBatch(db,archived).commit());shop=archived.nextShop;replace([archived.next])
  const input=structuredClone(shop.catalog.menus.SIMPLE);input.recipe.NEW=100
  const edited=summaryPreparedMenu(shop,materials,input,{opId:'USE-NEW'})
  await assertSucceeds(summaryCatalogBatch(db,edited).commit());shop=edited.nextShop;replace(edited.nextMaterials)
  const sale=preparedSale(summarySale(shop,materials,lines,{opId:'AFTER'}))
  expect(sale.order.inventory.find(row=>row.materialId==='NEW').needed).toBe(600)
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());shop=sale.nextShop;replace(sale.nextMaterials)
  const beforeReturn=structuredClone(materials),returned=summaryCancel(shop,materials,order)
  await assertSucceeds(summaryCancelBatch(db,returned).commit());shop=returned.nextShop;replace(returned.nextMaterials)
  await assertFails(summaryCancelBatch(db,returned).commit())
  for(const row of order.inventory)expect(materials.find(m=>m.id===row.materialId).stock).toBe(beforeReturn.find(m=>m.id===row.materialId).stock+row.take)
  expect(materials.find(m=>m.id==='S0').deleted).toBe(true)
  expect((await getDoc(doc(db,`${GENERATION}/materials/NEW`))).data().stock).toBe(99400)
  const restored=summaryMaterialArchive(shop,materials.find(m=>m.id==='S0'),false,{opId:'RESTORE'})
  await assertSucceeds(summarySwitchBatch(db,restored).commit());shop=restored.nextShop;replace([restored.next])
  const clear=structuredClone(shop.catalog.menus.SIMPLE);delete clear.recipe.NEW
  const edit=summaryPreparedMenu(shop,materials,clear,{opId:'CLEAR-NEW'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit());shop=edit.nextShop;replace(edit.nextMaterials)
  const back=summaryMaterialEnrol(shop,materials,'NEW','S0',{opId:'BACK'})
  await assertSucceeds(summaryCatalogBatch(db,back).commit());expect(back.operation.materialIds).toEqual(base.shop.catalog.summaryMaterials)
})
