import { doc,writeBatch,serverTimestamp } from 'firebase/firestore'
import { allocateInventory } from '../../src/domain/inventory.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { decodeSummaryMaterial } from './summaryFixture.js'
import { sortedAllocationIds } from './setLots.js'

export function summaryProduce(shop,materials,outputId,{qtyQ=10000,opId='SUMMARY-PRODUCE',uid='cashier',lotId='PRODUCED-LOT',receiveDay=21000,expiryDay=22000,note='',lotCreatedAtISO=new Date().toISOString()}={}){
  const output=materials.find(m=>m.id===outputId),r=output?.productionRecipe
  if(!r||!Number.isSafeInteger(qtyQ)||qtyQ<1||qtyQ+output.stock>1e9||r.inputIds.length<1||r.inputIds.length>2||new Set(r.inputIds).size!==r.inputIds.length||r.inputIds.includes(outputId))throw new Error('Unsupported production')
  if(output.lots[lotId]||!Number.isInteger(receiveDay)||receiveDay<0||!Number.isInteger(expiryDay)||expiryDay<receiveDay)throw new Error('Invalid production lot')
  const source=r.inputIds.map(id=>materials.find(m=>m.id===id))
  const needs=r.quantities.map(q=>Math.round((q/100)*(qtyQ/r.yieldQ)*100))
  const date=d=>d===999999?null:new Date(d*86400000).toISOString().slice(0,10)
  const domain=source.map(m=>{
    if(!m||m.deleted||m.inventoryType!=='ingredient')throw new Error('Invalid production input')
    const d=decodeSummaryMaterial(m)
    return {...d,stock:m.stock/100,lots:m.lotIds.map(id=>({...d.lots[id],qty:m.lotQty[id]/100,receiveDate:date(m.lots[id].receiveDay),expiryDate:date(m.lots[id].expiryDay)}))}
  })
  const allocation=allocateInventory(domain,r.inputIds.map((materialId,i)=>({materialId,qty:needs[i]/100})))
  if(!allocation.ok||needs.some(q=>q<=0))throw new Error('Production input unavailable')
  const inputs=source.map((m,i)=>{
    const next=allocation.materials.find(item=>item.id===m.id)
    return {materialId:m.id,revision:m.revision,costRank:m.costRank,needed:needs[i],take:needs[i],shortage:0,
      ingredientCostBaht:(needs[i]/100)*m.unitCost,packagingCostCents:0,lotIds:[...m.allocationIds],
      lotTakes:Array.from({length:4},(_,j)=>m.allocationIds[j]?m.lotQty[m.allocationIds[j]]-Math.round(next.lots.find(l=>l.id===m.allocationIds[j]).qty*100):0)}
  })
  const rawCostBaht=inputs.reduce((sum,row)=>sum+row.ingredientCostBaht,0)
  const nextInputs=source.map((m,i)=>{
    const next=allocation.materials.find(item=>item.id===m.id)
    const active=next.lots.find(l=>l.isInUse&&l.qty>0)?.id||''
    return {...structuredClone(m),stock:m.stock-needs[i],lotQty:{_:0,...Object.fromEntries(m.lotIds.map(id=>[id,Math.round(next.lots.find(l=>l.id===id).qty*100)]))},
      activeLotId:active,lastStockInDay:active?m.lots[active].receiveDay:m.lastStockInDay,expiryDay:active?m.lots[active].expiryDay:m.expiryDay,
      zeroActiveIds:[],revision:m.revision+1,lastOpId:opId,lastOpKind:'produce',lastOpIndex:i}
  })
  const hadActive=output.activeLotId&&output.lotQty[output.activeLotId]>0
  const lot={id:lotId,qty:qtyQ,initialQtyQ:qtyQ,unitCost:rawCostBaht/(qtyQ/100),packCostCents:output.packCostCents,
    receiveDay,expiryDay,ordinal:output.lotIds.length,isInUse:!hadActive,note,createdAt:lotCreatedAtISO,createdByOpId:opId,
    sortKey:expiryDay*1e9+receiveDay*1000+output.lotIds.length}
  const nextOutput={...structuredClone(output),stock:output.stock+qtyQ,
    unitCost:((output.stock/100)*output.unitCost+rawCostBaht)/(output.stock/100+qtyQ/100),
    lots:{...structuredClone(output.lots),[lotId]:lot},lotIds:[...output.lotIds,lotId],lotQty:{...output.lotQty,[lotId]:qtyQ},
    activeLotId:hadActive?output.activeLotId:lotId,revision:output.revision+1,lastOpId:opId,lastOpKind:'produce',lastOpIndex:2}
  nextOutput.allocationIds=sortedAllocationIds(decodeSummaryMaterial(nextOutput))
  if(nextOutput.allocationIds.length>4||output.lotIds.length>=1000)throw new Error('Production exceeds lot bounds')
  nextOutput.slotIds=nextOutput.allocationIds.concat(Array(4-nextOutput.allocationIds.length).fill('_'))
  const operation={schemaVersion:2,kind:'produce',status:'committed',opId,uid,createdAt:serverTimestamp(),materialIds:[...r.inputIds],inputs,
    outputId,outputRevision:output.revision,qtyQ,rawCostBaht,shopRevision:shop.revision+1,note,lotId,receiveDay,expiryDay,lotCreatedAtISO}
  return {operation,nextInputs,nextOutput,nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'produce'}}
}
export function summaryProduceBatch(db,f,{omitInput,omitOutput=false,omitOperation=false,omitShop=false}={}){
  const b=writeBatch(db)
  if(!omitOperation)b.set(doc(db,`${GENERATION}/operations/${f.operation.opId}`),f.operation)
  if(!omitShop)b.set(doc(db,ROOT),f.nextShop)
  if(!omitOutput)b.set(doc(db,`${GENERATION}/materials/${f.nextOutput.id}`),f.nextOutput)
  for(const m of f.nextInputs)if(m.id!==omitInput)b.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
  return b
}
