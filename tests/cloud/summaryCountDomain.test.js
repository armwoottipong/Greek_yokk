import { afterEach,expect,it,vi } from 'vitest'
import { createTestStore,material } from '../helpers/createStore.js'
import { summaryFixture,decodeSummaryMaterial } from '../firestore/summaryFixture.js'
import { summaryCount } from '../firestore/summaryCount.js'
const date=d=>d===999999?null:new Date(d*86400000).toISOString().slice(0,10)
afterEach(()=>vi.useRealTimers())
it.each([
  {to:1100000},{to:0},{to:999900,mode:'waste',requestedQ:100},
  {to:0,mode:'waste',requestedQ:2000000},
  {to:0,split:true},{to:0,split:true,mode:'waste',requestedQ:2000},
])('matches original specific-lot count/waste %j',options=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-21T02:00:00Z'))
  const base=summaryFixture({prepareMaterials:materials=>{
    if(options.split){const m=materials[0];m.lots=[1000,1000,998000].map((qty,i)=>({...m.lots[0],id:`L${i}`,qty,isInUse:i===0,receiveDay:20000+i,expiryDay:i===1?20002:999999}));m.activeLotId='L0'}
  }})
  const m=base.materials[0],decoded=decodeSummaryMaterial(m)
  const raw=material(m.id,m.stock/100,{unitCost:m.unitCost,lastStockInDate:date(m.lastStockInDay),expiryDate:date(m.expiryDay),
    lots:m.lotIds.map(id=>({...decoded.lots[id],qty:m.lotQty[id]/100,initialQty:decoded.lots[id].initialQtyQ/100,
      receiveDate:date(decoded.lots[id].receiveDay),expiryDate:date(decoded.lots[id].expiryDay)}))})
  const store=createTestStore({storage:{GY_MATERIALS:[raw]}}),lotId=m.lotIds[0]
  const request={materialId:m.id,mode:options.mode||'count',counts:[{id:lotId,to:options.to}],requestedQ:options.requestedQ}
  const f=summaryCount(base.shop,base.materials,[request])
  const result=options.mode==='waste'?store.recordLotWaste({materialId:m.id,lotId,wasteQty:options.requestedQ/100},false):store.stockAdjust(m.id,options.to/100,'','',false,lotId)
  expect(result.ok).toBe(true)
  const actual=store.materials.find(item=>item.id===m.id),next=decodeSummaryMaterial(f.nextMaterials[0])
  expect(next.stock).toBe(Math.round(actual.stock*100))
  expect(next.lotIds.map(id=>({qty:next.lots[id].qty,isInUse:next.lots[id].isInUse}))).toEqual(actual.lots.map(l=>({qty:Math.round(l.qty*100),isInUse:l.isInUse})))
  expect(date(next.lastStockInDay)).toBe(actual.lastStockInDate)
  expect(date(next.expiryDay)).toBe(actual.expiryDate)
  if(options.mode==='waste')expect(f.operation.rows[0].lossCents).toBe(Math.round(store.activityLogs.find(log=>log.action==='waste').cost*100))
})
