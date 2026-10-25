import { readFile } from 'node:fs/promises'
import { beforeAll,beforeEach,afterAll,it,expect } from 'vitest'
import { assertSucceeds,assertFails } from '@firebase/rules-unit-testing'
import { serverTimestamp,doc,getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop,summaryMaterialCreate,summaryMaterialArchive } from './summaryMaterialAuthor.js'
import { summarySwitchBatch } from './summarySwitch.js'
import { seedSetCatalog } from './setCatalogFixture.js'
import { summaryProductionRecipe } from './summaryProductionRecipe.js'
import { summaryProduce,summaryProduceBatch } from './summaryProduce.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:await readFile(new URL('./candidates/prepared.rules',import.meta.url),'utf8')})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function fixture(){
  const base=summaryFixture();base.shop=materialRegistryShop(base.shop,base.materials)
  const m=base.materials[12],opId='RECIPE',recipe={inputIds:['S0','S1'],quantities:[1000,200],yieldQ:1000}
  const f={next:{...structuredClone(m),productionRecipe:structuredClone(recipe),revision:m.revision+1,lastOpId:opId,lastOpKind:'production_recipe',lastOpIndex:0},
    nextShop:{...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'production_recipe'},
    operation:{schemaVersion:2,kind:'production_recipe',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,materialRevision:m.revision,shopRevision:base.shop.revision+1,recipe}}
  f.nextShop.productionUsers.S0=['S12'];f.nextShop.productionUsers.S1=['S12']
  return {base,f}
}
it('adds a production recipe and both reverse references without altering inventory',async()=>{
  const {base,f}=fixture(),db=env.authenticatedContext('cashier').firestore();await seed(base)
  await assertSucceeds(summarySwitchBatch(db,f).commit())
  expect((await getDoc(doc(db,ROOT))).data().productionUsers.S0).toEqual(['S12'])
  expect((await getDoc(doc(db,`${GENERATION}/materials/S12`))).data().lotQty).toEqual(base.materials[12].lotQty)
})
async function seed(base){await seedSetCatalog(env,base)}
it.each(['omitShop','omitMaterial','omitOperation'])('rejects incomplete recipe edit %s',async key=>{
  const {base,f}=fixture();await seed(base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f,{[key]:true}).commit())
})
it.each([
  ['stock',f=>{f.next.stock++}],['cost',f=>{f.next.unitCost++}],['lot quantity',f=>{f.next.lotQty.L12++}],
  ['sale cache',f=>{f.next.recipeIndex.menus.SIMPLE++}],['catalog',f=>{f.nextShop.catalogRevision++}],
  ['registry',f=>{f.nextShop.materialIds.reverse()}],['missing reference',f=>{f.nextShop.productionUsers.S0=[]}],
  ['hidden reference',f=>{f.nextShop.productionUsers.S2=['S12']}],['snapshot',f=>{f.operation.recipe.yieldQ++}],
  ['stale material',f=>{f.operation.materialRevision--}],['stale shop',f=>{f.operation.shopRevision--}],
  ['uid',f=>{f.operation.uid='other'}],
])('rejects recipe edit forgery %s',async(_,tamper)=>{
  const {base,f}=fixture();tamper(f);await seed(base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})
it.each([
  {inputIds:['S0','S0'],quantities:[1,1],yieldQ:1},{inputIds:['S12'],quantities:[1],yieldQ:1},
  {inputIds:['MISSING'],quantities:[1],yieldQ:1},{inputIds:['S11'],quantities:[1],yieldQ:1},
  {inputIds:['S0'],quantities:[0],yieldQ:1},{inputIds:['S0'],quantities:[0.5],yieldQ:1},
  {inputIds:['S0'],quantities:[1],yieldQ:0},{inputIds:['S0'],quantities:[1],yieldQ:1000000001},
  {inputIds:['S0','S1','S2'],quantities:[1,1,1],yieldQ:1},{inputIds:['S0'],quantities:[],yieldQ:1},
])('rejects coherent invalid recipe %j',async recipe=>{
  const {base,f}=fixture();f.next.productionRecipe=structuredClone(recipe);f.operation.recipe=recipe
  f.nextShop.productionUsers=structuredClone(base.shop.productionUsers)
  for(const id of recipe.inputIds)if(Object.hasOwn(f.nextShop.productionUsers,id))f.nextShop.productionUsers[id]=['S12']
  await seed(base);await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('edits, produces, rebinds all inputs and clears while retaining other output references',async()=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore()
  base.materials[10].productionRecipe={inputIds:['S0'],quantities:[1],yieldQ:1}
  base.shop=materialRegistryShop(base.shop,base.materials)
  await seed(base)
  let shop=base.shop,materials=base.materials
  async function edit(recipe,opId){
    const f=summaryProductionRecipe(shop,materials,'S12',recipe,{opId})
    await assertSucceeds(summarySwitchBatch(db,f).commit())
    shop=f.nextShop;materials=materials.map(m=>m.id==='S12'?f.next:m)
  }
  await edit({inputIds:['S0','S1'],quantities:[100,100],yieldQ:100},'ADD')
  await edit({inputIds:['S0','S1'],quantities:[200,200],yieldQ:200},'QUANTITIES')
  const stale=summaryProductionRecipe(shop,materials,'S12',{inputIds:['S2'],quantities:[1],yieldQ:1},{opId:'STALE'})
  const f=summaryProduce(shop,materials,'S12',{qtyQ:100,opId:'PRODUCE'})
  await assertSucceeds(summaryProduceBatch(db,f).commit())
  shop=f.nextShop;materials=materials.map(m=>[f.nextOutput,...f.nextInputs].find(n=>n.id===m.id)||m)
  await assertFails(summarySwitchBatch(db,stale).commit())
  const stock=materials[12].stock,cost=materials[12].unitCost
  const staleProduction=summaryProduce(shop,materials,'S12',{qtyQ:100,opId:'OLD-RECIPE',lotId:'OLD-RECIPE-LOT'})
  await edit({inputIds:['S2','S3'],quantities:[1,1000000000],yieldQ:1000000000},'REBIND')
  await assertFails(summaryProduceBatch(db,staleProduction).commit())
  expect(shop.productionUsers.S0).toEqual(['S10'])
  expect(shop.productionUsers.S1).toEqual([])
  expect(shop.productionUsers.S2).toEqual(['S12'])
  await edit({},'CLEAR')
  const saved=(await getDoc(doc(db,`${GENERATION}/materials/S12`))).data()
  expect(saved).not.toHaveProperty('productionRecipe')
  expect(saved.stock).toBe(stock);expect(saved.unitCost).toBe(cost)
  expect((await getDoc(doc(db,ROOT))).data().productionUsers).toEqual(base.shop.productionUsers)
  expect(shop.catalogRevision).toBe(base.shop.catalogRevision)
})

it.each(['anonymous','archived output','archived input','inactive generation','inactive shop','packaging output'])('rejects recipe boundary %s',async boundary=>{
  const {base,f}=fixture()
  if(boundary==='archived output')base.materials[12].deleted=true
  if(boundary==='archived input')base.materials[0].deleted=true
  if(boundary==='packaging output')base.materials[12].inventoryType='packaging'
  if(boundary==='inactive generation')base.shop.generation=f.nextShop.generation='other'
  if(boundary==='inactive shop')base.shop.status=f.nextShop.status='inactive'
  await seed(base)
  const db=(boundary==='anonymous'?env.unauthenticatedContext():env.authenticatedContext('cashier')).firestore()
  await assertFails(summarySwitchBatch(db,f).commit())
})

it('rejects clearing a recipe when another output reverse reference is removed',async()=>{
  const {base}=fixture()
  for(const i of [10,12])base.materials[i].productionRecipe={inputIds:['S0'],quantities:[1],yieldQ:1}
  base.shop=materialRegistryShop(base.shop,base.materials)
  const f=summaryProductionRecipe(base.shop,base.materials,'S12',{})
  f.nextShop.productionUsers.S0=[]
  await seed(base)
  await assertFails(summarySwitchBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('serializes competing signed-in accounts without requiring roles',async()=>{
  const {base}=fixture();await seed(base)
  const recipe={inputIds:['S0'],quantities:[1],yieldQ:1}
  const first=summaryProductionRecipe(base.shop,base.materials,'S12',recipe,{opId:'ACCOUNT-A',uid:'account-a'})
  const second=summaryProductionRecipe(base.shop,base.materials,'S10',recipe,{opId:'ACCOUNT-B',uid:'account-b'})
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('account-a').firestore(),first).commit())
  await assertFails(summarySwitchBatch(env.authenticatedContext('account-b').firestore(),second).commit())
  const materials=base.materials.map(m=>m.id==='S12'?first.next:m)
  const fresh=summaryProductionRecipe(first.nextShop,materials,'S10',recipe,{opId:'ACCOUNT-B',uid:'account-b'})
  await assertSucceeds(summarySwitchBatch(env.authenticatedContext('account-b').firestore(),fresh).commit())
})

it('blocks archiving a new raw ingredient until its production recipe reference is cleared',async()=>{
  const {base}=fixture(),db=env.authenticatedContext('cashier').firestore();await seed(base)
  const created=summaryMaterialCreate(base.shop,{id:'RAW',name:'Raw',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0})
  await assertSucceeds(summarySwitchBatch(db,created).commit())
  let materials=[...base.materials,created.next]
  const bound=summaryProductionRecipe(created.nextShop,materials,'S12',{inputIds:['RAW'],quantities:[1],yieldQ:1},{opId:'BIND'})
  await assertSucceeds(summarySwitchBatch(db,bound).commit())
  materials=materials.map(m=>m.id==='S12'?bound.next:m)
  const forged=summaryMaterialArchive(created.nextShop,created.next,true)
  forged.nextShop={...structuredClone(bound.nextShop),revision:bound.nextShop.revision+1,lastOpId:forged.operation.opId,lastOpKind:'material_archive'}
  forged.operation.shopRevision=forged.nextShop.revision
  await assertFails(summarySwitchBatch(db,forged).commit())
  const cleared=summaryProductionRecipe(bound.nextShop,materials,'S12',{}, {opId:'UNBIND'})
  await assertSucceeds(summarySwitchBatch(db,cleared).commit())
  await assertSucceeds(summarySwitchBatch(db,summaryMaterialArchive(cleared.nextShop,created.next,true)).commit())
})
