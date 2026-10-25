import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { materialRegistryShop } from '../firestore/summaryMaterialAuthor.js'
import { summaryProductionRecipe } from '../firestore/summaryProductionRecipe.js'

function setup(){
  const f=summaryFixture(),materials=f.materials.slice(0,3).map(m=>({...structuredClone(m),inventoryType:'ingredient',deleted:false}))
  const shop=materialRegistryShop(f.shop,materials)
  return {materials,shop}
}
const recipe=(inputIds=['M1'],quantities=[125],yieldQ=100)=>({inputIds,quantities,yieldQ})
function named(b,i,id){return {...structuredClone(b.materials[i]),id,costRank:i}}

it('adds and rebinds recipes while maintaining only affected reverse lists',()=>{
  let b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`));b.shop=materialRegistryShop(b.shop,m)
  let p=summaryProductionRecipe(b.shop,m,'M3',recipe(['M1','M2'],[25,50],100),{opId:'ADD',uid:'u'})
  expect(p.next.productionRecipe).toEqual(recipe(['M1','M2'],[25,50],100));expect(p.nextShop.productionUsers).toEqual({M1:['M3'],M2:['M3'],M3:[]})
  const re=summaryProductionRecipe(p.nextShop,[m[0],m[1],p.next],'M3',recipe(['M2'],[75],200))
  expect(re.nextShop.productionUsers).toEqual({M1:[],M2:['M3'],M3:[]})
  expect(re.operation).toMatchObject({schemaVersion:2,kind:'production_recipe',status:'committed',materialId:'M3',materialRevision:p.next.revision,recipe:recipe(['M2'],[75],200)})
})
it('retains existing reverse membership and clears the recipe field',()=>{
  const b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`));m[2].productionRecipe=recipe(['M1'],[10],10);const shop=materialRegistryShop(b.shop,m)
  const retained=summaryProductionRecipe(shop,m,'M3',recipe(['M1'],[20],20))
  expect(retained.nextShop.productionUsers.M1).toEqual(['M3'])
  const cleared=summaryProductionRecipe(shop,m,'M3',{})
  expect(cleared.next).not.toHaveProperty('productionRecipe');expect(cleared.nextShop.productionUsers.M1).toEqual([])
})
it('preserves source, inventory, costs and unrelated shop data',()=>{
  const b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`)),shop=materialRegistryShop(b.shop,m),before=structuredClone({m,shop})
  const p=summaryProductionRecipe(shop,m,'M3',recipe())
  expect({m,shop}).toEqual(before)
  for(const k of ['stock','unitCost','packCostCents','unit','inventoryType','lots','lotIds','recipeIndex','costRank'])expect(p.next[k]).toEqual(m[2][k])
  expect(p.nextShop.materialIds).toEqual(shop.materialIds);expect(p.nextShop.catalogRevision).toBe(shop.catalogRevision)
})
it.each([
  ['empty inputs',recipe([],[],1)],['too many inputs',recipe(['M1','M2','M3'],[1,1,1],1)],['duplicate inputs',recipe(['M1','M1'],[1,1],1)],
  ['length mismatch',recipe(['M1'],[],1)],['zero quantity',recipe(['M1'],[0],1)],['fraction',recipe(['M1'],[1.5],1)],['unsafe',recipe(['M1'],[1000000001],1)],
  ['zero yield',recipe(['M1'],[1],0)],['extra key',{...recipe(),extra:true}],['self input',recipe(['M3'],[1],1)],['unregistered',recipe(['NOPE'],[1],1)],
  ['packaging input',recipe(['M1'],[1],1)],['deleted input',recipe(['M1'],[1],1)],['missing input',recipe(['M1'],[1],1)],
])('rejects malformed recipe: %s',(label,value)=>{
  const b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`));if(label==='packaging input')m[0].inventoryType='packaging'
  if(label==='deleted input')m[0].deleted=true
  const shop=materialRegistryShop(b.shop,m)
  const plannerMaterials=label==='missing input'?m.slice(1):m
  expect(()=>summaryProductionRecipe(shop,plannerMaterials,'M3',value)).toThrow()
})
it('rejects unchanged and inconsistent reverse indexes, and accepts numeric bounds',()=>{
  const b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`));m[2].productionRecipe=recipe(['M1'],[1],1);const shop=materialRegistryShop(b.shop,m)
  expect(()=>summaryProductionRecipe(shop,m,'M3',recipe(['M1'],[1],1))).toThrow()
  expect(()=>summaryProductionRecipe(shop,m,'M3',{yieldQ:1,quantities:[1],inputIds:['M1']})).toThrow()
  const broken=structuredClone(shop);broken.productionUsers.M1=[]
  expect(()=>summaryProductionRecipe(broken,m,'M3',{})).toThrow()
  const p=summaryProductionRecipe(materialRegistryShop(b.shop,m.map(x=>({...x,productionRecipe:undefined}))),m.map(x=>({...x,productionRecipe:undefined})),'M3',recipe(['M1','M2'],[1,1000000000],1000000000))
  expect(p.next.productionRecipe.yieldQ).toBe(1000000000)
})
it('requires an active registered ingredient output',()=>{
  const b=setup(),m=b.materials.map((x,i)=>named(b,i,`M${i+1}`)),shop=materialRegistryShop(b.shop,m)
  expect(()=>summaryProductionRecipe(shop,m,'absent',recipe())).toThrow()
  expect(()=>summaryProductionRecipe(shop,[m[0],m[1],{...m[2],deleted:true}],'M3',recipe())).toThrow()
  expect(()=>summaryProductionRecipe(shop,[m[0],m[1],{...m[2],inventoryType:'packaging'}],'M3',recipe())).toThrow()
})
