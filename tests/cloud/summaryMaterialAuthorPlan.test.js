import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { materialRegistryShop,summaryMaterialCreate,summaryMaterialArchive } from '../firestore/summaryMaterialAuthor.js'
const input={id:'NEW',name:'Milk',emoji:'🥛',unit:'ml',inventoryType:'ingredient',packSize:1000,minAlertQ:100}
function base(){const b=summaryFixture();b.shop=materialRegistryShop(b.shop,b.materials);return b}
it('builds exact reverse production references without mutating inputs',()=>{
  const b=summaryFixture();b.materials[0].productionRecipe={inputIds:['S1','S2'],quantities:[100,200],yieldQ:100}
  const before=structuredClone(b),shop=materialRegistryShop(b.shop,b.materials)
  expect(shop.materialIds).toEqual(b.materials.map(m=>m.id));expect(shop.productionUsers.S1).toEqual(['S0']);expect(shop.productionUsers.S2).toEqual(['S0'])
  expect(shop.productionUsers.S0).toEqual([]);expect(b).toEqual(before)
})
it.each(['duplicate','rank','dangling input','self input','duplicate input','too many'])('rejects invalid registry initialization: %s',kind=>{
  const b=summaryFixture()
  if(kind==='duplicate')b.materials.push(structuredClone(b.materials[0]))
  if(kind==='rank')b.materials[0].costRank=25
  if(kind==='dangling input')b.materials[0].productionRecipe={inputIds:['MISSING']}
  if(kind==='self input')b.materials[0].productionRecipe={inputIds:['S0']}
  if(kind==='duplicate input')b.materials[0].productionRecipe={inputIds:['S1','S1']}
  if(kind==='too many')b.materials=Array.from({length:65},(_,i)=>({...structuredClone(b.materials[0]),id:`M${i}`,costRank:i}))
  expect(()=>materialRegistryShop(b.shop,b.materials)).toThrow()
})
it('creates at zero quantity and cost, with zero coefficients and retained sale guards',()=>{
  const b=base(),before=structuredClone(b),f=summaryMaterialCreate(b.shop,input)
  expect(f.next).toMatchObject({...input,stock:0,unitCost:0,packCostCents:0,costRank:15,lotIds:[],deleted:false,revision:1})
  expect(f.next.recipeIndex.menus).toEqual({_:0,SIMPLE:0,FRUIT:0,BANANA:0,CRUNCH:0})
  expect(f.nextShop.materialIds).toEqual([...b.shop.materialIds,'NEW']);expect(f.nextShop.productionUsers.NEW).toEqual([])
  expect(f.nextShop.catalog).toEqual(b.shop.catalog);expect(b).toEqual(before)
})
it.each([{id:'_'},{id:'a/b'},{id:'a'.repeat(65)},{name:''},{unit:''},{unit:'a'.repeat(33)},{packSize:0},{packSize:1.5},{inventoryType:'produced'},{stock:10},{unitCost:2},{productionRecipe:{}},{deleted:true}])('rejects invalid creation input %j',patch=>{
  expect(()=>summaryMaterialCreate(base().shop,{...input,...patch})).toThrow()
})
it('rejects duplicate IDs and creation beyond the 64-material prototype profile',()=>{
  const b=base();expect(()=>summaryMaterialCreate(b.shop,{...input,id:'S0'})).toThrow()
  b.shop.materialIds=Array.from({length:64},(_,i)=>`M${i}`)
  expect(()=>summaryMaterialCreate(b.shop,input)).toThrow()
})
it('archives and restores without mutating stock, recipe indexes or registry',()=>{
  const b=base(),created=summaryMaterialCreate(b.shop,input),before=structuredClone(created.next)
  const a=summaryMaterialArchive(created.nextShop,created.next,true)
  expect(a.next.deleted).toBe(true);expect(a.next.lotQty).toEqual(before.lotQty);expect(a.nextShop.materialIds).toEqual(created.nextShop.materialIds)
  const r=summaryMaterialArchive(a.nextShop,a.next,false,{opId:'RESTORE'})
  expect(r.next.deleted).toBe(false);expect(created.next).toEqual(before)
})
it.each(['protected','production','menu','addon','no change'])('rejects unsafe archive: %s',kind=>{
  const b=base(),f=summaryMaterialCreate(b.shop,input),m=f.next
  if(kind==='protected')f.nextShop.catalog.summaryMaterials[0]=m.id
  if(kind==='production')f.nextShop.productionUsers[m.id]=['S0']
  if(kind==='menu')m.recipeIndex.menus.SIMPLE=1
  if(kind==='addon')m.recipeIndex.addons.A0=1
  expect(()=>summaryMaterialArchive(f.nextShop,m,kind!=='no change')).toThrow()
})
