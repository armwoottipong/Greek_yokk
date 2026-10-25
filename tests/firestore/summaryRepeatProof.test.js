import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { groupFixture } from './summaryGroupFixture.js'
import { summaryGroup } from './summaryGroup.js'
import { summarySale } from './summarySale.js'
import { summaryCatalogBatch } from './summaryCatalog.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { GENERATION } from './proofFixture.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it.each(['included','extra'])('authors and sells repeating %s groups at six lines, four lots and four platforms',async mode=>{
  const base=groupFixture({mode,options:45,platforms:4,fourLots:true}),db=env.authenticatedContext('cashier').firestore()
  const f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,allowRepeat:true,min:0,max:3})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const selected=['A0','A0','A44']
  const sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:2,optionIds:selected})),{platformId:'P3'})
  expect(sale.order.addonCounts.A0).toBe(24)
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('allows three selections from a single available option',async()=>{
  const base=groupFixture({mode:'extra'}),db=env.authenticatedContext('cashier').firestore()
  const f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,allowRepeat:true,min:3,max:3,optionIds:['A0'],optionPrices:{P:{A0:500}}})
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:Array(3).fill('A0')}])
  expect(sale.order.subtotalCents).toBe(8400)
  expect(sale.order.lines[0].optionIds).toEqual(['A0'])
  expect(sale.order.lines[0].optionQuantities).toEqual({_:0,A0:3})
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it.each([
  [['A0','A1','A44']],
  [['A0','A0','A44']],
])('sells the three-selection boundary with choices %j',async selected=>{
  const base=groupFixture({mode:'extra',options:45,platforms:4,fourLots:true});base.shop.catalog.groups.G.allowRepeat=true;base.shop.catalog.groups.G.max=3
  const sale=summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:3,optionIds:selected})),{platformId:'P3'})
  await seedSetCatalog(env,base);await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it('rejects authoring a repeat maximum above the proved three-selection profile',async()=>{
  const base=groupFixture(),f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,allowRepeat:true,max:3})
  f.nextShop.catalog.groups.G.max=4;f.operation.entitySnapshot.max=4
  await seedSetCatalog(env,base);await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('sells different repeating selections across six lines using all fifteen four-lot materials',async()=>{
  const base=groupFixture({mode:'extra',options:45,platforms:4,fourLots:true}),c=base.shop.catalog
  c.groups.G.allowRepeat=true;c.groups.G.max=3
  c.menus.SIMPLE.recipe=Object.fromEntries(c.summaryMaterials.map(id=>[id,100]));c.menus.SIMPLE.materialIds=[...c.summaryMaterials]
  c.addons.A0.recipe=Object.fromEntries(c.summaryMaterials.map(id=>[id,100]))
  for(const m of base.materials){m.recipeIndex.menus.SIMPLE=100;m.recipeIndex.addons.A0=100;m.recipeIndex.quantities[4]=100}
  const choices=[['A0','A0','A0'],['A0','A1','A44'],['A44','A44','A0']]
  const sale=summarySale(base.shop,base.materials,Array.from({length:6},(_,i)=>({menuId:'SIMPLE',qty:i+1,optionIds:choices[i%3],note:`Line ${i}`})),{platformId:'P3'})
  expect(sale.order.inventory.every(row=>row.needed>0)).toBe(true)
  await seedSetCatalog(env,base);await assertSucceeds(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it('cannot append a missing line witness to a historical receipt',async()=>{
  const base=groupFixture(),sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0','A1','A2']}])
  await seedSetCatalog(env,base)
  await env.withSecurityRulesDisabled(context=>setDoc(doc(context.firestore(),`${GENERATION}/orders/${sale.order.opId}`),sale.order))
  await assertFails(setDoc(doc(env.authenticatedContext('cashier').firestore(),`${GENERATION}/orders/${sale.order.opId}/lineProofs/0`),{opId:sale.order.opId,index:0}))
})
it.each(Array.from({length:11},(_,i)=>i))('rejects forged repeated counter %i',async i=>{
  const base=groupFixture({mode:'extra',options:11,fourLots:true});base.shop.catalog.groups.G.allowRepeat=true;base.shop.catalog.groups.G.max=3
  const sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:2,optionIds:['A0','A0','A2']}])
  sale.order.addonCounts[`A${i}`]++
  await seedSetCatalog(env,base);await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it.each([
  ['nonrepeat',(_s,b)=>{b.shop.catalog.groups.G.allowRepeat=false;_s.nextShop.catalog.groups.G.allowRepeat=false;_s.order.lines[0].group.allowRepeat=false}],
  ['quantity operand',s=>{s.order.lineOptionQuantities.L0.A0=1}],
  ['quantity padding',s=>{s.order.lineOptionQuantities.L5={A0:1}}],
  ['unknown quantity',s=>{s.order.lines[0].optionQuantities.UNKNOWN=1;s.order.lineOptionQuantities.L0.UNKNOWN=1}],
  ['zero quantity',s=>{s.order.lines[0].optionQuantities.A0=0;s.order.lineOptionQuantities.L0.A0=0}],
  ['fractional quantity',s=>{s.order.lines[0].optionQuantities.A0=1.5;s.order.lineOptionQuantities.L0.A0=1.5}],
  ['negative quantity',s=>{s.order.lines[0].optionQuantities.A0=-1;s.order.lineOptionQuantities.L0.A0=-1}],
  ['string quantity',s=>{s.order.lines[0].optionQuantities.A0='2';s.order.lineOptionQuantities.L0.A0='2'}],
  ['over maximum',s=>{s.order.lines[0].optionQuantities.A0=12;s.order.lineOptionQuantities.L0.A0=12}],
  ['missing quantity',s=>{delete s.order.lines[0].optionQuantities.A0;delete s.order.lineOptionQuantities.L0.A0}],
  ['duplicate option ID',s=>{s.order.lines[0].optionIds.push('A0')}],
  ['snapshot',s=>{s.order.lines[0].group.allowRepeat=false}],
  ['undercharge',(s,b)=>{s.order.lines[0].totalCents-=500;s.order.subtotalCents-=500;s.order.gpCents=Math.round(s.order.subtotalCents*b.shop.catalog.platforms.P.gpBasisPoints/10000);s.order.netCents=s.order.subtotalCents-s.order.gpCents;s.order.grossProfitCents=s.order.netCents-s.order.ingredientCostCents-s.order.packagingCostCents}],
])('rejects forged repeating sale %s',async(_,tamper)=>{
  const base=groupFixture({mode:'extra'});base.shop.catalog.groups.G.allowRepeat=true;base.shop.catalog.groups.G.max=3
  const sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0','A0','A2']}]);tamper(sale,base)
  await seedSetCatalog(env,base);await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale).commit())
})
it.each([0,1,2])('requires line proof %i even for repeated choices',async omitLine=>{
  const base=groupFixture({mode:'extra'});base.shop.catalog.groups.G.allowRepeat=true;base.shop.catalog.groups.G.max=3
  const sale=summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:['A0','A0']})))
  await seedSetCatalog(env,base);await assertFails(setSaleBatch(env.authenticatedContext('cashier').firestore(),sale,{omitLine}).commit())
})
