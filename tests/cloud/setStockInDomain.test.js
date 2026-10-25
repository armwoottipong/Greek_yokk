import { afterEach, expect, it, vi } from 'vitest'
import { createTestStore,material } from '../helpers/createStore.js'
import { installLotMap } from '../firestore/setLots.js'
import { prepareStockMaterial,planSetStockIn } from '../firestore/setStockInFixture.js'

const day = value => value ? Math.floor(Date.parse(`${value}T00:00:00Z`)/86400000) : 999999
const date = value => value===999999 ? null : new Date(value*86400000).toISOString().slice(0,10)
afterEach(()=>{vi.useRealTimers()})

it.each([
  {},{merge:true},{packaging:true},{merge:true,unitCost:0},{merge:true,oldCost:0},{packaging:true,omitDate:true},{packaging:true,empty:true},
])('matches the existing stockIn action for $packaging / merge=$merge / cost=$unitCost',options=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-20T12:00:00Z'))
  const raw=material('X',100,{inventoryType:options.packaging?'packaging':'ingredient',unitCost:options.oldCost??0.2075})
  raw.lots[0].unitCost=raw.unitCost
  if(options.packaging)raw.lots[0].expiryDate=null
  if(options.empty){raw.stock=0;raw.lots=[]}
  const s=createTestStore({storage:{GY_MATERIALS:[raw]}})
  const original=JSON.parse(JSON.stringify(s.materials[0]))
  const m=prepareStockMaterial(installLotMap({id:original.id,revision:1,inventoryType:original.inventoryType,stock:Math.round(original.stock*100),unitCost:original.unitCost,
    packSize:original.packSize,packCostCents:Math.round(original.packCost*100),activeLotId:original.lots[0]?.id||'',
    lots:original.lots.map(l=>({id:l.id,qty:Math.round(l.qty*100),initialQtyQ:Math.round(l.initialQty*100),unitCost:l.unitCost,
      packCostCents:Math.round((l.packCost??original.packCost)*100),receiveDay:day(l.receiveDate),expiryDay:day(l.expiryDate),isInUse:l.isInUse,note:l.note||''})),
  }))
  const receiveDate=options.omitDate ? null : options.merge ? original.lots[0].receiveDate : '2026-10-20'
  const expiryDate=options.packaging ? null : original.lots[0].expiryDate
  const unitCost=options.unitCost??0.5
  const f=planSetStockIn({revision:1},m,{qtyQ:10000,unitCost,receiveDay:day(receiveDate),expiryDay:day(expiryDate),note:'test'})
  expect(s.stockIn('X',100,unitCost,'test',f.operation.packCostCents/100,{receiveDate,expiryDate},false).ok).toBe(true)
  const actual=s.materials[0]
  expect(f.next.stock).toBe(Math.round(actual.stock*100))
  expect(f.next.unitCost).toBe(actual.unitCost)
  expect(f.next.packCostCents).toBe(Math.round(actual.packCost*100))
  expect(date(f.next.lastStockInDay)).toBe(actual.lastStockInDate)
  expect(date(f.next.expiryDay)).toBe(actual.expiryDate)
  expect(f.next.lotIds.map(id=>f.next.lots[id]).map(l=>({qty:l.qty,initialQtyQ:l.initialQtyQ,unitCost:l.unitCost,isInUse:l.isInUse,note:l.note})))
    .toEqual(actual.lots.map(l=>({qty:Math.round(l.qty*100),initialQtyQ:Math.round(l.initialQty*100),unitCost:l.unitCost,isInUse:l.isInUse,note:l.note||''})))
})
