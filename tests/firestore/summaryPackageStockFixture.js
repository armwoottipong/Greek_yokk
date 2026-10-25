import { serverTimestamp } from 'firebase/firestore'
import { typeFixture } from './summaryMaterialTypeFixture.js'
import { decodeSummaryMaterial } from './summaryFixture.js'
import { sortedAllocationIds } from './setLots.js'

// Hand-built oracle independent of the new package receipt planner.
export function packageStockFixture(){
  const {base}=typeFixture({fourLots:true}),m=base.materials[11],lotId=m.slotIds[0],old=m.lots[lotId]
  const qtyQ=1200,unitCost=0.5,packCostCents=500,receiveDay=21000,opId='PACKAGE-RECEIPT',note='New delivery'
  const cost=((m.stock/100)*m.unitCost+(qtyQ/100)*unitCost)/((m.stock+qtyQ)/100)
  const lotCost=((m.lotQty[lotId]/100)*old.unitCost+(qtyQ/100)*unitCost)/((m.lotQty[lotId]+qtyQ)/100)
  const next={...structuredClone(m),stock:m.stock+qtyQ,unitCost:Math.round(cost*10000)/10000,packCostCents,
    lastStockInDay:receiveDay,expiryDay:999999,activeLotId:lotId,zeroActiveIds:[],
    revision:m.revision+1,lastOpId:opId,lastOpKind:'package_stock_in',lastOpIndex:0}
  next.lotQty[lotId]+=qtyQ
  next.lots[lotId]={...next.lots[lotId],initialQtyQ:old.initialQtyQ+qtyQ,unitCost:lotCost,packCostCents,receiveDay,expiryDay:999999,
    sortKey:999999*1e9+receiveDay*1000+old.ordinal,note:old.note?`${old.note}; ${note}`:note}
  next.allocationIds=sortedAllocationIds(decodeSummaryMaterial(next));next.slotIds=next.allocationIds.concat(Array(4-next.allocationIds.length).fill('_'))
  const nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'package_stock_in'}
  const operation={schemaVersion:2,kind:'package_stock_in',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),materialId:m.id,
    materialRevision:m.revision,shopRevision:nextShop.revision,qtyQ,unitCost,packCostCents,receiveDay,note,lotId,
    beforeStockQ:m.stock,beforeUnitCost:m.unitCost,beforeLotQtyQ:m.lotQty[lotId],beforeLot:structuredClone(old),
    beforeActiveLotId:m.activeLotId,beforeZeroActiveIds:[...m.zeroActiveIds]}
  return {base,f:{next,nextShop,operation}}
}
