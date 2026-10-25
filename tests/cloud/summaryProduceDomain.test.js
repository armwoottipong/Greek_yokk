import { afterEach,expect,it,vi } from 'vitest'
import { createTestStore,material } from '../helpers/createStore.js'
import { summaryFixture,decodeSummaryMaterial } from '../firestore/summaryFixture.js'
import { summaryProduce } from '../firestore/summaryProduce.js'
const day=date=>Math.floor(Date.parse(`${date}T00:00:00Z`)/86400000)
const date=d=>d===999999?null:new Date(d*86400000).toISOString().slice(0,10)
afterEach(()=>vi.useRealTimers())
it.each([{stockQ:1000000,qtyQ:10000},{stockQ:10,qtyQ:20},{stockQ:0,qtyQ:333},{stockQ:1000000,qtyQ:10000,split:true}])('matches original batchProduce for stock=$stockQ / yield=$qtyQ',({stockQ,qtyQ,split})=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  const base=summaryFixture({prepareMaterials:materials=>{
    if(split)for(const m of materials.slice(0,2)){m.lots=[1,999999].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}
  }}),output=base.materials[12]
  output.stock=stockQ;output.lotQty[output.lotIds[0]]=stockQ
  output.productionRecipe={yieldQ:120000,inputIds:['S0','S1'],quantities:[200000,10000]}
  const originals=base.materials.map(m=>{
    const d=decodeSummaryMaterial(m)
    return material(m.id,m.stock/100,{inventoryType:m.inventoryType,unitCost:m.unitCost,packSize:m.packSize,packCost:m.packCostCents/100,lastStockInDate:date(m.lastStockInDay),expiryDate:date(m.expiryDay),
      lots:m.lotIds.map(id=>({...d.lots[id],qty:m.lotQty[id]/100,initialQty:d.lots[id].initialQtyQ/100,receiveDate:date(d.lots[id].receiveDay),expiryDate:date(d.lots[id].expiryDay)}))})
  })
  const s=createTestStore({storage:{GY_MATERIALS:originals}})
  const f=summaryProduce(base.shop,base.materials,output.id,{qtyQ,receiveDay:day('2026-10-20'),expiryDay:day('2026-10-27')})
  const requirements=f.operation.inputs.map(row=>({materialId:row.materialId,qty:row.needed/100}))
  expect(s.batchProduce(output.id,qtyQ/100,requirements,'',{receiveDate:'2026-10-20',expiryDate:'2026-10-27'},false).ok).toBe(true)
  const actual=s.materials.find(m=>m.id===output.id)
  expect(f.nextOutput.unitCost).toBe(actual.unitCost)
  expect(f.nextOutput.stock).toBe(Math.round(actual.stock*100))
  expect(f.nextOutput.lots[f.operation.lotId].unitCost).toBe(actual.lots.at(-1).unitCost)
  for(const m of f.nextInputs){
    const a=s.materials.find(row=>row.id===m.id)
    expect(m.stock).toBe(Math.round(a.stock*100))
    expect(m.lotIds.map(id=>m.lotQty[id])).toEqual(a.lots.map(l=>Math.round(l.qty*100)))
    expect(date(m.lastStockInDay)).toBe(a.lastStockInDate)
    expect(date(m.expiryDay)).toBe(a.expiryDate)
  }
})
