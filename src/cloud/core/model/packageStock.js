// Core v1 planner. Rules independently validate every persisted result.
import { serverTimestamp } from 'firebase/firestore'
import { decodeSummaryMaterial } from './material.js'
import { sortedAllocationIds } from './lots.js'
import { summaryStock } from './stock.js'

const clone=value=>structuredClone(value)
function weighted(qtyQ,oldCost,incomingQtyQ,incomingCost){
  if(qtyQ===0)return incomingCost
  if(oldCost===incomingCost)return oldCost
  return ((qtyQ/100)*oldCost+(incomingQtyQ/100)*incomingCost)/((qtyQ+incomingQtyQ)/100)
}

// Merge a receipt into a packaging material's canonical lot.
export function summaryPackageStock(shop,material,input={}){
  const {qtyQ,unitCost,packCostCents=Math.round(input.unitCost*material.packSize*100),receiveDay=999999,note='',opId='PACKAGE-STOCK-IN',uid='cashier',expiryDay=999999}=input
  if(!material||material.deleted||material.inventoryType!=='packaging'||!Number.isSafeInteger(qtyQ)||qtyQ<1||qtyQ>1000000000||
    !Number.isSafeInteger(material.stock)||material.stock<0||material.stock+qtyQ>1000000000||!Number.isFinite(material.unitCost)||material.unitCost<0||material.unitCost>100000||
    !Number.isFinite(unitCost)||unitCost<0||unitCost>100000||
    !Number.isInteger(packCostCents)||packCostCents<0||packCostCents>1000000000||
    !(Number.isInteger(receiveDay)&&(receiveDay===999999||receiveDay>=0&&receiveDay<=100000))||
    expiryDay!==999999||typeof note!=='string'||note.length>1000)throw new Error('Invalid package receipt')
  if(!Array.isArray(material.lotIds))throw new Error('Invalid package lot history')
  if(material.lotIds.length===0){
    return summaryStock(shop,material,{...input,expiryDay:999999})
  }
  if(!Array.isArray(material.slotIds)||material.slotIds.length!==4||!Array.isArray(material.allocationIds)||
    !material.lotQty||!material.lots||!Array.isArray(material.zeroActiveIds))throw new Error('Invalid package lot history')
  const slotLot=material.slotIds.find(id=>id!=='_'&&Number.isSafeInteger(material.lotQty[id])&&material.lotQty[id]>0)
  const lotId=slotLot||material.allocationIds[0]||material.lotIds[0]
  const beforeLot=material.lots[lotId],beforeLotQtyQ=material.lotQty[lotId]
  if(!material.lotIds.includes(lotId)||!beforeLot||!Number.isSafeInteger(beforeLotQtyQ)||beforeLotQtyQ<0||
    !Number.isSafeInteger(beforeLot.initialQtyQ)||beforeLot.initialQtyQ<0||!Number.isSafeInteger(beforeLot.initialQtyQ+qtyQ)||
    !Number.isInteger(beforeLot.ordinal)||!Number.isFinite(beforeLot.unitCost)||beforeLot.unitCost<0||beforeLot.unitCost>100000||
    !Number.isSafeInteger(material.stock+qtyQ))throw new Error('Invalid package master lot')
  const before=clone(material),next=clone(material),beforeActiveLotId=material.activeLotId,beforeZeroActiveIds=[...material.zeroActiveIds]
  const materialWeighted=weighted(material.stock,material.unitCost,qtyQ,unitCost)
  const lotWeighted=weighted(beforeLotQtyQ,beforeLot.unitCost,qtyQ,unitCost)
  if(!Number.isFinite(materialWeighted)||materialWeighted<0||materialWeighted>100000||!Number.isFinite(lotWeighted)||lotWeighted<0||lotWeighted>100000)throw new Error('Invalid weighted package cost')
  next.stock=material.stock+qtyQ;next.unitCost=Math.round(materialWeighted*10000)/10000;next.packCostCents=packCostCents
  next.lastStockInDay=receiveDay;next.expiryDay=999999;next.activeLotId=lotId;next.zeroActiveIds=[]
  next.lotQty[lotId]=beforeLotQtyQ+qtyQ
  next.lots[lotId]={...next.lots[lotId],initialQtyQ:beforeLot.initialQtyQ+qtyQ,unitCost:lotWeighted,packCostCents,receiveDay,expiryDay:999999,
    sortKey:999999*1e9+receiveDay*1000+beforeLot.ordinal,note:note?beforeLot.note?`${beforeLot.note}; ${note}`:note:beforeLot.note}
  next.allocationIds=sortedAllocationIds(decodeSummaryMaterial(next))
  if(next.allocationIds.length>4)throw new Error('Unsupported live package lot count')
  next.slotIds=next.allocationIds.concat(Array(4-next.allocationIds.length).fill('_'))
  next.revision=material.revision+1;next.lastOpId=opId;next.lastOpKind='package_stock_in';next.lastOpIndex=0
  const nextShop={...clone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'package_stock_in'}
  return {next,nextShop,operation:{schemaVersion:2,kind:'package_stock_in',status:'committed',opId,uid,createdAt:serverTimestamp(),materialId:material.id,
    materialRevision:material.revision,shopRevision:nextShop.revision,qtyQ,unitCost,packCostCents,receiveDay,note,lotId,
    beforeStockQ:before.stock,beforeUnitCost:before.unitCost,beforeLotQtyQ,beforeLot:clone(beforeLot),beforeActiveLotId,beforeZeroActiveIds}}
}
