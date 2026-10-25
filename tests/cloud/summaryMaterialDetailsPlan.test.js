import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { materialRegistryShop } from '../firestore/summaryMaterialAuthor.js'
import { summaryMaterialDetails,materialDetailsSnapshot,validateMaterialDetails } from '../firestore/summaryMaterialDetails.js'

const setup=()=>{const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials);return f}
it('patches optional fields without changing stock, lots, recipes or cache revisions',()=>{
  const base=setup(),before=structuredClone(base),m=base.materials[0],details={category:'Fruit',packUnit:'กล่อง',shelfLifeDays:3.5,isSubIngredient:false}
  const f=summaryMaterialDetails(base.shop,m,details,{opId:'DETAILS',uid:'other'})
  expect(base).toEqual(before)
  expect(f.next).toEqual({...m,...details,revision:m.revision+1,lastOpId:'DETAILS',lastOpKind:'material_details',lastOpIndex:0})
  expect(f.nextShop).toEqual({...base.shop,revision:base.shop.revision+1,lastOpId:'DETAILS',lastOpKind:'material_details'})
  expect(f.operation).toMatchObject({kind:'material_details',opId:'DETAILS',uid:'other',beforeDetails:{},details})
  details.category='Mutated';expect(f.operation.details.category).toBe('Fruit')
})
it('keeps absent, null, zero, empty and false states distinct and snapshots old presence',()=>{
  const base=setup(),m={...base.materials[0],category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false}
  expect(materialDetailsSnapshot(m)).toEqual({category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false})
  const f=summaryMaterialDetails(base.shop,m,{shelfLifeDays:null})
  expect(f.operation.beforeDetails).toEqual(materialDetailsSnapshot(m));expect(f.next.shelfLifeDays).toBeNull();expect(f.next.packUnit).toBe('')
  const sparse=summaryMaterialDetails(base.shop,base.materials[0],{packUnit:null})
  expect(Object.hasOwn(sparse.next,'category')).toBe(false);expect(sparse.operation.beforeDetails).toEqual({})
})
it.each([
  {},{category:'a'.repeat(161)},{category:1},{category:{}},{packUnit:'a'.repeat(33)},{packUnit:[]},
  {shelfLifeDays:-1},{shelfLifeDays:100001},{shelfLifeDays:Infinity},{shelfLifeDays:NaN},{shelfLifeDays:'3'},
  {isSubIngredient:0},{isSubIngredient:null},{unit:'kg'},{stock:0},{unitCost:0},{inventoryType:'packaging'},{expiryDay:0},
  {hasSubRecipe:true},{subRecipe:[]},{yieldQty:1},{note:'unexpected'},
])('rejects unsupported detail patch %j',details=>{const f=setup();expect(()=>summaryMaterialDetails(f.shop,f.materials[0],details)).toThrow()})
it('accepts exact bounds without rounding or trimming',()=>{
  expect(()=>validateMaterialDetails({category:'a'.repeat(160),packUnit:'p'.repeat(32),shelfLifeDays:100000,isSubIngredient:true})).not.toThrow()
  const f=setup(),a=summaryMaterialDetails(f.shop,f.materials[0],{category:'  Dairy  ',shelfLifeDays:0.125})
  expect(a.next.category).toBe('  Dairy  ');expect(a.next.shelfLifeDays).toBe(0.125)
})
it('rejects archived/unregistered material and unchanged patches',()=>{
  const f=setup(),m=f.materials[0]
  expect(()=>summaryMaterialDetails(f.shop,{...m,deleted:true},{category:'Fruit'})).toThrow()
  expect(()=>summaryMaterialDetails({...f.shop,materialIds:[]},m,{category:'Fruit'})).toThrow()
  expect(()=>summaryMaterialDetails(f.shop,{...m,packUnit:''},{packUnit:''})).toThrow()
})
