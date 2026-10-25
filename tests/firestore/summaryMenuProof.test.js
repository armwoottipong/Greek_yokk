import { lineOperands } from './summaryLineCache.js'
import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,setDoc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { seedSetCatalog,setSaleBatch } from './setCatalogFixture.js'
import { summaryMenu,summaryCatalog,summaryCatalogBatch } from './summaryCatalog.js'
import { summarySale } from './summarySale.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/summary.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
const draft=(base,id='FIFTH')=>({...structuredClone(base.shop.catalog.menus.SIMPLE),id,name:'New menu',recipe:{S0:1700,S12:5000,S13:100,S14:100}})
function fixture(options={}){const base=summaryFixture(options);return {base,f:summaryMenu(base.shop,base.materials,draft(base))}}
it('creates a fifth menu atomically',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([false,true])('sells six mixed lines after a fifth menu, four lots %j',async four=>{
  const {base,f}=fixture(four?{prepareMaterials:materials=>{for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}}}:{})
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:6},(_,i)=>({menuId:i%2?'SIMPLE':'FIFTH',qty:1,optionIds:base.shop.catalog.addonIds})))
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it('edits and archives an additional menu with increasing revisions',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const edit=summaryMenu(f.nextShop,f.nextMaterials,{...f.operation.entitySnapshot,pricesCents:{P:7200},active:false},{opId:'ARCHIVE-MENU'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  expect(edit.operation.entitySnapshot.revision).toBe(2)
  expect(()=>summarySale(edit.nextShop,edit.nextMaterials,[{menuId:'FIFTH',qty:1,optionIds:[]}])).toThrow('Invalid line')
})
it('preserves catalogue addon edits after the registry grows',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const edit=summaryCatalog(f.nextShop,f.nextMaterials,c=>{c.addons.A0.recipe.S0=250},{opId:'ADDON-AFTER-MENU'})
  await assertSucceeds(summaryCatalogBatch(db,edit).commit())
  const sale=summarySale(edit.nextShop,edit.nextMaterials,[{menuId:'FIFTH',qty:1,optionIds:['A0']}])
  expect(sale.order.inventory.find(r=>r.materialId==='S0').needed).toBe(1950)
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it.each(Array.from({length:15},(_,i)=>i))('rejects omitting menu recipe guard %i',async i=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.nextMaterials[i].id}).commit())
})
it.each([{omitOperation:true},{omitShop:true}])('rejects incomplete menu authoring %j',async omit=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,omit).commit())
})
it.each([
  ['cached recipe',f=>{f.nextMaterials[0].recipeIndex.menus.FIFTH++}],
  ['unrelated cached recipe',f=>{f.nextMaterials[0].recipeIndex.menus.SIMPLE++}],
  ['sentinel recipe',f=>{f.nextMaterials[0].recipeIndex.menus._=1}],
  ['choice material reference',f=>{f.operation.entitySnapshot.choiceMaterials.A0=['S14'];f.nextShop.catalog.menus.FIFTH.choiceMaterials.A0=['S14']}],
  ['fractional recipe',f=>{f.operation.entitySnapshot.recipe.S0=0.1;f.nextShop.catalog.menus.FIFTH.recipe.S0=0.1;f.nextMaterials[0].recipeIndex.menus.FIFTH=0.1}],
  ['unit cost',f=>{f.nextMaterials[0].unitCost++}],
  ['reserved counter',f=>{f.nextMaterials[0].recipeIndex.quantities[0]=1}],
  ['source revision',f=>{f.operation.sourceCatalogRevision++}],
  ['author',f=>{f.operation.uid='other-user'}],
  ['snapshot',f=>{f.operation.entitySnapshot.name='Unconfirmed'}],
  ['negative recipe',f=>{f.operation.entitySnapshot.recipe.S0=-1;f.nextShop.catalog.menus.FIFTH.recipe.S0=-1}],
  ['unknown ingredient',f=>{f.operation.entitySnapshot.recipe.UNKNOWN=1;f.nextShop.catalog.menus.FIFTH.recipe.UNKNOWN=1}],
  ['negative choice price',f=>{f.operation.entitySnapshot.optionPrices.P.A0=-1;f.nextShop.catalog.menus.FIFTH.optionPrices.P.A0=-1}],
  ['selection bound',f=>{f.operation.entitySnapshot.max=12;f.nextShop.catalog.menus.FIFTH.max=12}],
  ['counter reassignment',f=>{f.nextShop.catalog.counterIds[0]='FIFTH'}],
])('rejects forged menu %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects material-only replay of menu authoring',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const m=f.nextMaterials[0];await assertFails(setDoc(doc(db,`${GENERATION}/materials/${m.id}`),{...m,revision:m.revision+1}))
})
it('allows only one concurrent authoring command from the same source revision',async()=>{
  const {base,f}=fixture(),other=summaryMenu(base.shop,base.materials,draft(base,'OTHER'),{opId:'OTHER-MENU'}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const results=await Promise.allSettled([summaryCatalogBatch(db,f).commit(),summaryCatalogBatch(db,other).commit()])
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1)
  expect((await getDoc(doc(db,ROOT))).data().catalog.menuIds).toHaveLength(5)
})
function registry(size){const base=summaryFixture();for(let i=5;i<=size;i++){const id=`MENU${i}`;base.shop.catalog.menuIds.push(id);base.shop.catalog.menus[id]={...draft(base,id),revision:1}}for(const m of base.materials)m.recipeIndex.menus={_:0,...Object.fromEntries(base.shop.catalog.menuIds.map(id=>[id,base.shop.catalog.menus[id].recipe[m.id]||0]))};return base}
it('creates the sixty-fourth menu without additional document reads',async()=>{
  const base=registry(63),f=summaryMenu(base.shop,base.materials,draft(base,'MENU64'));await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('rejects a sixty-fifth menu even when the client limit is bypassed',async()=>{
  const base=registry(63),f=summaryMenu(base.shop,base.materials,draft(base,'MENU64'))
  for(const shop of [base.shop,f.nextShop]){shop.catalog.menus.EXTRA={...draft(base,'EXTRA'),revision:1};shop.catalog.menuIds.push('EXTRA')}
  f.nextShop.catalog.menuIds=[...base.shop.catalog.menuIds,'MENU64']
  for(const m of [...base.materials,...f.nextMaterials])m.recipeIndex.menus.EXTRA=base.shop.catalog.menus.EXTRA.recipe[m.id]||0
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each([1,2,3,4,5,6])('sells %i fully selected lines using the existing proof budget',async lines=>{
  const {base,f}=fixture({prepareMaterials:materials=>{for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}}})
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const sale=summarySale(f.nextShop,f.nextMaterials,Array.from({length:lines},()=>({menuId:'FIFTH',qty:1,optionIds:base.shop.catalog.addonIds})))
  await assertSucceeds(setSaleBatch(db,sale).commit())
})
it.each([1,3,6].flatMap(lines=>Array.from({length:11},(_,i)=>[lines,`A${i}`])))('rejects coherent false addon counts at %i lines for %s',async(lines,addon)=>{
  const base=summaryFixture(),db=env.authenticatedContext('cashier').firestore()
  const sale=summarySale(base.shop,base.materials,Array.from({length:lines},()=>({menuId:'SIMPLE',qty:1,optionIds:[addon]})))
  const price=base.shop.catalog.addonPrices.P[addon]
  sale.order.lines[0].optionIds=[];sale.order.lines[0].totalCents-=price
  Object.assign(sale.order,lineOperands(sale.order.lines))
  sale.order.subtotalCents-=price;sale.order.gpCents=Math.round(sale.order.subtotalCents*base.shop.catalog.platforms.P.gpBasisPoints/10000)
  sale.order.netCents=sale.order.subtotalCents-sale.order.gpCents;sale.order.grossProfitCents=sale.order.netCents-sale.order.ingredientCostCents-sale.order.packagingCostCents
  await seedSetCatalog(env,base)
  await assertFails(setSaleBatch(db,sale).commit())
})

async function zeroRecipeSale(){
  const base=summaryFixture(),menu={...draft(base),recipe:{},optionIds:[],min:0,max:0,optionPrices:{P:{_:0}}}
  const f=summaryMenu(base.shop,base.materials,menu),db=env.authenticatedContext('cashier').firestore()
  await seedSetCatalog(env,base);await assertSucceeds(summaryCatalogBatch(db,f).commit())
  return {db,sale:summarySale(f.nextShop,f.nextMaterials,[{menuId:'FIFTH',qty:1,optionIds:[]}])}
}
it('commits a legitimate zero-recipe sale without changing quantities',async()=>{
  const {db,sale}=await zeroRecipeSale()
  await assertSucceeds(setSaleBatch(db,sale).commit())
  for(const m of sale.nextMaterials)expect(m.stock).toBe(sale.materials.find(row=>row.id===m.id).stock)
})
it.each(['menu','quantity','options'].flatMap(field=>Array.from({length:6},(_,i)=>[field,i])))('rejects operand-only forgery for %s slot %i',async(field,i)=>{
  const {db,sale}=await zeroRecipeSale()
  // All financial/allocation checks still agree: only the operand binding can
  // reject these altered zero-valued operands, including every padded slot.
  if(field==='menu')sale.order.lineMenuIds[i]=i===0?'_':'FIFTH'
  else if(field==='quantity')sale.order.lineQtys[i]=i===0?2:1
  else sale.order.lineOptionQuantities[`L${i}`]={UNKNOWN:1}
  await assertFails(setSaleBatch(db,sale).commit())
})
it.each(['cashier','new-account'])('allows authenticated author %s without a role',async uid=>{
  const base=summaryFixture(),f=summaryMenu(base.shop,base.materials,draft(base),{uid})
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext(uid).firestore(),f).commit())
})
it('rejects anonymous menu authoring',async()=>{
  const {base,f}=fixture();await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.unauthenticatedContext().firestore(),f).commit())
})
