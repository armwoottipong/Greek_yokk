import {hasDeclaredMaterial} from './materialReferences.js'
import {serverTimestamp} from 'firebase/firestore'

const fail=()=>{throw new Error('Material must be archived, empty and unreferenced before deletion')}
// Deletion retains an immutable snapshot, while removing only this material's
// live document and registry entry. Historic orders/receipts remain untouched.
export function summaryMaterialDelete(shop,material,{opId='MATERIAL-DELETE',uid='cashier'}={}){
 const id=material?.id,ids=shop?.materialIds,users=shop?.productionUsers
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length||!ids.includes(id)||shop.catalog.summaryMaterials.includes(id)||
  material.deleted!==true||material.stock!==0||!material.lotQty||Object.values(material.lotQty).some(q=>q!==0)||
  shop.returnMaterials?.[id]===true||hasDeclaredMaterial(shop,id)||
  !users||!Array.isArray(users[id])||users[id].length!==0||Object.keys(material.productionRecipe||{}).length!==0)fail()
 const nextRank=shop.nextMaterialCostRank??ids.length
 if(!Number.isSafeInteger(nextRank)||nextRank<ids.length||nextRank<=material.costRank)fail()
 const nextShop={...structuredClone(shop),materialIds:ids.filter(value=>value!==id),nextMaterialCostRank:nextRank,
  revision:shop.revision+1,lastOpId:opId,lastOpKind:'material_delete'}
 delete nextShop.productionUsers[id]
 return {nextShop,nextMaterials:[],removedMaterialIds:[id],referenceProof:{opId},operation:{schemaVersion:2,kind:'material_delete',status:'committed',
  opId,uid,createdAt:serverTimestamp(),materialId:id,materialRevision:material.revision,shopRevision:nextShop.revision,
  materialSnapshot:structuredClone(material)}}
}
