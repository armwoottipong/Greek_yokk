import { it,expect } from 'vitest'
import { enrolFixture } from '../firestore/summaryMaterialEnrolFixture.js'
import { summaryMaterialEnrol } from '../firestore/summaryMaterialEnrol.js'
it('plans one exact replacement and preserves quantities, global ranks and removed history',()=>{
  const {base,f:oracle}=enrolFixture(),before=structuredClone(base),f=summaryMaterialEnrol(base.shop,base.materials,'S0','NEW',{opId:'ENROL'})
  expect(base).toEqual(before);expect(f.nextShop).toEqual(oracle.nextShop);expect(f.nextMaterials).toEqual(oracle.nextMaterials)
  expect(f.operation).toMatchObject({kind:'material_enrol',addedId:'NEW',removedId:'S0',removedRevision:base.materials[0].revision,materialIds:f.nextShop.catalog.summaryMaterials})
  expect(f.nextMaterials.map(m=>m.costRank)).toEqual(Array.from({length:15},(_,i)=>i+1))
})
it.each(['old reference','zero reference','addon reference','incoming reference','stale cache','deleted incoming','already protected','unregistered','missing guard','bad dimension'])('rejects unsafe replacement: %s',kind=>{
  const {base}=enrolFixture();let added='NEW'
  if(kind==='old reference')base.shop.catalog.menus.SIMPLE.recipe.S0=1
  if(kind==='zero reference')base.shop.catalog.menus.SIMPLE.materialIds.push('S0')
  if(kind==='addon reference')base.shop.catalog.addons.A0.recipe.S0=0
  if(kind==='incoming reference')base.shop.catalog.addons.A0.recipe.NEW=1
  if(kind==='stale cache')base.materials[0].recipeIndex.catalogRevision--
  if(kind==='deleted incoming')base.materials.at(-1).deleted=true
  if(kind==='already protected')added='S1'
  if(kind==='unregistered')base.shop.materialIds.pop()
  if(kind==='missing guard')base.materials=base.materials.filter(m=>m.id!=='S1')
  if(kind==='bad dimension')base.shop.catalog.menuIds=Array(65).fill('SIMPLE')
  expect(()=>summaryMaterialEnrol(base.shop,base.materials,'S0',added)).toThrow()
})
it('rebuilds an incoming stale zero cache using current menu and addon keys',()=>{
  const {base}=enrolFixture(),incoming=base.materials.at(-1);incoming.recipeIndex.catalogRevision=0;incoming.recipeIndex.menus={_:0}
  const f=summaryMaterialEnrol(base.shop,base.materials,'S0','NEW')
  expect(Object.keys(f.nextMaterials.at(-1).recipeIndex.menus)).toEqual(['_',...base.shop.catalog.menuIds])
  expect(f.nextMaterials.at(-1).recipeIndex.catalogRevision).toBe(base.shop.catalogRevision+1)
})
