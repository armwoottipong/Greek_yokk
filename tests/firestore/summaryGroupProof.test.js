import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { summaryFixture } from './summaryFixture.js'
import { groupFixture } from './summaryGroupFixture.js'
import { summaryGroup } from './summaryGroup.js'
import { summarySale } from './summarySale.js'
import { summaryCatalogBatch,summaryMenu,summaryCatalog } from './summaryCatalog.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
const groupInput=()=>({id:'G',name:'Fruit choices',min:3,max:3,allowRepeat:false,pricingMode:'included',optionIds:['A0','A1','A2','A3','A4','A5'],optionPrices:{P:{A0:500,A1:0}}})
it.each([['included',1],['included',6],['extra',1],['extra',6]])('sells %s group at %i lines and four lots/four platforms',async(mode,count)=>{
  const base=groupFixture({mode,options:11,platforms:4,fourLots:true}),selected=base.shop.catalog.addonIds.slice(0,mode==='included'?3:11)
  const sale=summarySale(base.shop,base.materials,Array.from({length:count},()=>({menuId:'SIMPLE',qty:1,optionIds:selected})))
  await seedSetCatalog(env,base);await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it('creates a shared group atomically without touching quantities',async()=>{
  const base=summaryFixture(),f=summaryGroup(base.shop,base.materials,groupInput());await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.nextMaterials.every((m,i)=>m.stock===base.materials[i].stock)).toBe(true)
})
it('rejects a modified group snapshot even with zero extra prices',async()=>{
  const base=groupFixture(),sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0','A1','A2']}])
  sale.order.lines[0].group.name='Forged';await seedSetCatalog(env,base)
  await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it('rejects an underselected group with otherwise consistent prices and quantities',async()=>{
  const base=groupFixture(),g=base.shop.catalog.groups.G;g.min=0
  const sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0','A1']}]);g.min=3
  sale.order.lines[0].group.min=3;sale.nextShop.catalog.groups.G.min=3
  await seedSetCatalog(env,base);await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it('creates, binds, edits and sells the current shared group configuration',async()=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const fresh=summaryGroup(base.shop,base.materials,groupInput());await assertSucceeds(summaryCatalogBatch(db,fresh).commit())
  const bound=summaryMenu(fresh.nextShop,fresh.nextMaterials,{...fresh.nextShop.catalog.menus.SIMPLE,groupId:'G'},{opId:'BIND'})
  await assertSucceeds(summaryCatalogBatch(db,bound).commit())
  const edited=summaryGroup(bound.nextShop,bound.nextMaterials,{...bound.nextShop.catalog.groups.G,pricingMode:'extra',min:0,max:11},{opId:'CHANGE-GROUP'})
  await assertSucceeds(summaryCatalogBatch(db,edited).commit())
  const sale=summarySale(edited.nextShop,edited.nextMaterials,[{menuId:'SIMPLE',qty:2,optionIds:['A0','A1','A2']}])
  expect(sale.order.subtotalCents).toBe(15400);await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('uses current addon fallback prices after a later addon edit',async()=>{
  const base=groupFixture({mode:'extra'}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A2.pricesCents.P=900})
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:['A2']}])
  expect(sale.order.subtotalCents).toBe(7800);await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('unbinds a menu before archiving its group',async()=>{
  const base=groupFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const clear=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupId:''},{opId:'UNBIND'})
  await assertSucceeds(summaryCatalogBatch(db,clear).commit())
  const archive=summaryGroup(clear.nextShop,clear.nextMaterials,{...clear.nextShop.catalog.groups.G,active:false},{opId:'ARCHIVE'})
  await assertSucceeds(summaryCatalogBatch(db,archive).commit())
  expect(archive.nextShop.catalog.groups.G.menuIds).toEqual([])
})
it.each(Array.from({length:15},(_,i)=>i))('requires group revision guard %i',async i=>{
  const base=summaryFixture(),f=summaryGroup(base.shop,base.materials,groupInput());await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitShop:true},{omitOperation:true},{omitShapeProof:true}])('rejects incomplete group authoring %j',async omit=>{
  const base=summaryFixture(),f=summaryGroup(base.shop,base.materials,groupInput());await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['negative override',f=>{f.nextShop.catalog.groups.G.optionPrices.P.A0=-1;f.operation.entitySnapshot.optionPrices.P.A0=-1}],
  ['fractional override',f=>{f.nextShop.catalog.groups.G.optionPrices.P.A0=0.5;f.operation.entitySnapshot.optionPrices.P.A0=0.5}],
  ['excessive override',f=>{f.nextShop.catalog.groups.G.optionPrices.P.A0=1000000001;f.operation.entitySnapshot.optionPrices.P.A0=1000000001}],
  ['unknown option',f=>{f.nextShop.catalog.groups.G.optionIds.push('UNKNOWN');f.operation.entitySnapshot.optionIds.push('UNKNOWN')}],
  ['duplicate option',f=>{f.nextShop.catalog.groups.G.optionIds.push('A0');f.operation.entitySnapshot.optionIds.push('A0')}],
  ['extra price key',f=>{f.nextShop.catalog.groups.G.optionPrices.P.UNKNOWN=0;f.operation.entitySnapshot.optionPrices.P.UNKNOWN=0}],
  ['sentinel',f=>{f.nextShop.catalog.groups.G.optionPrices.P._=1;f.operation.entitySnapshot.optionPrices.P._=1}],
  ['invalid minimum',f=>{f.nextShop.catalog.groups.G.min=7;f.operation.entitySnapshot.min=7}],
  ['invalid repeat type',f=>{f.nextShop.catalog.groups.G.allowRepeat='true';f.operation.entitySnapshot.allowRepeat='true'}],
  ['source revision',f=>{f.operation.sourceCatalogRevision++}],
  ['uid',f=>{f.operation.uid='other'}],
  ['stock',f=>{f.nextMaterials[0].stock++}],
  ['addon cache',f=>{f.nextMaterials[0].recipeIndex.addons.A0++}],
  ['menu mutation',f=>{f.nextShop.catalog.menus.SIMPLE.active=false}],
  ['reverse index',f=>{f.nextShop.catalog.groups.G.menuIds=['SIMPLE'];f.operation.entitySnapshot.menuIds=['SIMPLE']}],
])('rejects forged group %s',async(_,tamper)=>{
  const base=summaryFixture(),f=summaryGroup(base.shop,base.materials,groupInput());tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects archiving a referenced group even when the planner check is bypassed',async()=>{
  const base=groupFixture(),f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,name:'Rename'})
  f.nextShop.catalog.groups.G.active=false;f.operation.entitySnapshot.active=false
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['missing reverse entry','group configuration','unrelated group'])('rejects forged menu binding: %s',async kind=>{
  const base=groupFixture();base.shop.catalog.groups.H={...structuredClone(base.shop.catalog.groups.G),id:'H',menuIds:[]};base.shop.catalog.groupIds.push('H')
  const f=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.BANANA,groupId:'G'})
  if(kind==='missing reverse entry')f.nextShop.catalog.groups.G.menuIds=['SIMPLE']
  if(kind==='group configuration')f.nextShop.catalog.groups.G.min=0
  if(kind==='unrelated group')f.nextShop.catalog.groups.H.active=false
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each(['included','extra'])('authors 45 %s choices across four platforms and sells six four-lot lines',async mode=>{
  const base=groupFixture({mode,options:45,platforms:4,fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,name:'Forty-five choices'})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const selected=mode==='included'?['A0','A1','A44']:base.shop.catalog.addonIds.slice(0,10).concat('A44')
  const sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:selected})))
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('updates a group shared by 64 menus without rewriting menu definitions',async()=>{
  const base=groupFixture(),c=base.shop.catalog
  for(const id of c.menuIds){if(id==='SIMPLE')continue;c.menus[id]={...structuredClone(c.menus.SIMPLE),id};c.groups.G.menuIds.push(id)}
  for(let i=4;i<64;i++){
    const id=`MENU${i}`;c.menuIds.push(id);c.menus[id]={...structuredClone(c.menus.SIMPLE),id};c.groups.G.menuIds.push(id)
    for(const m of base.materials)m.recipeIndex.menus[id]=c.menus[id].recipe[m.id]||0
  }
  const f=summaryGroup(base.shop,base.materials,{...c.groups.G,name:'Shared update'})
  expect(f.nextShop.catalog.menus).toEqual(c.menus)
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('allows one competing author from the same source revision',async()=>{
  const base=summaryFixture(),a=summaryGroup(base.shop,base.materials,groupInput()),b=summaryGroup(base.shop,base.materials,{...groupInput(),id:'H'},{opId:'OTHER'}),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base)
  const results=await Promise.allSettled([summaryCatalogBatch(db,a).commit(),summaryCatalogBatch(db,b).commit()])
  expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1)
})
it('allows a newly signed-in account without a role and denies anonymous writes',async()=>{
  const base=summaryFixture(),f=summaryGroup(base.shop,base.materials,groupInput(),{uid:'new-account'});await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.unauthenticatedContext().firestore(),f).commit())
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('new-account').firestore(),f).commit())
})
it('accepts the exact override price boundary without charging an included option',async()=>{
  const base=summaryFixture(),input=groupInput();input.optionPrices.P.A0=1000000000
  const f=summaryGroup(base.shop,base.materials,input);await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
function registry(size){
  const base=groupFixture(),c=base.shop.catalog
  for(let i=1;i<size;i++){const id=`G${i}`;c.groupIds.push(id);c.groups[id]={...structuredClone(c.groups.G),id,menuIds:[]}}
  return base
}
it('creates the sixty-fourth group',async()=>{
  const base=registry(63),f=summaryGroup(base.shop,base.materials,{...groupInput(),id:'LAST'});await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects a sixty-fifth group when client bounds are bypassed',async()=>{
  const base=registry(63),f=summaryGroup(base.shop,base.materials,{...groupInput(),id:'LAST'})
  for(const c of [base.shop.catalog,f.nextShop.catalog]){c.groupIds.push('EXTRA');c.groups.EXTRA={...structuredClone(c.groups.G),id:'EXTRA',menuIds:[]}}
  f.nextShop.catalog.groupIds=[...base.shop.catalog.groupIds,'LAST'];await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([0,14,15,29,30,44])('checks the fourth platform override at distributed choice position %i',async i=>{
  const base=groupFixture({options:45,platforms:4}),f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,name:'Changed'})
  const id=base.shop.catalog.groups.G.optionIds[i];f.nextShop.catalog.groups.G.optionPrices.P3[id]=-1;f.operation.entitySnapshot.optionPrices.P3[id]=-1
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rebinds a menu from one shared group to another atomically',async()=>{
  const base=groupFixture();base.shop.catalog.groups.H={...structuredClone(base.shop.catalog.groups.G),id:'H',menuIds:[]};base.shop.catalog.groupIds.push('H')
  const f=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupId:'H'})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
  expect(f.nextShop.catalog.groups.G.menuIds).toEqual([]);expect(f.nextShop.catalog.groups.H.menuIds).toEqual(['SIMPLE'])
})
it('rejects bypassing reverse bindings through a legacy catalogue menu edit',async()=>{
  const base=groupFixture(),f=summaryCatalog(base.shop,base.materials,c=>{c.menus.BANANA.pricesCents.P++}),m=f.nextShop.catalog.menus.BANANA
  m.groupId='G';m.optionIds=[];m.min=0;m.max=0;m.priceMode='addon';m.choiceMaterials={};m.materialIds=Object.keys(m.recipe);m.optionPrices={P:{_:0}}
  f.operation.entitySnapshot=structuredClone(m)
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
