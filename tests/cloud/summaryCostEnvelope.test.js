import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
it('rejects an initial material average above the tested cost envelope',()=>{
  expect(()=>summaryFixture({prepareMaterials:materials=>{materials[0].unitCost=100000.0001}})).toThrow('Unsupported summary unit cost')
})
it('rejects an unsafe cost retained on a depleted historical lot',()=>{
  expect(()=>summaryFixture({prepareMaterials:materials=>{const m=materials[0];m.lots.push({...m.lots[0],id:'DEPLETED',qty:0,isInUse:false,unitCost:100000.0001})}})).toThrow('Unsupported summary unit cost')
})
it('preserves the initial exact unit cost boundary',()=>{
  const f=summaryFixture({prepareMaterials:materials=>{materials[0].unitCost=100000;materials[0].lots[0].unitCost=100000}})
  expect(f.materials[0].unitCost).toBe(100000)
  expect(f.materials[0].lots[f.materials[0].lotIds[0]].unitCost).toBe(100000)
})
