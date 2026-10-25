import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryMaterialMetadata } from '../firestore/summaryMaterialMetadata.js'
const metadata={name:'Yogurt',emoji:'🥣',minAlertQ:100}
it('plans exactly three linked documents without mutating input or stock',()=>{
  const base=summaryFixture(),before=structuredClone(base),m=base.materials[0]
  const f=summaryMaterialMetadata(base.shop,m,metadata,{opId:'EDIT',uid:'person'})
  expect(base).toEqual(before);expect(f.next).toEqual({...m,...metadata,revision:m.revision+1,lastOpKind:'material_metadata',lastOpId:'EDIT',lastOpIndex:0})
  expect(f.nextShop.catalogRevision).toBe(base.shop.catalogRevision)
  expect(f.operation).toMatchObject({kind:'material_metadata',opId:'EDIT',uid:'person',materialId:m.id,materialRevision:m.revision,metadata})
  metadata.name='Changed';expect(f.operation.metadata.name).toBe('Yogurt');metadata.name='Yogurt'
})
it.each([
  {name:''},{name:' '.repeat(4)},{name:'a'.repeat(161)},{emoji:'a'.repeat(33)},
  {minAlertQ:-1},{minAlertQ:0.1},{minAlertQ:NaN},{minAlertQ:Infinity},{minAlertQ:1000000001},
  {stock:0},{unit:'kg'},{deleted:true},{category:'Fruit'},
])('rejects invalid or unrelated edits %j',patch=>{
  const b=summaryFixture()
  expect(()=>summaryMaterialMetadata(b.shop,b.materials[0],{...metadata,...patch})).toThrow()
})
it('rejects deleted materials and accepts exact field boundaries',()=>{
  const b=summaryFixture(),m=b.materials[0]
  expect(()=>summaryMaterialMetadata(b.shop,{...m,deleted:true},metadata)).toThrow()
  const f=summaryMaterialMetadata(b.shop,m,{name:'a'.repeat(160),emoji:'',minAlertQ:1000000000})
  expect(f.next.minAlertQ).toBe(1000000000)
})
