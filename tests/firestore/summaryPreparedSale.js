import { doc,setDoc,writeBatch } from 'firebase/firestore'
import { ROOT,GENERATION } from './proofFixture.js'
import { ensurePreparation,preparationDescriptor } from './summaryPreparationLifecycle.js'

// Test-only preparation metadata, never a committed sale or an offline queue.
export const preparedSale=sale=>({...sale,order:{...sale.order,proofMode:'prepared'}})
export const preparedPath=(id,index)=>`${GENERATION}/preparedSales/${id}/lineProofs/${index}`
export function preparedProof(sale,index,lines){
  const o=sale.order
  return {opId:o.opId,index,uid:o.uid,catalogRevision:sale.shop.catalogRevision,platformId:o.platformId,
    addonKeys:structuredClone(o.addonKeys),lines}
}
export async function prepareSummarySale(db,sale,{omitProof,firstOnly=false}={}){
  await ensurePreparation(db,preparationDescriptor(sale,'sale_set'))
  for(let i=0;i<sale.order.lineWitnessCount;i++){
    if(i===omitProof)continue
    const lines=sale.order.lines.slice(i*2,i*2+2),ref=doc(db,preparedPath(sale.order.opId,i))
    await setDoc(ref,preparedProof(sale,i,lines.slice(0,1)))
    if(lines.length===2&&!firstOnly)await setDoc(ref,preparedProof(sale,i,lines))
  }
}
export function preparedSaleBatch(db,sale,{omitMaterial,omitOrder=false,omitShop=false}={}){
  const batch=writeBatch(db)
  if(!omitOrder)batch.set(doc(db,`${GENERATION}/orders/${sale.order.opId}`),sale.order)
  if(!omitShop)batch.set(doc(db,ROOT),sale.nextShop)
  for(const m of sale.nextMaterials)if(m.id!==omitMaterial)batch.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
  return batch
}
