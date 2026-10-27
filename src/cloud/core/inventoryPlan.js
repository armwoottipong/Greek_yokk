import {planCatalogCommand} from './catalogPlan.js'
import {summaryStock} from './model/stock.js'
import {summaryPackageStock} from './model/packageStock.js'
import {summaryProduce} from './model/produce.js'
import {summaryCount} from './model/count.js'
import {summarySwitch} from './model/switch.js'
import {summaryMaterialCreate,summaryMaterialArchive} from './model/materialAuthor.js'
import {summaryMaterialMetadata} from './model/materialMetadata.js'
import {summaryMaterialMeasure} from './model/materialMeasure.js'
import {summaryMaterialDetails} from './model/materialDetails.js'
import {summaryMaterialType} from './model/materialType.js'
import {summaryProductionRecipe} from './model/productionRecipe.js'
import {summaryMaterialDelete} from './model/materialDelete.js'
import {planHistoryClear} from './model/historyClear.js'
import {planPlatformSettings} from './model/platformSettings.js'
const fail=code=>Object.assign(new Error(code),{code})
export function planInventoryCommand(shop,materials,command,uid='preview'){
 const p=command.payload||{},options={opId:command.opId,uid}
 if(p.expectedRevision!==undefined&&p.expectedRevision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
 const material=()=>{const m=materials.find(m=>m.id===p.materialId);if(!m)throw fail('MATERIAL_NOT_FOUND');return m}
 let f
 switch(command.kind){
  case 'platform_gp':f=planPlatformSettings(shop,p,options);break
  case 'menu':case 'addon':case 'group':f=planCatalogCommand(shop,materials,command,uid);break
  case 'history_clear':f=planHistoryClear(shop,options);break
  case 'inventory':case 'receive':{const m=material();if(m.deleted)throw fail('MATERIAL_NOT_FOUND');f=(m.inventoryType==='packaging'?summaryPackageStock:summaryStock)(shop,m,{...p.input,...options});break}
  case 'produce':f=summaryProduce(shop,materials,p.materialId,{...p.input,...options});break
  case 'stock_count':f=summaryCount(shop,materials,p.requests,options);break
  case 'switch_lot':f=summarySwitch(shop,material(),p.lotId,options);break
  case 'material_create':f=summaryMaterialCreate(shop,p.input,options);break
  case 'material_archive':f=summaryMaterialArchive(shop,material(),p.deleted,options);break
  case 'material_delete':f=summaryMaterialDelete(shop,material(),options);break
  case 'material_metadata':f=summaryMaterialMetadata(shop,material(),p.metadata,options);break
  case 'material_measure':f=summaryMaterialMeasure(shop,material(),p.measure,options);break
  case 'material_details':f=summaryMaterialDetails(shop,material(),p.details,options);break
  case 'material_type':f=summaryMaterialType(shop,materials,p.materialId,p.inventoryType,options);break
  case 'production_recipe':f=summaryProductionRecipe(shop,materials,p.materialId,p.recipe,options);break
  default:throw fail('UNKNOWN_COMMAND')
 }
 return {admittedProof:f.admittedProof,checkProofs:f.checkProofs,inputProof:f.inputProof,shapeProof:f.shapeProof,referenceProof:f.referenceProof,displayChange:f.displayChange,nextShop:f.nextShop,nextMaterials:f.nextMaterials|| (f.nextInputs?[...f.nextInputs,f.nextOutput]:[f.next]),removedMaterialIds:f.removedMaterialIds||[],operation:f.operation}
}
