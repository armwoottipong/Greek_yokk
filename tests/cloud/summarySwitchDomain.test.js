import { afterEach,expect,it,vi } from 'vitest'
import { createTestStore,material } from '../helpers/createStore.js'
import { summaryFixture,decodeSummaryMaterial } from '../firestore/summaryFixture.js'
import { summarySwitch } from '../firestore/summarySwitch.js'
const date=d=>d===999999?null:new Date(d*86400000).toISOString().slice(0,10)
afterEach(()=>vi.useRealTimers())
it.each([{},{zero:true},{expired:true}])('matches original switchActiveLot flags and dates %j',options=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  const base=summaryFixture({prepareMaterials:materials=>{
    const m=materials[0]
    m.lots=[options.zero?0:1000,999000].map((qty,i)=>({...m.lots[0],id:`L${i}`,qty,isInUse:i===1,receiveDay:20000+i,expiryDay:options.expired&&i===0?20001:999999}))
    m.stock=m.lots.reduce((sum,l)=>sum+l.qty,0);m.activeLotId='L1'
  }})
  const m=base.materials[0],decoded=decodeSummaryMaterial(m)
  const raw=material(m.id,m.stock/100,{unitCost:m.unitCost,lastStockInDate:date(m.lastStockInDay),expiryDate:date(m.expiryDay),
    lots:m.lotIds.map(id=>({...decoded.lots[id],qty:m.lotQty[id]/100,initialQty:decoded.lots[id].initialQtyQ/100,
      receiveDate:date(decoded.lots[id].receiveDay),expiryDate:date(decoded.lots[id].expiryDay)}))})
  const s=createTestStore({storage:{GY_MATERIALS:[raw]}})
  s.switchActiveLot(m.id,'L0',false)
  const f=summarySwitch(base.shop,m,'L0'),actual=s.materials.find(row=>row.id===m.id),next=decodeSummaryMaterial(f.next)
  expect(next.lotIds.map(id=>({qty:next.lots[id].qty,isInUse:next.lots[id].isInUse}))).toEqual(actual.lots.map(l=>({qty:Math.round(l.qty*100),isInUse:l.isInUse})))
  expect(date(next.lastStockInDay)).toBe(actual.lastStockInDate)
  expect(date(next.expiryDay)).toBe(actual.expiryDate)
})
