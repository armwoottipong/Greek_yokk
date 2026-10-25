import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { doc,getDoc,setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { typeFixture } from './summaryMaterialTypeFixture.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryCatalogBatch } from './summaryCatalog.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryMaterialType } from './summaryMaterialType.js'
import { summarySale } from './summarySale.js'
import { preparedSale,prepareSummarySale,preparedSaleBatch } from './summaryPreparedSale.js'
import { summaryCancel,summaryCancelBatch } from './summaryCancel.js'
import { summaryCatalog } from './summaryCatalog.js'
import { materialRegistryShop,summaryMaterialCreate } from './summaryMaterialAuthor.js'
import { summarySwitchBatch } from './summarySwitch.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
it('changes type with a one-menu registry',async()=>{
  const {base,f}=typeFixture()
  for(const root of [base.shop,f.nextShop]){root.catalog.menuIds=['SIMPLE'];root.catalog.menus={SIMPLE:root.catalog.menus.SIMPLE}}
  for(const m of [...base.materials,...f.nextMaterials])m.recipeIndex.menus={_:0,SIMPLE:m.recipeIndex.menus.SIMPLE}
  await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('atomically changes material type and recomputes package-filtered recipes without altering original lots',async()=>{
  const {base,f}=typeFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S11`))).data()
  expect(saved.inventoryType).toBe('ingredient');expect(saved.lots).toEqual(base.materials[11].lots)
  expect(saved.lotQty).toEqual(base.materials[11].lotQty);expect(saved.unitCost).toBe(base.materials[11].unitCost)
  expect(saved.recipeIndex.menus.SIMPLE).toBe(base.shop.catalog.menus.SIMPLE.rawRecipe.S11)
  expect((await getDoc(doc(db,ROOT))).data().catalog).toEqual(base.shop.catalog)
})
it('changes type at 64 declared menus and four working lots',async()=>{
  const {base,f}=typeFixture({menus:64,fourLots:true});await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it('preserves reclassified caches when editing a shared addon across 64 declared menus',async()=>{
  const {base,f}=typeFixture({menus:64,fourLots:true}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const addon=summaryCatalog(f.nextShop,f.nextMaterials,c=>{c.addons.A0.pricesCents.P++},{opId:'SHARED-ADDON'})
  await assertSucceeds(summaryCatalogBatch(db,addon).commit())
  expect(addon.nextMaterials[11].recipeIndex.menus.SIMPLE).toBe(100)
})
it.each(['omitShop','omitOperation',...Array.from({length:15},(_,i)=>i)])('rejects missing type command write %s',async key=>{
  const {base,f}=typeFixture();await seedSetCatalog(env,base)
  const options=typeof key==='number'?{omitMaterial:f.nextMaterials[key].id}:{[key]:true}
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f,options).commit())
})
it.each([
  ['stock',f=>f.nextMaterials[11].stock++],['cost',f=>f.nextMaterials[11].unitCost++],
  ['lot quantity',f=>f.nextMaterials[11].lotQty.L11++],['lot identity',f=>{f.nextMaterials[11].lotIds=[]}],
  ['another type',f=>{f.nextMaterials[0].inventoryType='packaging'}],['menu price',f=>f.nextShop.catalog.menus.SIMPLE.pricesCents.P++],
  ['declared recipe',f=>f.nextShop.catalog.menus.SIMPLE.rawRecipe.S0++],['cached quantity',f=>f.nextMaterials[11].recipeIndex.menus.SIMPLE++],
  ['effective recipe',f=>f.nextShop.catalog.menus.SIMPLE.recipe.S11++],['uid',f=>{f.operation.uid='other'}],
  ['snapshot type',f=>{f.operation.inventoryType='unknown'}],['old material',f=>f.operation.targetRevision--],
  ['old catalog',f=>f.operation.sourceCatalogRevision--],['old shop',f=>f.operation.shopRevision--],
  ['registry',f=>f.nextShop.materialIds.reverse()],['production references',f=>{f.nextShop.productionUsers.S0=['S11']}],
])('rejects coherent type forgery %s',async(_,mutate)=>{
  const {base,f}=typeFixture();mutate(f);await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('sells through both type directions, edits a price after a flip, and returns older receipts to original lots',async()=>{
  const {base}=typeFixture(),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  let shop=base.shop,materials=base.materials
  const replace=rows=>{materials=materials.map(m=>rows.find(n=>n.id===m.id)||m)}
  const line=[{menuId:'SIMPLE',qty:1,optionIds:[]}]
  const old=preparedSale(summarySale(shop,materials,line,{opId:'OLD'}))
  await prepareSummarySale(db,old);await assertSucceeds(preparedSaleBatch(db,old).commit());shop=old.nextShop;replace(old.nextMaterials)
  const oldReceipt=(await getDoc(doc(db,`${GENERATION}/orders/OLD`))).data()
  const stale=preparedSale(summarySale(shop,materials,line,{opId:'AFTER'}));await prepareSummarySale(db,stale)
  const first=summaryMaterialType(shop,materials,'S11','ingredient',{opId:'INGREDIENT'})
  await assertSucceeds(summaryCatalogBatch(db,first).commit());shop=first.nextShop;replace(first.nextMaterials)
  await assertFails(preparedSaleBatch(db,stale).commit())
  const menu=summaryCatalog(shop,materials,c=>{c.menus.SIMPLE.pricesCents.P++},{opId:'PRICE'})
  await assertSucceeds(summaryCatalogBatch(db,menu).commit());shop=menu.nextShop;replace(menu.nextMaterials)
  const addon=summaryCatalog(shop,materials,c=>{c.addons.A0.pricesCents.P++},{opId:'ADDON-PRICE'})
  await assertSucceeds(summaryCatalogBatch(db,addon).commit());shop=addon.nextShop;replace(addon.nextMaterials)
  const fresh=preparedSale(summarySale(shop,materials,line,{opId:'AFTER'}))
  expect(fresh.order.inventory.find(row=>row.materialId==='S11').needed).toBe(100)
  expect(old.order.inventory.find(row=>row.materialId==='S11').needed).toBe(0)
  await assertFails(preparedSaleBatch(db,fresh).commit())
  await prepareSummarySale(db,fresh);await assertSucceeds(preparedSaleBatch(db,fresh).commit());shop=fresh.nextShop;replace(fresh.nextMaterials)
  const newReceipt=(await getDoc(doc(db,`${GENERATION}/orders/AFTER`))).data()
  const back=summaryMaterialType(shop,materials,'S11','packaging',{opId:'PACKAGING'})
  await assertSucceeds(summaryCatalogBatch(db,back).commit());shop=back.nextShop;replace(back.nextMaterials)
  for(const [i,receipt] of [oldReceipt,newReceipt].entries()){
    const returned=summaryCancel(shop,materials,receipt,{opId:`RETURN-${i}`})
    await assertSucceeds(summaryCancelBatch(db,returned).commit());await assertFails(summaryCancelBatch(db,returned).commit());shop=returned.nextShop;replace(returned.nextMaterials)
  }
  for(const m of base.materials){
    const saved=(await getDoc(doc(db,`${GENERATION}/materials/${m.id}`))).data()
    expect(saved.lotQty).toEqual(m.lotQty);expect(saved.lots).toEqual(m.lots);expect(saved.inventoryType).toBe(m.inventoryType)
  }
})

it('changes a registered outside material with a sixteenth mandatory leaf and preserves its stale cache',async()=>{
  const {base}=typeFixture({menus:64}),db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const created=summaryMaterialCreate(base.shop,{id:'NEW',name:'Outside',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0})
  await assertSucceeds(summarySwitchBatch(db,created).commit())
  const materials=[...base.materials,created.next],f=summaryMaterialType(created.nextShop,materials,'NEW','packaging')
  await assertFails(summaryCatalogBatch(db,f,{omitMaterial:'NEW'}).commit())
  await assertSucceeds(summaryCatalogBatch(db,f).commit())
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/NEW`))).data()
  expect(saved.recipeIndex).toEqual(created.next.recipeIndex)
  expect(saved.inventoryType).toBe('packaging');expect(f.nextMaterials).toHaveLength(16)
  await assertFails(setDoc(doc(db,`${GENERATION}/materials/NEW`),{...saved,revision:saved.revision+1}))
})

it.each([0,14,15,45,59,60,63])('binds all declared recipe positions including index %i',async index=>{
  const {base}=typeFixture({menus:64}),f=summaryMaterialType(base.shop,base.materials,'S11','ingredient')
  f.nextMaterials[11].recipeIndex.menus[base.shop.catalog.menuIds[index]]++
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it.each(['anonymous','archived','inactive generation','inactive shop','unregistered','missing declaration','missing package flag'])('rejects type boundary %s',async boundary=>{
  const {base,f}=typeFixture()
  if(boundary==='archived')base.materials[11].deleted=f.nextMaterials[11].deleted=true
  if(boundary==='inactive generation')base.shop.generation=f.nextShop.generation='other'
  if(boundary==='inactive shop')base.shop.status=f.nextShop.status='inactive'
  if(boundary==='unregistered')base.shop.materialIds=f.nextShop.materialIds=base.shop.materialIds.filter(id=>id!=='S11')
  if(boundary==='missing declaration')for(const root of [base.shop,f.nextShop])delete root.catalog.menus.SIMPLE.rawRecipe
  if(boundary==='missing package flag')for(const root of [base.shop,f.nextShop])delete root.catalog.menus.SIMPLE.hasPackage
  await seedSetCatalog(env,base)
  const db=(boundary==='anonymous'?env.unauthenticatedContext():env.authenticatedContext('cashier')).firestore()
  await assertFails(summaryCatalogBatch(db,f).commit())
})

it.each(['output','input'])('requires production %s bindings to be cleared before reclassification',async kind=>{
  const {base}=typeFixture(),targetId=kind==='output'?'S12':'S0',f=summaryMaterialType(base.shop,base.materials,targetId,'packaging')
  base.materials[12].productionRecipe={inputIds:['S0'],quantities:[100],yieldQ:100}
  f.nextMaterials[12].productionRecipe=structuredClone(base.materials[12].productionRecipe)
  base.shop=materialRegistryShop(base.shop,base.materials);f.nextShop.productionUsers=structuredClone(base.shop.productionUsers)
  await seedSetCatalog(env,base)
  await assertFails(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('serializes competing accounts while preserving the other material type after replanning',async()=>{
  const {base}=typeFixture();await seedSetCatalog(env,base)
  const first=summaryMaterialType(base.shop,base.materials,'S11','ingredient',{opId:'FIRST'})
  const stale=summaryMaterialType(base.shop,base.materials,'S0','packaging',{opId:'SECOND',uid:'other'})
  await assertSucceeds(summaryCatalogBatch(env.authenticatedContext('cashier').firestore(),first).commit())
  await assertFails(summaryCatalogBatch(env.authenticatedContext('other').firestore(),stale).commit())
  const fresh=summaryMaterialType(first.nextShop,first.nextMaterials,'S0','packaging',{opId:'SECOND',uid:'other'})
  const db=env.authenticatedContext('other').firestore();await assertSucceeds(summaryCatalogBatch(db,fresh).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/S11`))).data().inventoryType).toBe('ingredient')
  expect((await getDoc(doc(db,`${GENERATION}/materials/S0`))).data().inventoryType).toBe('packaging')
})

it('preserves dated lot provenance and blocks expired ingredient consumption after reclassification',async()=>{
  const {base}=typeFixture(),m=base.materials[11],lot=m.lots.L11
  lot.receiveDay=19000;lot.expiryDay=19001;lot.sortKey=19001*1e9+19000*1000+lot.ordinal
  m.lastStockInDay=19000;m.expiryDay=19001
  const db=env.authenticatedContext('cashier').firestore();await seedSetCatalog(env,base)
  const type=summaryMaterialType(base.shop,base.materials,'S11','ingredient')
  await assertSucceeds(summaryCatalogBatch(db,type).commit())
  expect((await getDoc(doc(db,`${GENERATION}/materials/S11`))).data().lots.L11.expiryDay).toBe(19001)
  expect(()=>summarySale(type.nextShop,type.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:[]}])).toThrow('Invalid ingredient allocation')
})
