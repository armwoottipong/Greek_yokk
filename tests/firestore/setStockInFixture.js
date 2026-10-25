import { doc, writeBatch, serverTimestamp } from 'firebase/firestore'
import { ROOT, GENERATION } from './proofFixture.js'
import { sortedAllocationIds } from './setLots.js'
import { toScaledExact } from '../../src/cloud/conversion.js'

// TEST ONLY canonical stock-in planner. All quantities are hundredths; unitCost
// keeps the original Baht/unit IEEE representation, rounded only where the POS
// rounds it. Existing legacy lot fields remain immutable provenance.
export function prepareStockMaterial(material) {
  const m = structuredClone(material)
  m.packSize ??= 1000
  m.packCostCents ??= Math.round(m.unitCost*m.packSize*100)
  m.lastStockInDay ??= m.lots[m.slotIds[0]].receiveDay
  m.expiryDay ??= m.lots[m.slotIds[0]].expiryDay
  for (const id of m.lotIds) {
    const l = m.lots[id]
    if(l.initialQtyQ===undefined){
      const initial=toScaledExact(l.initialQty??0,100)
      if(!initial.ok)throw new Error('Unsupported original initial quantity')
      l.initialQtyQ=initial.value
    }
    l.unitCost ??= m.unitCost
    l.packCostCents ??= m.packCostCents
    l.note ??= ''
  }
  return m
}

export function planSetStockIn(shop,material,input = {}) {
  const {qtyQ=10000,unitCost=0.5,packCostCents=Math.round(unitCost*material.packSize*100),receiveDay=21000,expiryDay=22000,
    note='',newLotId='NEW-LOT',opId='SET-STOCK-IN',uid='cashier',lotCreatedAtISO=new Date().toISOString()} = input
  if (!Number.isSafeInteger(qtyQ) || qtyQ<=0 || qtyQ+material.stock>1e9 || !Number.isFinite(unitCost) || unitCost<0 || unitCost>1e6) throw new Error('Unsupported stock-in quantity/cost')
  const optionalDates=material.inventoryType==='packaging' && receiveDay===999999 && expiryDay===999999
  if (!Number.isSafeInteger(packCostCents) || packCostCents<0 || packCostCents>1e9 || !optionalDates && (!Number.isInteger(receiveDay) || receiveDay<0 || receiveDay>100000) ||
    !(expiryDay===999999 || Number.isInteger(expiryDay) && expiryDay>=receiveDay && expiryDay<=100000)) throw new Error('Invalid stock-in dates/pack cost')
  const before = material, next = structuredClone(before), packaging = before.inventoryType === 'packaging'
  const target = packaging ? before.lotIds[0] : before.lotIds.find(id => before.lots[id].qty>0 && before.lots[id].receiveDay===receiveDay && before.lots[id].expiryDay===expiryDay)
  const lotId = target || newLotId
  if (!target && (lotId==='_' || Object.hasOwn(before.lots,lotId))) throw new Error('Duplicate/reserved lot ID')
  const old = target ? before.lots[target] : null
  const weighted = ((before.stock/100)*before.unitCost+(qtyQ/100)*unitCost)/((before.stock+qtyQ)/100)
  if (packaging && before.lotIds.slice(1).some(id => before.lots[id].qty>0)) throw new Error('Nonperishable consolidation requires a separately verified command')
  next.stock += qtyQ; next.unitCost = Math.round(weighted*10000)/10000; next.packCostCents = packCostCents
  if (old) {
    const lotWeighted = ((old.qty/100)*(old.unitCost || unitCost)+(qtyQ/100)*unitCost)/((old.qty+qtyQ)/100)
    next.lots[lotId] = {...old,qty:old.qty+qtyQ,initialQtyQ:old.initialQtyQ+qtyQ,
      unitCost:packaging ? weighted : Math.round(lotWeighted*10000)/10000,packCostCents,
      note:note ? (old.note ? `${old.note}; ${note}` : note) : old.note,
      ...(packaging ? {receiveDay,isInUse:true} : {}),
    }
  } else {
    next.lotIds.push(lotId)
    next.lots[lotId] = {id:lotId,qty:qtyQ,initialQtyQ:qtyQ,unitCost,packCostCents,receiveDay,expiryDay:packaging?999999:expiryDay,
      ordinal:before.lotIds.length,isInUse:!before.lotIds.some(id => before.lots[id].isInUse && before.lots[id].qty>0),note,createdAt:lotCreatedAtISO,createdByOpId:opId}
  }
  next.allocationIds = sortedAllocationIds(next)
  if (next.allocationIds.length>4) throw new Error('Unsupported live-lot count')
  next.slotIds = next.allocationIds.concat(Array(4-next.allocationIds.length).fill('_'))
  next.activeLotId = next.lotIds.find(id => next.lots[id].isInUse && next.lots[id].qty>0) || ''
  // The caller supplies the business day for the deterministic proof fixture.
  const day = input.businessDay ?? Math.floor((Date.now()+7*3600000)/86400000)
  const dated = packaging ? next.lots[lotId] : next.lotIds.map(id => next.lots[id]).find(l => l.isInUse && l.qty>0 && l.expiryDay>=day) || next.lotIds.map(id => next.lots[id]).find(l => l.qty>0)
  next.lastStockInDay = packaging ? receiveDay : dated.receiveDay; next.expiryDay = packaging ? expiryDay : dated.expiryDay
  next.revision++; next.lastOpId=opId; next.lastOpKind='stock_in'; next.lastOpIndex=0
  const operation = {schemaVersion:2,kind:'stock_in',status:'committed',opId,uid,createdAt:serverTimestamp(),materialId:before.id,
    materialRevision:before.revision,shopRevision:shop.revision+1,qtyQ,unitCost,packCostCents,receiveDay,expiryDay,note,lotId,dateLotId:dated.id,lotCreatedAtISO,mode:old ? 'merge' : 'new'}
  return {shop,before,next,operation,nextShop:{...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'stock_in'}}
}

export function setStockInBatch(db,f,{omitMaterial=false,omitOperation=false,omitShop=false,writeTarget}={}) {
  const batch = writeTarget || writeBatch(db)
  if (!omitShop) batch.set(doc(db,ROOT),f.nextShop)
  if (!omitMaterial) batch.set(doc(db,`${GENERATION}/materials/${f.next.id}`),f.next)
  if (!omitOperation) batch.set(doc(db,`${GENERATION}/operations/${f.operation.opId}`),f.operation)
  return batch
}
