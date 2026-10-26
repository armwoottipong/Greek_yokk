import { serverTimestamp } from 'firebase/firestore'
import { decodeSummaryMaterial } from './material.js'
import { sortedAllocationIds } from './lots.js'
import { businessDateKey } from '../../../domain/businessDate.js'

// Explicit per-lot physical counts. The caller previews these exact quantities;
// this command cannot edit cost, recipe, lot provenance or create a sale.
export function summaryCount(shop,materials,requests,{opId='SUMMARY-COUNT',uid='cashier'}={}){
  if(requests.length<1||requests.length>18||new Set(requests.map(r=>r.materialId)).size!==requests.length)throw new Error('Unsupported count batch')
  const rows=[],nextMaterials=requests.map((request,index)=>{
    const before=materials.find(m=>m.id===request.materialId)
    if(!before||before.deleted||!['count','waste'].includes(request.mode||'count'))throw new Error('Invalid count request')
    const mode=request.mode||'count',counts=structuredClone(request.counts||[])
    if(counts.length<1||counts.length>4||new Set(counts.map(c=>c.id)).size!==counts.length)throw new Error('Invalid lot counts')
    const next=structuredClone(before)
    for(const c of counts){
      if(!before.lotIds.includes(c.id)||!Number.isSafeInteger(c.to)||c.to<0||c.to>1e9)throw new Error('Invalid count quantity')
      c.from=before.lotQty[c.id];next.lotQty[c.id]=c.to
    }
    const reason=request.reason||'',note=request.note||''
    let lossCents=0
    if(mode==='waste'){
      const c=counts[0],qty=request.requestedQ
      if(counts.length!==1||!Number.isSafeInteger(qty)||qty<1||qty>1e9||c.from===0||c.to!==c.from-Math.min(qty,c.from))throw new Error('Invalid waste amount')
      const cost=before.lots[c.id].unitCost||before.unitCost||0
      lossCents=Math.round((((c.from-c.to)/100)*cost)*100)
      if(before.activeLotId===c.id&&c.to===0){
        const day=Math.floor(Date.parse(businessDateKey(new Date())+'T00:00:00Z')/86400000)
        next.activeLotId=before.lotIds.find(id=>next.lotQty[id]>0&&before.lots[id].expiryDay>=day)||before.lotIds.find(id=>next.lotQty[id]>0)||''
      }
    }else{
      const flags=before.lotIds.filter(id=>next.lotQty[id]>0&&(id===before.activeLotId||before.zeroActiveIds.includes(id)))
      if(flags.length>1)throw new Error('Count restores multiple active positive lots')
      next.activeLotId=flags[0]||before.lotIds.find(id=>next.lotQty[id]>0)||''
    }
    next.zeroActiveIds=before.zeroActiveIds.filter(id=>!counts.some(c=>c.id===id))
    next.stock=before.lotIds.reduce((sum,id)=>sum+next.lotQty[id],0)
    if(next.stock>1e9)throw new Error('Count exceeds quantity bound')
    if(mode==='count'){
      const dateId=next.activeLotId||before.lotIds[0]
      if(before.lots[dateId].receiveDay!==999999)next.lastStockInDay=before.lots[dateId].receiveDay
      if(before.lots[dateId].expiryDay!==999999)next.expiryDay=before.lots[dateId].expiryDay
    }
    next.allocationIds=sortedAllocationIds(decodeSummaryMaterial(next))
    if(next.allocationIds.length>4)throw new Error('Count exceeds live-lot bound')
    next.slotIds=next.allocationIds.concat(Array(4-next.allocationIds.length).fill('_'))
    next.revision=before.revision+1;next.lastOpId=opId;next.lastOpKind='stock_count';next.lastOpIndex=index
    rows.push({materialId:before.id,revision:before.revision,mode,counts,requestedQ:mode==='waste'?request.requestedQ:0,reason,note,lossCents,
      activeLotId:next.activeLotId,zeroActiveIds:[...next.zeroActiveIds]})
    return next
  })
  const operation={schemaVersion:2,kind:'stock_count',status:'committed',opId,uid,createdAt:serverTimestamp(),materialIds:requests.map(r=>r.materialId),rows,shopRevision:shop.revision+1}
  return {operation,nextMaterials,nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'stock_count'}}
}
