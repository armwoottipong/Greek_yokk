import {serverTimestamp} from 'firebase/firestore'
import {summaryEffectiveRecipe} from './recipe.js'
const clone=x=>structuredClone(x)
export function summaryMaterialType(shop,materials,targetId,inventoryType,{opId='MATERIAL-TYPE',uid='cashier'}={}){
 const target=materials.find(m=>m.id===targetId)
 if(!target||target.deleted||!shop.materialIds?.includes(targetId)||!['ingredient','packaging'].includes(inventoryType)||inventoryType===target.inventoryType||
  Object.keys(target.productionRecipe||{}).length||shop.productionUsers?.[targetId]?.length!==0)throw new Error('Invalid material type change')
 const next={...clone(target),inventoryType,revision:target.revision+1,lastOpId:opId,lastOpKind:'material_type',lastOpIndex:0}
 const nextMaterials=materials.map(m=>m.id===targetId?next:m),nextShop={...clone(shop),catalogRevision:shop.catalogRevision+1,revision:shop.revision+1,lastOpId:opId,lastOpKind:'material_type'}
 for(const menu of Object.values(nextShop.catalog.menus))if(menu.rawRecipe&&Object.hasOwn(menu.rawRecipe,targetId)){
  menu.recipe=summaryEffectiveRecipe(menu,nextMaterials)
  if(menu.baseMaterialIds)menu.baseMaterialIds=Object.keys(menu.recipe).filter(id=>menu.recipe[id]>0)
 }
 return {nextShop,nextMaterials:[next],checkProofs:Array.from({length:16},(_,index)=>({namespace:'type',index,data:{opId,index}})),operation:{schemaVersion:2,kind:'material_type',status:'committed',opId,uid,createdAt:serverTimestamp(),targetId,targetRevision:target.revision,previousType:target.inventoryType,inventoryType,sourceCatalogRevision:shop.catalogRevision,shopRevision:nextShop.revision,materialIds:[targetId]}}
}
