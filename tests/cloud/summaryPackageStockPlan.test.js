import { expect,it } from 'vitest'
import { packageStockFixture } from '../firestore/summaryPackageStockFixture.js'
import { summaryPackageStock } from '../firestore/summaryPackageStock.js'
import { summaryStock } from '../firestore/summaryStock.js'
import { decodeSummaryMaterial } from '../firestore/summaryFixture.js'
import { sortedAllocationIds } from '../firestore/setLots.js'

it('matches the independent receipt oracle without mutating source',()=>{
  const {base,f:oracle}=packageStockFixture(),before=structuredClone(base),material=base.materials[11]
  const f=summaryPackageStock(base.shop,material,{qtyQ:1200,unitCost:0.5,packCostCents:500,receiveDay:21000,note:'New delivery',opId:'PACKAGE-RECEIPT'})
  expect(base).toEqual(before);expect(f.next).toEqual(oracle.next);expect(f.nextShop).toEqual(oracle.nextShop)
  expect(f.operation).toEqual(oracle.operation)
})

it('uses the first positive working slot even when it appears later',()=>{
  const {base}=packageStockFixture(),m=base.materials[11],first=m.slotIds[0],chosen=m.lotIds.find(id=>id!==first&&m.lotQty[id]>0)
  const firstQty=m.lotQty[first]
  m.stock-=firstQty;m.lotQty[first]=0;m.zeroActiveIds=[first];m.activeLotId=chosen
  m.allocationIds=sortedAllocationIds(decodeSummaryMaterial(m));m.slotIds=m.allocationIds.concat(Array(4-m.allocationIds.length).fill('_'))
  expect(m.slotIds[0]).toBe(first);expect(m.slotIds.indexOf(chosen)).toBeGreaterThan(0)
  const f=summaryPackageStock(base.shop,m,{qtyQ:100,unitCost:0.5})
  expect(f.operation.lotId).toBe(chosen);expect(f.next.lotQty[chosen]).toBe(m.lotQty[chosen]+100)
  expect(f.next.lotQty[first]).toBe(0)
})

it('prefers remembered allocation when sold out, then falls back to history',()=>{
  const a=packageStockFixture(),m=a.base.materials[11],remembered=m.lotIds[2]
  m.stock=0;m.activeLotId='';m.lotQty=Object.fromEntries(m.lotIds.map(id=>[id,0]));m.lotQty._=0;m.zeroActiveIds=[remembered];m.allocationIds=[remembered];m.slotIds=[remembered,'_','_','_']
  const rememberedResult=summaryPackageStock(a.base.shop,m,{qtyQ:100,unitCost:0.25})
  expect(rememberedResult.operation.lotId).toBe(remembered)
  const b=packageStockFixture(),fallback=b.base.materials[11]
  fallback.stock=0;fallback.activeLotId='';fallback.lotQty=Object.fromEntries(fallback.lotIds.map(id=>[id,0]));fallback.lotQty._=0;fallback.zeroActiveIds=[];fallback.allocationIds=[];fallback.slotIds=['_','_','_','_']
  expect(summaryPackageStock(b.base.shop,fallback,{qtyQ:100,unitCost:0.25}).operation.lotId).toBe(fallback.lotIds[0])
})

it('preserves all other lots and legacy fields while merging metadata',()=>{
  const {base}=packageStockFixture(),m=base.materials[11],before=structuredClone(m),f=summaryPackageStock(base.shop,m,{qtyQ:100,unitCost:0.25,note:'restock'})
  const chosen=f.operation.lotId
  for(const id of m.lotIds){
    if(id!==chosen)expect(f.next.lots[id]).toEqual(before.lots[id])
    else{
      expect(f.next.lots[id].qty).toBe(before.lots[id].qty)
      expect(f.next.lots[id].isInUse).toBe(before.lots[id].isInUse)
      expect(f.next.lots[id]).toMatchObject({initialQtyQ:before.lots[id].initialQtyQ+100,receiveDay:999999,expiryDay:999999,note:before.lots[id].note?`${before.lots[id].note}; restock`:'restock'})
    }
  }
  expect(f.next.lotIds).toEqual(before.lotIds);expect(f.next.stock).toBe(before.stock+100)
  expect(f.next.slotIds).toHaveLength(4);expect(f.next.allocationIds).toEqual(f.next.slotIds.filter(id=>id!=='_'))
})

it('delegates empty history to the ordinary new-lot planner',()=>{
  const {base}=packageStockFixture(),m=structuredClone(base.materials[11])
  m.stock=0;m.lotIds=[];m.allocationIds=[];m.slotIds=['_','_','_','_'];m.activeLotId='';m.lotQty={_:0};m.zeroActiveIds=[];m.lots={_:{id:'_',qty:0,isInUse:false,expiryDay:999999,receiveDay:999999,ordinal:999999}}
  const input={qtyQ:100,unitCost:0.5,receiveDay:999999,newLotId:'FIRST-LOT',businessDay:22000,lotCreatedAtISO:'2026-10-21T00:00:00.000Z'}
  expect(summaryPackageStock(base.shop,m,input)).toEqual(summaryStock(base.shop,m,{...input,expiryDay:999999}))
})

it.each([
  ['wrong material type',({m})=>{m.inventoryType='ingredient'}],['deleted material',({m})=>{m.deleted=true}],
  ['zero quantity',({p})=>{p.qtyQ=0}],['fractional quantity',({p})=>{p.qtyQ=1.5}],['unsafe quantity',({p})=>{p.qtyQ=1000000001}],
  ['over total bound',({m,p})=>{m.stock=999999900;p.qtyQ=200}],['negative cost',({p})=>{p.unitCost=-1}],
  ['cost above bound',({p})=>{p.unitCost=100000.01}],['infinite cost',({p})=>{p.unitCost=Infinity}],
  ['fractional pack cost',({p})=>{p.packCostCents=1.5}],['negative pack cost',({p})=>{p.packCostCents=-1}],
  ['pack cost above bound',({p})=>{p.packCostCents=1000000001}],['invalid day',({p})=>{p.receiveDay=100001}],
  ['invalid old cost at zero stock',({m})=>{m.stock=0;m.unitCost=100001}],
  ['fractional day',({p})=>{p.receiveDay=1.5}],['invalid expiry',({p})=>{p.expiryDay=22000}],['long note',({p})=>{p.note='n'.repeat(1001)}],
])('rejects invalid package receipt: %s',(label,mutate)=>{
  const {base}=packageStockFixture(),m=structuredClone(base.materials[11]),p={qtyQ:100,unitCost:0.5,packCostCents:50,receiveDay:21000,note:''}
  mutate({m,p});expect(()=>summaryPackageStock(base.shop,m,p)).toThrow()
})

it('accepts date and cost boundaries and preserves unrounded weighted lot cost',()=>{
  const {base}=packageStockFixture(),m=structuredClone(base.materials[11]),f=summaryPackageStock(base.shop,m,{qtyQ:1,unitCost:0,packCostCents:0,receiveDay:0,note:'n'.repeat(1000)})
  const id=f.operation.lotId,old=m.lots[id]
  expect(f.next.lots[id].unitCost).toBe((m.lotQty[id]/100*old.unitCost)/((m.lotQty[id]+1)/100))
  expect(()=>summaryPackageStock(base.shop,m,{qtyQ:100,unitCost:100000,packCostCents:1000000000,receiveDay:100000,expiryDay:999999})).not.toThrow()
})

it('retains an existing master note when the incoming note is empty',()=>{
  const {base}=packageStockFixture(),m=structuredClone(base.materials[11]),id=m.slotIds[0]
  m.lots[id].note='Original note'
  const f=summaryPackageStock(base.shop,m,{qtyQ:100,unitCost:0.5,note:''})
  expect(f.next.lots[id].note).toBe('Original note')
})

it('weights master cost from the chosen lot and preserves an actual zero lot cost',()=>{
  const {base}=packageStockFixture(),m=structuredClone(base.materials[11]),lotId=m.slotIds[0],qtyQ=200,price=0.75
  m.lots[lotId].unitCost=0
  const beforeQty=m.lotQty[lotId],f=summaryPackageStock(base.shop,m,{qtyQ,unitCost:price})
  expect(f.next.lots[lotId].unitCost).toBe((qtyQ/100*price)/((beforeQty+qtyQ)/100))
})
