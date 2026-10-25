import { expect,it } from 'vitest'
import { typeFixture } from '../firestore/summaryMaterialTypeFixture.js'
import { summaryMaterialType } from '../firestore/summaryMaterialType.js'

it('matches independent oracle for a protected material and preserves source',()=>{
  const {base,f:oracle}=typeFixture(),before=structuredClone(base),target=base.materials.find(m=>m.id==='S11')
  const f=summaryMaterialType(base.shop,base.materials,target.id,'ingredient',{opId:'TYPE'})
  expect(base).toEqual(before);expect(f.nextShop).toEqual(oracle.nextShop);expect(f.nextMaterials).toEqual(oracle.nextMaterials)
  expect(f.operation).toMatchObject({kind:'material_type',targetId:target.id,targetRevision:target.revision,previousType:'packaging',inventoryType:'ingredient',sourceCatalogRevision:base.shop.catalogRevision,materialIds:base.shop.catalog.summaryMaterials})
})

it('removes a now-hidden packaging row using the raw declaration when flipping ingredient to packaging',()=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S0')
  const f=summaryMaterialType(base.shop,base.materials,target.id,'packaging')
  expect(f.nextShop.catalog).toEqual(base.shop.catalog)
  const next=f.nextMaterials.find(m=>m.id==='S0')
  expect(next.recipeIndex.menus.SIMPLE).toBe(0)
})

it('revises only material state and menu recipe projections',()=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S11'),before=structuredClone(base)
  const f=summaryMaterialType(base.shop,base.materials,target.id,'ingredient')
  expect(base).toEqual(before)
  expect(f.nextShop.catalog).toEqual(base.shop.catalog)
  expect(f.nextShop.catalog.menuIds).toEqual(base.shop.catalog.menuIds)
  for(const next of f.nextMaterials){
    const old=base.materials.find(m=>m.id===next.id)
    expect(next.inventoryType).toBe(next.id===target.id?'ingredient':old.inventoryType)
    for(const key of ['stock','unitCost','lots','lotIds','lotQty','costRank','productionRecipe'])expect(next[key]).toEqual(old[key])
    expect(next.recipeIndex.addons).toEqual(old.recipeIndex.addons);expect(next.recipeIndex.quantities).toEqual(old.recipeIndex.quantities)
  }
})

it('appends an unprotected target and preserves its stale recipe index exactly',()=>{
  const {base}=typeFixture(),target={...structuredClone(base.materials[0]),id:'EXTRA',costRank:15,revision:1}
  base.materials.push(target);base.shop.materialIds.push(target.id);base.shop.productionUsers[target.id]=[]
  target.recipeIndex={catalogRevision:-1,menus:{legacy:7},addons:{old:3},quantities:[9]}
  const snapshot=structuredClone(target.recipeIndex),f=summaryMaterialType(base.shop,base.materials,target.id,'packaging')
  expect(f.nextMaterials).toHaveLength(16);expect(f.nextMaterials.slice(0,15).map(m=>m.id)).toEqual(base.shop.catalog.summaryMaterials)
  expect(f.nextMaterials[15]).toMatchObject({id:target.id,inventoryType:'packaging',revision:target.revision+1,lastOpIndex:15})
  expect(f.nextMaterials[15].recipeIndex).toEqual(snapshot)
  expect(f.operation.materialIds).toEqual(f.nextMaterials.map(m=>m.id))
})

it.each([
  ['unregistered',({shop,target})=>{shop.materialIds=shop.materialIds.filter(id=>id!==target.id)}],
  ['deleted target',({target})=>{target.deleted=true}],['unchanged type',({target})=>{}],
  ['invalid type',()=>{}],['production recipe',({target})=>{target.productionRecipe={inputIds:['S0'],quantities:[1],yieldQ:1}}],
  ['reverse users',({shop,target})=>{shop.productionUsers[target.id]=['S0']}],
  ['bad guard count',({shop})=>{shop.catalog.summaryMaterials.pop()}],['duplicate guard',({shop})=>{shop.catalog.summaryMaterials[0]=shop.catalog.summaryMaterials[1]}],
  ['missing guard',({materials,shop})=>{const i=materials.findIndex(m=>m.id===shop.catalog.summaryMaterials[0]);materials.splice(i,1)}],
  ['stale guard cache',({materials,shop})=>{materials.find(m=>m.id===shop.catalog.summaryMaterials[0]).recipeIndex.catalogRevision--}],
  ['oversize menu count',({shop})=>{shop.catalog.menuIds=Array(65).fill('SIMPLE')}],
  ['missing raw recipe',({shop})=>{delete shop.catalog.menus.SIMPLE.rawRecipe}],
  ['bad raw quantity',({shop})=>{shop.catalog.menus.SIMPLE.rawRecipe.S0=1.5}],
  ['unknown raw reference',({shop})=>{shop.catalog.menus.SIMPLE.rawRecipe.UNKNOWN=1}],
  ['inconsistent baseline',({target})=>{target.recipeIndex.menus.SIMPLE=999}],
])('rejects unsafe type change: %s',(kind,mutate)=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S11')
  mutate({shop:base.shop,materials:base.materials,target})
  const nextType=kind==='unchanged type'?'packaging':kind==='invalid type'?'produced':'ingredient'
  expect(()=>summaryMaterialType(base.shop,base.materials,target.id,nextType)).toThrow()
})

it('rejects invalid target types and preserves zero and maximum raw recipe quantities',()=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S11')
  expect(()=>summaryMaterialType(base.shop,base.materials,target.id,'other')).toThrow()
  base.shop.catalog.menus.SIMPLE.rawRecipe.S11=0
  const f=summaryMaterialType(base.shop,base.materials,target.id,'ingredient')
  expect(f.nextShop.catalog.menus.SIMPLE.recipe.S11).toBe(base.shop.catalog.menus.SIMPLE.recipe.S11)
  expect(f.nextMaterials.find(m=>m.id==='S11').recipeIndex.menus.SIMPLE).toBe(base.shop.catalog.menus.SIMPLE.rawRecipe.S11)
  const again=typeFixture(),t=again.base.materials.find(m=>m.id==='S11')
  again.base.shop.catalog.menus.SIMPLE.rawRecipe.S11=1000000000
  expect(summaryMaterialType(again.base.shop,again.base.materials,t.id,'ingredient').nextMaterials.find(m=>m.id===t.id).recipeIndex.menus.SIMPLE).toBe(1000000000)
})

it('accepts omitted or explicit zero effective rows with equivalent raw declarations',()=>{
  const {base}=typeFixture(),menu=base.shop.catalog.menus.SIMPLE,target=base.materials.find(m=>m.id==='S11')
  menu.rawRecipe.S11=0;delete menu.recipe.S11
  const absentRaw=base.shop.catalog.summaryMaterials.find(id=>!Object.hasOwn(menu.rawRecipe,id))
  menu.recipe[absentRaw]=0
  menu.recipe.S11=0
  const f=summaryMaterialType(base.shop,base.materials,target.id,'ingredient')
  expect(f.nextShop.catalog.menus.SIMPLE.recipe.S11).toBe(0)
  expect(f.nextShop.catalog.menus.SIMPLE.recipe[absentRaw]).toBe(0)
})

it('allows subsequent flips when legacy menu recipe projection differs from current cache',()=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S11')
  const first=summaryMaterialType(base.shop,base.materials,target.id,'ingredient')
  expect(first.nextShop.catalog).toEqual(base.shop.catalog)
  const second=summaryMaterialType(first.nextShop,first.nextMaterials,target.id,'packaging')
  expect(second.nextShop.catalog).toEqual(base.shop.catalog)
  const next=second.nextMaterials.find(m=>m.id===target.id)
  for(const menuId of second.nextShop.catalog.menuIds){
    const menu=second.nextShop.catalog.menus[menuId]
    expect(next.recipeIndex.menus[menuId]).toBe(menu.hasPackage?menu.rawRecipe.S11||0:0)
  }
})

it.each([
  ['unknown effective ID',menu=>{menu.recipe.UNKNOWN=0}],
  ['fractional effective quantity',menu=>{menu.recipe.S0=1.5}],
])('rejects invalid effective baseline: %s',(_label,mutate)=>{
  const {base}=typeFixture(),target=base.materials.find(m=>m.id==='S11')
  mutate(base.shop.catalog.menus.SIMPLE)
  expect(()=>summaryMaterialType(base.shop,base.materials,target.id,'ingredient')).toThrow()
})
