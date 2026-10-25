import { doc,writeBatch,serverTimestamp } from 'firebase/firestore'
import { ROOT,GENERATION } from './proofFixture.js'
import { decodeSummaryMaterial } from './summaryFixture.js'
import { sortedAllocationIds } from './setLots.js'

export function summaryCancel(shop,materials,order,{opId='SUMMARY-CANCEL',uid='cashier'}={}){
  if(order.status!=='committed')throw new Error('Order already cancelled')
  const nextMaterials=order.materialIds.map((id,i)=>{
    const before=materials.find(m=>m.id===id),m=structuredClone(before),row=order.inventory[i]
    if(!m)throw new Error('Missing original material')
    if(row.take>0){
      row.lotIds.forEach((lot,j)=>{
        if(!Object.hasOwn(m.lotQty,lot))throw new Error('Missing original lot')
        m.lotQty[lot]+=row.lotTakes[j]
      })
      m.stock+=row.take
      const flagged=m.lotIds.filter(lot=>m.lotQty[lot]>0&&(before.activeLotId===lot||before.zeroActiveIds.includes(lot)))
      if(flagged.length>1)throw new Error('Return creates multiple active positive lots')
      if(flagged.length){m.activeLotId=flagged[0];m.zeroActiveIds=m.zeroActiveIds.filter(lot=>m.lotQty[lot]===0)}
      else{
        m.activeLotId=m.lotIds.find(lot=>m.lotQty[lot]>0)||''
        m.zeroActiveIds=[]
        if(m.activeLotId){m.lastStockInDay=m.lots[m.activeLotId].receiveDay;m.expiryDay=m.lots[m.activeLotId].expiryDay}
      }
      m.allocationIds=sortedAllocationIds(decodeSummaryMaterial(m))
      if(m.allocationIds.length>4)throw new Error('Return exceeds verified live-lot bound')
      m.slotIds=m.allocationIds.concat(Array(4-m.allocationIds.length).fill('_'))
    }
    return {...m,revision:before.revision+1,lastOpId:opId,lastOpKind:'cancel',lastOpIndex:i}
  })
  const operation={schemaVersion:2,kind:'cancel',status:'committed',opId,uid,createdAt:serverTimestamp(),orderId:order.opId,
    materialIds:[...order.materialIds],sourceRevisions:order.materialIds.map(id=>materials.find(m=>m.id===id).revision),shopRevision:shop.revision+1}
  // Keep SDK Timestamp values intact; structuredClone strips their prototype.
  return {operation,nextMaterials,nextOrder:{...order,status:'cancelled',cancelOpId:opId,cancelledAt:serverTimestamp()},
    nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'cancel'}}
}
export function summaryCancelBatch(db,f,{omitMaterial,omitOperation=false,omitOrder=false,omitShop=false}={}){
  const b=writeBatch(db)
  if(!omitOperation)b.set(doc(db,`${GENERATION}/operations/${f.operation.opId}`),f.operation)
  if(!omitOrder)b.set(doc(db,`${GENERATION}/orders/${f.operation.orderId}`),f.nextOrder)
  if(!omitShop)b.set(doc(db,ROOT),f.nextShop)
  for(const m of f.nextMaterials)if(m.id!==omitMaterial)b.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
  return b
}
