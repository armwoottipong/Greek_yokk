import { serverTimestamp } from 'firebase/firestore'
import { decodeSummaryMaterial } from './material.js'
import { sortedAllocationIds } from './lots.js'

export function summarySwitch(shop,material,lotId,{opId='SUMMARY-SWITCH',uid='cashier'}={}){
  if(material.deleted||!material.lotIds.includes(lotId))throw new Error('Invalid selected lot')
  const active=material.lotQty[lotId]>0?lotId:material.lotIds.find(id=>material.lotQty[id]>0)||''
  const next={...structuredClone(material),activeLotId:active,zeroActiveIds:material.lotQty[lotId]===0?[lotId]:[],
    lastStockInDay:material.lots[lotId].receiveDay,expiryDay:material.lots[lotId].expiryDay,
    revision:material.revision+1,lastOpId:opId,lastOpKind:'switch_lot',lastOpIndex:0}
  next.allocationIds=sortedAllocationIds(decodeSummaryMaterial(next))
  if(next.allocationIds.length>4)throw new Error('Switch exceeds allocation bound')
  next.slotIds=next.allocationIds.concat(Array(4-next.allocationIds.length).fill('_'))
  const operation={schemaVersion:2,kind:'switch_lot',status:'committed',opId,uid,createdAt:serverTimestamp(),materialId:material.id,
    materialRevision:material.revision,lotId,shopRevision:shop.revision+1}
  return {operation,next,nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'switch_lot'}}
}
