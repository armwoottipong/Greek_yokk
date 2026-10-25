import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
import { createRulesTest } from './helpers.js'
import { sourcePreparedFixture } from './summaryPreparedSource.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryMaterialCreate,summaryMaterialArchive } from './summaryMaterialAuthor.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { summarySale } from './summarySale.js'
import { preparedSale } from './summaryPreparedSale.js'
import { summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summaryPreparedMenu } from './summaryPreparedMenu.js'
import { summaryMaterialEnrol } from './summaryMaterialEnrol.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryMaterialType } from './summaryMaterialType.js'
import { summarySaleFromLines } from './summarySale.js'
import { summaryPackageStock } from './summaryPackageStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryPlatform } from './summaryPlatform.js'
import { summaryMaterialDetails,materialDetailsSnapshot } from './summaryMaterialDetails.js'
import { summaryInventoryBatch } from './summaryInventoryBatch.js'
import { prepareInventoryBatch,inventoryBatchCommit } from './summaryPreparedInventory.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('receives inputs, produces and counts a private source output atomically before a six-line sale and old receipt return',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base);await prepareSummarySale(db,base);await preparedSaleBatch(db,base).commit()
  const old=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data(),materials=base.materials.map(m=>base.nextMaterials.find(n=>n.id===m.id)||m)
  const output=materials.find(m=>m.productionRecipe),r=output.productionRecipe,day=Math.floor((Date.now()+7*3600000)/86400000)
  const actions=r.inputIds.map((id,i)=>({kind:'receive',materialId:id,input:{qtyQ:r.quantities[i],unitCost:materials.find(m=>m.id===id).unitCost,receiveDay:day,expiryDay:999999,newLotId:`INPUT-${i}`,lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}}))
  actions.push({kind:'produce',materialId:output.id,input:{qtyQ:r.yieldQ,lotId:'SOURCE-PRODUCT',receiveDay:day,expiryDay:999999,lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}})
  actions.push({kind:'count',materialId:output.id,counts:[{id:'SOURCE-PRODUCT',to:r.yieldQ-1}],reason:'Actual count'})
  const f=summaryInventoryBatch(base.nextShop,materials,actions,{opId:'SOURCE-MIXED'})
  await assertSucceeds(prepareInventoryBatch(db,f));await assertSucceeds(inventoryBatchCommit(db,f).commit())
  const current=materials.map(m=>f.nextMaterials.find(n=>n.id===m.id)||m),sale=preparedSale(summarySaleFromLines(f.nextShop,current,base.order.lines,{opId:'AFTER-MIXED',platformId:base.order.platformId}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const returned=summaryCancel(sale.nextShop,current.map(m=>sale.nextMaterials.find(n=>n.id===m.id)||m),old,{opId:'RETURN-PRE-MIXED'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit())
  for(const m of f.nextMaterials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().legacyInactiveProduction).toEqual(m.legacyInactiveProduction)
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('preserves private source material metadata and categories through a details edit, six-line sale and return',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  expect(base.shop.legacyMaterialCategories).toEqual(raw.categories.material)
  for(const m of base.materials){
    const source=raw.materials.find(row=>row.id===m.legacyId)
    for(const field of ['name','emoji','unit','category','packUnit','shelfLifeDays','isSubIngredient']){
      expect(Object.hasOwn(m,field)).toBe(Object.hasOwn(source,field));if(Object.hasOwn(source,field))expect(m[field]).toEqual(source[field])
    }
    if(source.hasSubRecipe!==true){
      const dormant=Object.fromEntries(['hasSubRecipe','yieldQty','subRecipe'].filter(field=>Object.hasOwn(source,field)).map(field=>[field,source[field]]))
      if(Object.keys(dormant).length)expect(m.legacyInactiveProduction).toEqual(dormant)
    }
  }
  const m=base.materials.find(m=>base.shop.catalog.summaryMaterials.includes(m.id)),before=materialDetailsSnapshot(m)
  const edit=summaryMaterialDetails(base.shop,m,{packUnit:'Updated pack',shelfLifeDays:null,isSubIngredient:!m.isSubIngredient},{opId:'SOURCE-DETAILS'})
  await seedSetCatalog(env,base);await assertSucceeds(summarySwitchBatch(db,edit).commit())
  const materials=base.materials.map(m=>m.id===edit.next.id?edit.next:m),sale=preparedSale(summarySaleFromLines(edit.nextShop,materials,base.order.lines,{opId:'SOURCE-DETAILS-BILL',platformId:base.order.platformId}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data(),returned=summaryCancel(sale.nextShop,materials.map(m=>sale.nextMaterials.find(n=>n.id===m.id)||m),order,{opId:'SOURCE-DETAILS-RETURN'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit())
  const receipt=(await getDoc(doc(db,`${GENERATION}/operations/SOURCE-DETAILS`))).data(),saved=(await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()
  expect(receipt.beforeDetails).toEqual(before);expect(saved.lotQty).toEqual(m.lotQty);expect(saved.lots).toEqual(m.lots);expect(saved.shelfLifeDays).toBeNull()
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('edits a private source channel GP, sells six lines and returns its bill after disabling the channel',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore(),id=base.order.platformId
  await seedSetCatalog(env,base)
  const edit=summaryPlatform(base.shop,base.materials,{id,name:'Source channel',active:true,gpBasisPoints:3500},{opId:'SOURCE-CHANNEL'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  const sale=preparedSale(summarySaleFromLines(edit.nextShop,base.materials,base.order.lines,{opId:'SOURCE-GP-BILL',platformId:id}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data(),materials=base.materials.map(m=>sale.nextMaterials.find(n=>n.id===m.id)||m)
  const disable=summaryPlatform(sale.nextShop,materials,{id,name:'Source channel',active:false,gpBasisPoints:9999},{opId:'SOURCE-CHANNEL-OFF'})
  await assertSucceeds(summaryCatalogBatch(db,disable).commit())
  const returned=summaryCancel(disable.nextShop,materials,order,{opId:'SOURCE-CHANNEL-RETURN'})
  await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/orders/${order.opId}`))).data();expect(saved.gpCents).toBe(order.gpCents);expect(saved.inventory).toEqual(order.inventory)
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('receives a reclassified private source package, sells six lines and returns the earlier bill',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  const target=base.materials.find(m=>base.shop.catalog.summaryMaterials.includes(m.id)&&m.inventoryType==='packaging'&&!m.productionRecipe&&base.shop.productionUsers[m.id].length===0)
  expect(Boolean(target)).toBe(true)
  await seedSetCatalog(env,base);await prepareSummarySale(db,base);await assertSucceeds(preparedSaleBatch(db,base).commit())
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  let shop=base.nextShop,materials=base.materials.map(m=>base.nextMaterials.find(n=>n.id===m.id)||m)
  for(const [i,inventoryType] of ['ingredient','packaging'].entries()){
    const type=summaryMaterialType(shop,materials,target.id,inventoryType,{opId:`RECLASSIFY-${i}`})
    await assertSucceeds(summaryCatalogBatch(db,type).commit());shop=type.nextShop;materials=materials.map(m=>type.nextMaterials.find(n=>n.id===m.id)||m)
  }
  const before=materials.find(m=>m.id===target.id),receive=summaryPackageStock(shop,before,{qtyQ:100,unitCost:0.5,packCostCents:50,receiveDay:22000,opId:'SOURCE-PACKAGE'})
  await assertSucceeds(setStockInBatch(db,receive).commit());shop=receive.nextShop;materials=materials.map(m=>m.id===target.id?receive.next:m)
  const sale=preparedSale(summarySaleFromLines(shop,materials,base.order.lines,{opId:'AFTER-PACKAGE',platformId:base.order.platformId}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());shop=sale.nextShop;materials=materials.map(m=>sale.nextMaterials.find(n=>n.id===m.id)||m)
  const cancelled=summaryCancel(shop,materials,order,{opId:'PRE-PACKAGE-RETURN'})
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit());await assertFails(summaryCancelBatch(db,cancelled).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/${target.id}`))).data()
  expect(saved.lotIds).toEqual(before.lotIds);expect(saved.lots).toEqual(receive.next.lots);expect(saved.unitCost).toBe(receive.next.unitCost)
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('reclassifies a private source packaging member and replans the prepared six-line sale',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  const target=base.materials.find(m=>base.shop.catalog.summaryMaterials.includes(m.id)&&m.inventoryType==='packaging'&&!m.productionRecipe&&base.shop.productionUsers[m.id].length===0)
  expect(Boolean(target)).toBe(true)
  await seedSetCatalog(env,base);await prepareSummarySale(db,base)
  const type=summaryMaterialType(base.shop,base.materials,target.id,'ingredient')
  await assertSucceeds(summaryCatalogBatch(db,type).commit())
  await assertFails(preparedSaleBatch(db,base).commit())
  const sale=preparedSale(summarySaleFromLines(type.nextShop,type.nextMaterials,base.order.lines,{opId:base.order.opId,platformId:base.order.platformId}))
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it.skipIf(!process.env.GY_SOURCE_BACKUP).each([{fruit:true,lines:6},{allOptions:true,lines:6,platformIndex:3}])('prepares and sells private source projection %j',async options=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),f=sourcePreparedFixture(raw,options),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,f);await assertSucceeds(prepareSummarySale(db,f));await assertSucceeds(preparedSaleBatch(db,f).commit())
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('authors material state on private source projection then commits the original sale shape',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),f=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  expect(f.shop.materialIds.length).toBe(f.materials.length)
  const unused=f.materials.find(m=>!f.shop.catalog.summaryMaterials.includes(m.id)&&f.shop.productionUsers[m.id].length===0)
  expect(Boolean(unused)).toBe(true)
  const input=f.materials.find(m=>f.shop.productionUsers[m.id].length>0)
  expect(Boolean(input)).toBe(true);expect(()=>summaryMaterialArchive(f.shop,input,true)).toThrow()
  await seedSetCatalog(env,f)
  const a=summaryMaterialArchive(f.shop,unused,true);await assertSucceeds(summarySwitchBatch(db,a).commit())
  const r=summaryMaterialArchive(a.nextShop,a.next,false,{opId:'RESTORE'});await assertSucceeds(summarySwitchBatch(db,r).commit())
  const created=summaryMaterialCreate(r.nextShop,{id:'NEW-RAW',name:'Test raw',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1000,minAlertQ:0})
  await assertSucceeds(summarySwitchBatch(db,created).commit())
  const materials=f.materials.map(m=>m.id===r.next.id?r.next:m).concat(created.next)
  const sale=preparedSale(summarySale(created.nextShop,materials,f.order.lines,{platformId:f.order.platformId,opId:f.order.opId,uid:f.order.uid}))
  await assertSucceeds(prepareSummarySale(db,sale));await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('replaces a source sale role through native edits and returns a pre-replacement receipt',async()=>{
  const step=async(label,run)=>{try{return await run()}catch(error){throw new Error(`Source workflow ${label}: ${error.code||error.name}`)}}
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),base=sourcePreparedFixture(raw,{fruit:true,lines:6}),db=env.authenticatedContext('cashier').firestore()
  let shop=base.shop,materials=base.materials
  const replace=rows=>{materials=materials.map(m=>rows.find(n=>n.id===m.id)||m)}
  const incoming=materials.find(m=>!shop.catalog.summaryMaterials.includes(m.id)&&!m.deleted)
  expect(Boolean(incoming)).toBe(true)
  const candidates=shop.catalog.summaryMaterials.filter(id=>shop.productionUsers[id].length===0)
  const references=id=>Object.values(shop.catalog.menus).filter(m=>Object.hasOwn(m.recipe,id)).length+Object.values(shop.catalog.addons).filter(a=>Object.hasOwn(a.recipe,id)).length
  const removedId=candidates.sort((a,b)=>references(a)-references(b))[0]
  expect(Boolean(removedId)).toBe(true)
  await seedSetCatalog(env,base);await step('initial preparation',()=>prepareSummarySale(db,base));await step('initial sale',()=>assertSucceeds(preparedSaleBatch(db,base).commit()));shop=base.nextShop;replace(base.nextMaterials)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${base.order.opId}`))).data()
  for(const id of shop.catalog.addonIds){
    if(!Object.hasOwn(shop.catalog.addons[id].recipe,removedId))continue
    const edit=summaryCatalog(shop,materials,c=>{delete c.addons[id].recipe[removedId]},{opId:`CLEAR-ADDON-${shop.revision}`})
    await step('clear addon',()=>assertSucceeds(summaryCatalogBatch(db,edit).commit()));shop=edit.nextShop;replace(edit.nextMaterials)
  }
  for(const id of shop.catalog.menuIds){
    if(!shop.catalog.menus[id].materialIds.includes(removedId))continue
    const input=structuredClone(shop.catalog.menus[id]);delete input.recipe[removedId];delete input.rawRecipe[removedId]
    const edit=summaryPreparedMenu(shop,materials,input,{opId:`CLEAR-MENU-${shop.revision}`})
    await step('clear menu',()=>assertSucceeds(summaryCatalogBatch(db,edit).commit()));shop=edit.nextShop;replace(edit.nextMaterials)
  }
  const enrol=summaryMaterialEnrol(shop,materials,removedId,incoming.id)
  await step('enrol',()=>assertSucceeds(summaryCatalogBatch(db,enrol).commit()));shop=enrol.nextShop;replace(enrol.nextMaterials)
  const archived=summaryMaterialArchive(shop,materials.find(m=>m.id===removedId),true)
  await step('archive',()=>assertSucceeds(summarySwitchBatch(db,archived).commit()));shop=archived.nextShop;replace([archived.next])
  const input=structuredClone(shop.catalog.menus[base.order.lines[0].menuId]);input.rawRecipe[incoming.id]=100
  const edit=summaryPreparedMenu(shop,materials,input,{opId:'USE-INCOMING'})
  await step('use incoming',()=>assertSucceeds(summaryCatalogBatch(db,edit).commit()));shop=edit.nextShop;replace(edit.nextMaterials)
  const sale=preparedSale(summarySale(shop,materials,base.order.lines,{opId:'AFTER-REPLACEMENT',platformId:base.order.platformId}))
  expect(sale.order.inventory.find(row=>row.materialId===incoming.id).needed).toBe(600)
  await step('new preparation',()=>prepareSummarySale(db,sale));await step('new sale',()=>assertSucceeds(preparedSaleBatch(db,sale).commit()));shop=sale.nextShop;replace(sale.nextMaterials)
  const incomingStock=materials.find(m=>m.id===incoming.id).stock,before=structuredClone(materials),cancelled=summaryCancel(shop,materials,order)
  await step('return original sale',()=>assertSucceeds(summaryCancelBatch(db,cancelled).commit()));await assertFails(summaryCancelBatch(db,cancelled).commit())
  for(const row of order.inventory)expect(cancelled.nextMaterials.find(m=>m.id===row.materialId).stock).toBe(before.find(m=>m.id===row.materialId).stock+row.take)
  expect((await getDoc(doc(db,`${GENERATION}/materials/${incoming.id}`))).data().stock).toBe(incomingStock)
})
