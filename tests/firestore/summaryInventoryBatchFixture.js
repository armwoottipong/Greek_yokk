import { serverTimestamp } from 'firebase/firestore'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'
import { summaryStock } from './summaryStock.js'
import { summaryCount } from './summaryCount.js'

export function inventoryBatchFixture(){
  const base=summaryFixture();base.shop=materialRegistryShop(base.shop,base.materials)
  const m=base.materials[0],opId='MIXED-DRAFT',uid='cashier',businessDay=Math.floor((Date.now()+7*3600000)/86400000),materialIds=[m.id]
  const receive=summaryStock(base.shop,m,{qtyQ:1000,unitCost:0.5,packCostCents:500,receiveDay:businessDay,expiryDay:999999,newLotId:'DRAFT-LOT',opId,uid,lotCreatedAtISO:'2026-10-22T00:00:00.000Z'})
  const count=summaryCount(base.shop,[receive.next],[{materialId:m.id,counts:[{id:'DRAFT-LOT',to:900}],reason:'Physical count'}],{opId,uid})
  const planned=o=>{const {createdAt:_,...command}=o;return {...command,status:'planned'}}
  const steps=[{before:{[m.id]:structuredClone(m)},after:{[m.id]:structuredClone(receive.next)},command:planned(receive.operation)},
    {before:{[m.id]:structuredClone(receive.next)},after:{[m.id]:structuredClone(count.nextMaterials[0])},command:planned(count.operation)}]
  const proposal={schemaVersion:2,kind:'inventory_batch',status:'prepared',opId,uid,createdAt:serverTimestamp(),rootRevision:base.shop.revision,businessDay,stepCount:2,materialIds,initial:{[m.id]:structuredClone(m)}}
  const nextMaterials=[{...structuredClone(count.nextMaterials[0]),revision:m.revision+1,lastOpId:opId,lastOpKind:'inventory_batch',lastOpIndex:0}]
  const nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'inventory_batch'}
  const operation={schemaVersion:2,kind:'inventory_batch',status:'committed',opId,uid,createdAt:serverTimestamp(),beforeShopRevision:base.shop.revision,shopRevision:nextShop.revision,businessDay,stepCount:2,materialIds}
  return {base,f:{proposal,steps,nextMaterials,nextShop,operation}}
}
