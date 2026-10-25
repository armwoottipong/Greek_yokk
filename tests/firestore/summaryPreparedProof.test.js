import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc,deleteDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { groupFixture } from './summaryGroupFixture.js'
import { multiGroupFixture } from './summaryMultiGroupFixture.js'
import { summaryMultiGroupSale } from './summaryMultiGroupSale.js'
import { summaryPreparedMenu } from './summaryPreparedMenu.js'
import { summaryCatalogBatch,summaryCatalog } from './summaryCatalog.js'
import { summaryGroup } from './summaryGroup.js'
import { summaryPreparedGroup } from './summaryPreparedGroup.js'
import { summarySaleFromLines } from './summarySale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryStock } from './summaryStock.js'
import { setStockInBatch } from './setStockInFixture.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
import { summaryCount,summaryCountBatch } from './summaryCount.js'
import { summarySwitch,summarySwitchBatch } from './summarySwitch.js'
import { summarySale } from './summarySale.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch,preparedPath,preparedProof } from './summaryPreparedSale.js'
import { ROOT,GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('prepares prices without committing inventory, then atomically sells six four-lot lines',async()=>{
  const base=groupFixture({mode:'extra',options:45,platforms:4,fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const sale=preparedSale(summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:['A0','A1','A44']})),{platformId:'P3'}))
  await seedSetCatalog(env,base);await assertSucceeds(prepareSummarySale(db,sale))
  expect((await getDoc(doc(db,ROOT))).data().revision).toBe(base.shop.revision)
  expect((await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).exists()).toBe(false)
  for(const m of base.materials)expect((await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
  await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it.each(['included','extra'])('authors eleven-unit repeating %s groups and stages all eleven choices on six lines',async mode=>{
  const base=groupFixture({mode,options:45,platforms:4,fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const g=summaryPreparedGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,allowRepeat:true,min:11,max:11})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,g).commit())
  const sale=preparedSale(summarySale(g.nextShop,g.nextMaterials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:base.shop.catalog.addonIds.slice(0,10).concat('A44')})),{platformId:'P3'}))
  await assertSucceeds(prepareSummarySale(db,sale));await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
const single=(base,options={})=>preparedSale(summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:['A0','A1','A2']})),options))
it.each([0,1,2])('denies final sale without prepared pair %i',async omitProof=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale,{omitProof})
  await assertFails(preparedSaleBatch(db,sale).commit());expect((await getDoc(doc(db,ROOT))).data().revision).toBe(base.shop.revision)
})
it.each(Array.from({length:15},(_,i)=>i))('denies final sale without material guard %i',async index=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale)
  await assertFails(preparedSaleBatch(db,sale,{omitMaterial:base.materials[index].id}).commit())
})
it.each(['omitOrder','omitShop'])('denies %s without committing prepared inventory',async key=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale)
  await assertFails(preparedSaleBatch(db,sale,{[key]:true}).commit())
})
it('requires each appended line to be individually verified',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base)
  await assertFails(setDoc(doc(db,preparedPath(sale.order.opId,0)),preparedProof(sale,0,sale.order.lines.slice(0,2))))
  await prepareSummarySale(db,sale,{firstOnly:true});await assertFails(preparedSaleBatch(db,sale).commit())
  const tampered=preparedProof(sale,0,structuredClone(sale.order.lines.slice(0,2)));tampered.lines[0].totalCents--
  await assertFails(setDoc(doc(db,preparedPath(sale.order.opId,0)),tampered))
})
it('rejects stale catalogue proofs even when receipt lines and prices are identical, then permits re-preparation',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale)
  const edited=summaryCatalog(base.shop,base.materials,c=>{c.menus.BANANA.pricesCents.P++},{opId:'OTHER-MENU'})
  await assertSucceeds(summaryCatalogBatch(db,edited).commit())
  const fresh=single({shop:edited.nextShop,materials:edited.nextMaterials});expect(fresh.order.lines).toEqual(sale.order.lines)
  await assertFails(preparedSaleBatch(db,fresh).commit())
  await assertSucceeds(prepareSummarySale(db,fresh));await assertSucceeds(preparedSaleBatch(db,fresh).commit())
})
it('requires current stock after another cashier sells but can reuse unchanged verified prices',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('new-account').firestore()
  const a=single(base,{opId:'A'}),b=single(base,{opId:'B',uid:'new-account'})
  await seedSetCatalog(env,base);await prepareSummarySale(db,a);await prepareSummarySale(other,b)
  await assertSucceeds(preparedSaleBatch(other,b).commit());await assertFails(preparedSaleBatch(db,a).commit())
  const fresh=single({shop:b.nextShop,materials:b.nextMaterials},{opId:'A'})
  expect(fresh.order.lines).toEqual(a.order.lines);await assertSucceeds(preparedSaleBatch(db,fresh).commit())
})
it('freezes proof documents after the sale commits',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale);await preparedSaleBatch(db,sale).commit()
  await assertFails(setDoc(doc(db,preparedPath(sale.order.opId,0)),preparedProof(sale,0,sale.order.lines.slice(0,1))))
  await assertFails(deleteDoc(doc(db,preparedPath(sale.order.opId,0))))
})
it('denies expanding or forging the multi-menu reverse index on a bound group',async()=>{
  const base=multiGroupFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const expanded=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,max:4})
  await assertFails(summaryCatalogBatch(db,expanded).commit())
  expanded.nextShop.catalog.groups.G.multiMenuIds=[];expanded.operation.entitySnapshot.multiMenuIds=[]
  await assertFails(summaryCatalogBatch(db,expanded).commit())
})
it.each([
  ['aggregate undercount',l=>{l.optionQuantities.A0--}],
  ['aggregate extra key',l=>{l.optionQuantities.A3=1;l.optionIds.push('A3')}],
  ['group zero',l=>{l.groupSelections.G.A1=0}],
  ['group fractional quantity',l=>{l.groupSelections.H.A0=1.5}],
  ['group sentinel',l=>{l.groupSelections.G._=1}],
  ['aggregate sentinel',l=>{l.optionQuantities._=1}],
  ['missing group',l=>{delete l.groupSelections.H}],
  ['unknown group',l=>{l.groupSelections.UNKNOWN={_:0}}],
  ['snapshot',l=>{l.groups.H.name='Forged'}],
  ['undercharge',l=>{l.totalCents-=500}],
  ['inactive snapshot',l=>{l.groups.G.active=false}],
])('rejects coherent forged multi-group %s during preparation',async(_,tamper)=>{
  const base=multiGroupFixture(),db=env.authenticatedContext('cashier').firestore()
  const original=summaryMultiGroupSale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,selections:[{groupId:'G',id:'A0'},{groupId:'G',id:'A1'},{groupId:'G',id:'A2'},{groupId:'H',id:'A0',selectionQty:3}]}])
  tamper(original.order.lines[0])
  const forged=preparedSale(summarySaleFromLines(base.shop,base.materials,original.order.lines))
  await seedSetCatalog(env,base);await assertFails(prepareSummarySale(db,forged))
})
it('denies an underselected included group despite coherent prices and stock',async()=>{
  const base=multiGroupFixture(),db=env.authenticatedContext('cashier').firestore();base.shop.catalog.groups.G.min=0
  const sale=summaryMultiGroupSale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,selections:[{groupId:'H',id:'A0'}]}])
  base.shop.catalog.groups.G.min=3;sale.nextShop.catalog.groups.G.min=3;sale.order.lines[0].groups.G.min=3
  await seedSetCatalog(env,base);await assertFails(prepareSummarySale(db,sale))
})
it('rebinds four reverse indexes in one native command',async()=>{
  const base=multiGroupFixture(),c=base.shop.catalog,db=env.authenticatedContext('cashier').firestore()
  for(const id of ['J','K']){c.groups[id]={...structuredClone(c.groups.G),id,menuIds:[],multiMenuIds:[]};c.groupIds.push(id)}
  const f=summaryPreparedMenu(base.shop,base.materials,{...c.menus.SIMPLE,groupIds:['J','K']})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,f).commit())
})
it.each(['menuIds','multiMenuIds'])('rejects a forged %s inverse binding',async key=>{
  const base=multiGroupFixture(),db=env.authenticatedContext('cashier').firestore()
  const f=summaryPreparedMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupIds:[]});f.nextShop.catalog.groups.G[key]=['SIMPLE']
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(db,f).commit())
})
it('sells mixed single/two-group lines, returns original lots once and preserves proof history',async()=>{
  const base=multiGroupFixture({fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const sale=summaryMultiGroupSale(base.shop,base.materials,[{menuId:'BANANA',qty:2,optionIds:[]},{menuId:'SIMPLE',qty:1,selections:[{groupId:'G',id:'A0'},{groupId:'G',id:'A1'},{groupId:'G',id:'A2'},{groupId:'H',id:'A0',selectionQty:3}]}])
  await seedSetCatalog(env,base);await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit())
  const stored=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const cancelled=summaryCancel(sale.nextShop,sale.nextMaterials,stored)
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit());await assertFails(summaryCancelBatch(db,cancelled).commit())
  for(const m of cancelled.nextMaterials){const before=base.materials.find(row=>row.id===m.id);expect(m.stock).toBe(before.stock);expect(m.lotQty).toEqual(before.lotQty)}
  await assertFails(deleteDoc(doc(db,preparedPath(sale.order.opId,0))))
})
it.each(['single','multi'])('commits dense %s recipes consuming all fifteen materials across all four lots',async mode=>{
  const base=mode==='single'?groupFixture({mode:'extra',options:45,platforms:4,fourLots:true}):multiGroupFixture({mode:'extra',options:45,platforms:4,fourLots:true})
  const c=base.shop.catalog,selected=mode==='single'?c.addonIds.slice(0,10).concat('A44'):['A0','A1','A2','A3','A4','A44']
  c.menus.SIMPLE.recipe=Object.fromEntries(c.summaryMaterials.map(id=>[id,40000]));c.menus.SIMPLE.materialIds=[...c.summaryMaterials]
  selected.forEach((id,i)=>{c.addons[id].recipe=Object.fromEntries(c.summaryMaterials.map(key=>[key,(i+1)*100]))})
  for(const m of base.materials){m.recipeIndex.menus.SIMPLE=40000;for(const id of selected)m.recipeIndex.addons[id]=c.addons[id].recipe[m.id];for(let i=4;i<15;i++)m.recipeIndex.quantities[i]=c.addons[c.counterIds[i]]?.recipe[m.id]||0}
  if(mode==='single'){c.groups.G.allowRepeat=true;c.groups.G.min=11;c.groups.G.max=11}
  const lines=Array.from({length:6},()=>mode==='single'?{menuId:'SIMPLE',qty:1,optionIds:selected}:{menuId:'SIMPLE',qty:1,selections:selected.map((id,i)=>({groupId:i<3?'G':'H',id}))})
  const sale=mode==='single'?preparedSale(summarySale(base.shop,base.materials,lines,{platformId:'P3'})):summaryMultiGroupSale(base.shop,base.materials,lines,{platformId:'P3'})
  expect(sale.order.inventory.every(row=>row.lotTakes.every(q=>q>0))).toBe(true)
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base);await assertSucceeds(prepareSummarySale(db,sale));await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it.each(['platform','operand keys'])('binds prepared %s to the exact final receipt',async kind=>{
  const base=groupFixture({platforms:4}),db=env.authenticatedContext('cashier').firestore(),sale=single(base)
  const different={...sale,order:{...sale.order,addonKeys:{...sale.order.addonKeys}}}
  if(kind==='platform')different.order.platformId='P1'
  else [different.order.addonKeys.A0,different.order.addonKeys.A1]=[different.order.addonKeys.A1,different.order.addonKeys.A0]
  await seedSetCatalog(env,base);await assertSucceeds(prepareSummarySale(db,different));await assertFails(preparedSaleBatch(db,sale).commit())
})
it('denies anonymous preparation and prevents another account hijacking or deleting a prepared command',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore(),other=env.authenticatedContext('other').firestore(),sale=single(base)
  await seedSetCatalog(env,base);await assertFails(prepareSummarySale(env.unauthenticatedContext().firestore(),sale))
  await assertSucceeds(prepareSummarySale(db,sale))
  const foreign=single(base,{uid:'other'})
  await assertFails(prepareSummarySale(other,foreign));await assertFails(deleteDoc(doc(other,preparedPath(sale.order.opId,0))))
  await assertFails(preparedSaleBatch(other,foreign).commit());await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it('preserves stock totals through authoring, prepared multi-group sale, receive, produce, count, cancel and lot switch',async()=>{
  const base=multiGroupFixture();base.materials[12].productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  let shop=base.shop,materials=base.materials
  const replace=rows=>{materials=materials.map(m=>rows.find(row=>row.id===m.id)||m);for(const m of materials){expect(m.stock).toBe(Object.values(m.lotQty).reduce((a,b)=>a+b,0));expect(Object.values(m.lotQty).every(q=>Number.isSafeInteger(q)&&q>=0)).toBe(true)}}
  const menu=summaryPreparedMenu(shop,materials,{...shop.catalog.menus.SIMPLE,id:'FIFTH',name:'Multi-group menu'})
  await assertSucceeds(summaryCatalogBatch(db,menu).commit());shop=menu.nextShop;replace(menu.nextMaterials)
  const group=summaryPreparedGroup(shop,materials,{...shop.catalog.groups.G,name:'Shared current group'})
  await assertSucceeds(summaryCatalogBatch(db,group).commit());shop=group.nextShop;replace(group.nextMaterials)
  const sale=summaryMultiGroupSale(shop,materials,[{menuId:'FIFTH',qty:1,selections:[{groupId:'G',id:'A0'},{groupId:'G',id:'A1'},{groupId:'G',id:'A2'},{groupId:'H',id:'A0',selectionQty:3}]}])
  await prepareSummarySale(db,sale);await assertSucceeds(preparedSaleBatch(db,sale).commit());shop=sale.nextShop;replace(sale.nextMaterials)
  const order=(await getDoc(doc(db,`${GENERATION}/orders/${sale.order.opId}`))).data()
  const received=summaryStock(shop,materials[0],{newLotId:'RECEIVED',opId:'RECEIVE'})
  await assertSucceeds(setStockInBatch(db,received).commit());shop=received.nextShop;replace([received.next])
  const produced=summaryProduce(shop,materials,'S12')
  await assertSucceeds(summaryProduceBatch(db,produced).commit());shop=produced.nextShop;replace([...produced.nextInputs,produced.nextOutput])
  const m=materials[0],id=m.lotIds[0],counted=summaryCount(shop,materials,[{materialId:m.id,counts:[{id,to:m.lotQty[id]-100}]}])
  await assertSucceeds(summaryCountBatch(db,counted).commit());shop=counted.nextShop;replace(counted.nextMaterials)
  const cancelled=summaryCancel(shop,materials,order)
  await assertSucceeds(summaryCancelBatch(db,cancelled).commit());shop=cancelled.nextShop;replace(cancelled.nextMaterials)
  const switched=summarySwitch(shop,materials[0],'RECEIVED')
  await assertSucceeds(summarySwitchBatch(db,switched).commit());replace([switched.next])
  for(const row of materials)expect((await getDoc(doc(db,`${GENERATION}/materials/${row.id}`))).data().lotQty).toEqual(row.lotQty)
})
it('unbinds, binds two groups, then prepares and sells through native menu commands',async()=>{
  const base=multiGroupFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const clear=summaryPreparedMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupIds:[]},{opId:'CLEAR'})
  await assertSucceeds(summaryCatalogBatch(db,clear).commit())
  const bound=summaryPreparedMenu(clear.nextShop,clear.nextMaterials,{...clear.nextShop.catalog.menus.SIMPLE,groupIds:['G','H']},{opId:'BIND-TWO'})
  await assertSucceeds(summaryCatalogBatch(db,bound).commit())
  const sale=summaryMultiGroupSale(bound.nextShop,bound.nextMaterials,[{menuId:'SIMPLE',qty:1,selections:[{groupId:'G',id:'A0'},{groupId:'G',id:'A1'},{groupId:'G',id:'A2'},{groupId:'H',id:'A0'}]}])
  await assertSucceeds(prepareSummarySale(db,sale));await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
it.each(['included','extra'])('prepares two %s/extra groups and commits six lines at four lots/platforms',async mode=>{
  const base=multiGroupFixture({mode,options:45,platforms:4,fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const selections=[{groupId:'G',id:'A0'},{groupId:'G',id:'A1'},{groupId:'G',id:'A2'},
    {groupId:'H',id:'A3'},{groupId:'H',id:'A4'},{groupId:'H',id:'A44'}]
  const sale=summaryMultiGroupSale(base.shop,base.materials,Array.from({length:6},(_,i)=>({menuId:'SIMPLE',qty:i+1,selections})),{platformId:'P3'})
  await seedSetCatalog(env,base);await assertSucceeds(prepareSummarySale(db,sale))
  await assertSucceeds(preparedSaleBatch(db,sale).commit())
})
