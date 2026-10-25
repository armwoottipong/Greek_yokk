import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { multiGroupFixture } from '../firestore/summaryMultiGroupFixture.js'
import { summaryPreparedMenu } from '../firestore/summaryPreparedMenu.js'

function setup(){
  const base=summaryFixture(),input={...structuredClone(base.shop.catalog.menus.SIMPLE),id:'FIFTH',materialIds:[],recipe:{wrong:999}}
  return {base,input}
}
it('projects raw recipe by package choice and tracks raw references including zero rows',()=>{
  const {base,input}=setup(),before=structuredClone({input,shop:base.shop,materials:base.materials}),rawRecipe={S0:250,S11:0}
  const excluded=summaryPreparedMenu(base.shop,base.materials,{...input,rawRecipe,hasPackage:false})
  const menu=excluded.nextShop.catalog.menus.FIFTH
  expect(menu.recipe).toEqual({S0:250});expect(menu.rawRecipe).toEqual(rawRecipe);expect(menu.hasPackage).toBe(false)
  expect(menu.materialIds).toEqual(expect.arrayContaining(['S0','S11']))
  expect(excluded.operation.entitySnapshot).toEqual(menu)
  expect(excluded.nextMaterials.find(m=>m.id==='S11').recipeIndex.menus.FIFTH).toBe(0)
  const included=summaryPreparedMenu(base.shop,base.materials,{...input,rawRecipe,hasPackage:true})
  expect(included.nextShop.catalog.menus.FIFTH.recipe).toEqual(rawRecipe)
  expect({input,shop:base.shop,materials:base.materials}).toEqual(before)
})

it('preserves existing behavior when paired prepared fields are absent',()=>{
  const {base,input}=setup()
  const f=summaryPreparedMenu(base.shop,base.materials,{...input,recipe:{S0:100}})
  expect(f.nextShop.catalog.menus.FIFTH.recipe).toEqual({S0:100})
  expect(f.nextShop.catalog.menus.FIFTH).not.toHaveProperty('rawRecipe')
  expect(f.nextShop.catalog.menus.FIFTH).not.toHaveProperty('hasPackage')
})

it.each([false,true])('retains two-group bindings with prepared fields present=%s',prepared=>{
  const base=multiGroupFixture(),menu={...structuredClone(base.shop.catalog.menus.SIMPLE),groupIds:['G','H']}
  if(prepared){menu.rawRecipe={S0:100};menu.hasPackage=true}
  const f=summaryPreparedMenu(base.shop,base.materials,menu)
  expect(f.nextShop.catalog.menus.SIMPLE.groupIds).toEqual(['G','H'])
  for(const group of Object.values(f.nextShop.catalog.groups)){
    expect(group.menuIds).toEqual(['SIMPLE'])
    expect(group.multiMenuIds).toEqual(['SIMPLE'])
  }
})

it('preserves retained shared group ordering instead of moving the edited menu to the end',()=>{
  const base=multiGroupFixture(),menu=structuredClone(base.shop.catalog.menus.SIMPLE)
  for(const group of Object.values(base.shop.catalog.groups)){
    group.menuIds=['BEFORE','SIMPLE','AFTER'];group.multiMenuIds=['BEFORE','SIMPLE','AFTER']
  }
  const expected=structuredClone(base.shop.catalog.groups),f=summaryPreparedMenu(base.shop,base.materials,menu)
  expect(f.nextShop.catalog.groups).toEqual(expected)
})
it('requires declared fields to remain present once an existing menu has them',()=>{
  const {base,input}=setup(),f=summaryPreparedMenu(base.shop,base.materials,{...input,rawRecipe:{S0:1},hasPackage:true})
  const menu=structuredClone(f.nextShop.catalog.menus.FIFTH);delete menu.rawRecipe;delete menu.hasPackage
  expect(()=>summaryPreparedMenu(f.nextShop,f.nextMaterials,menu)).toThrow('cannot be discarded')
})

it.each([
  ['partial rawRecipe',{rawRecipe:{S0:1}}],['partial hasPackage',{hasPackage:true}],['null rawRecipe',{rawRecipe:null,hasPackage:true}],
  ['array rawRecipe',{rawRecipe:[],hasPackage:true}],['string rawRecipe',{rawRecipe:'S0',hasPackage:true}],['unknown material',{rawRecipe:{NOPE:1},hasPackage:true}],
  ['deleted material',{rawRecipe:{S0:1},hasPackage:true,deletedId:'S0'}],['invalid material type',{rawRecipe:{S0:1},hasPackage:true,wrongTypeId:'S0'}],
  ['negative quantity',{rawRecipe:{S0:-1},hasPackage:true}],['fractional quantity',{rawRecipe:{S0:1.5},hasPackage:true}],
  ['too large quantity',{rawRecipe:{S0:1000000001},hasPackage:true}],['nonnumeric quantity',{rawRecipe:{S0:'1'},hasPackage:true}],
  ['infinite quantity',{rawRecipe:{S0:Infinity},hasPackage:true}],['NaN quantity',{rawRecipe:{S0:NaN},hasPackage:true}],
  ['invalid hasPackage',{rawRecipe:{S0:1},hasPackage:'true'}],
])('rejects malformed prepared recipe: %s',(label,patch)=>{
  const {base,input}=setup(),materials=structuredClone(base.materials)
  if(patch.deletedId)materials.find(m=>m.id===patch.deletedId).deleted=true
  if(patch.wrongTypeId)materials.find(m=>m.id===patch.wrongTypeId).inventoryType='unknown'
  const menu={...input,...patch};delete menu.deletedId;delete menu.wrongTypeId
  expect(()=>summaryPreparedMenu(base.shop,materials,menu)).toThrow()
})
