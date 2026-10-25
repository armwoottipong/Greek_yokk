import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { materialRegistryShop } from '../firestore/summaryMaterialAuthor.js'
import { summaryMaterialMeasure } from '../firestore/summaryMaterialMeasure.js'

function setup(){
  const f=summaryFixture(),materials=f.materials.slice(0,3).map((m,i)=>({...structuredClone(m),costRank:i,deleted:false}))
  return {materials,shop:materialRegistryShop(f.shop,materials)}
}
const measure={unit:'kg',packSize:250,unitCost:12.3456789,packCostCents:3086}

it('plans only measurement fields and linked revisions without mutating inputs',()=>{
  const b=setup(),m=b.materials[0],before=structuredClone({m,shop:b.shop})
  const f=summaryMaterialMeasure(b.shop,m,measure,{opId:'MEASURE',uid:'person'})
  expect({m,shop:b.shop}).toEqual(before)
  expect(f.next).toEqual({...m,...measure,revision:m.revision+1,lastOpId:'MEASURE',lastOpKind:'material_measure',lastOpIndex:0})
  expect(f.nextShop).toEqual({...b.shop,revision:b.shop.revision+1,lastOpId:'MEASURE',lastOpKind:'material_measure'})
  expect(f.operation).toMatchObject({schemaVersion:2,kind:'material_measure',status:'committed',opId:'MEASURE',uid:'person',materialId:m.id,materialRevision:m.revision,shopRevision:b.shop.revision+1,measure})
  expect(f.operation.measure.unitCost).toBe(measure.unitCost)
})

it('preserves inventory, recipe, catalog, rank and production references',()=>{
  const b=setup(),m={...b.materials[2],productionRecipe:{inputIds:[b.materials[0].id],quantities:[5],yieldQ:10}}
  b.shop=materialRegistryShop(b.shop,[b.materials[0],b.materials[1],m])
  const f=summaryMaterialMeasure(b.shop,m,measure)
  for(const key of ['inventoryType','stock','lots','lotIds','lotQty','allocationIds','recipeIndex','costRank','productionRecipe'])expect(f.next[key]).toEqual(m[key])
  expect(f.nextShop.materialIds).toEqual(b.shop.materialIds)
  expect(f.nextShop.productionUsers).toEqual(b.shop.productionUsers)
  expect(f.nextShop.catalogRevision).toBe(b.shop.catalogRevision)
})

it.each([
  [{unit:''}],[{unit:'   '}],[{unit:'a'.repeat(33)}],[{unit:1}],[{packSize:0}],[{packSize:1.5}],[{packSize:10000001}],
  [{unitCost:-1}],[{unitCost:100001}],[{unitCost:Infinity}],[{unitCost:NaN}],[{packCostCents:-1}],[{packCostCents:1.5}],[{packCostCents:1000000001}],
  [{stock:10}],[{inventoryType:'packaging'}],[{category:'Fruit'}],
])('rejects invalid or unrelated measurement edits %j',patch=>{
  const b=setup()
  expect(()=>summaryMaterialMeasure(b.shop,b.materials[0],{...measure,...patch})).toThrow()
})

it('requires an active registered material and accepts exact boundaries',()=>{
  const b=setup(),m=b.materials[0]
  expect(()=>summaryMaterialMeasure(b.shop,{...m,deleted:true},measure)).toThrow()
  expect(()=>summaryMaterialMeasure(b.shop,m.id,measure)).toThrow()
  const missingShop={...b.shop,materialIds:b.shop.materialIds.filter(id=>id!==m.id)}
  expect(()=>summaryMaterialMeasure(missingShop,m,measure)).toThrow()
  const f=summaryMaterialMeasure(b.shop,m,{unit:'a'.repeat(32),packSize:10000000,unitCost:100000,packCostCents:1000000000})
  expect(f.next).toMatchObject({unit:'a'.repeat(32),packSize:10000000,unitCost:100000,packCostCents:1000000000})
})
