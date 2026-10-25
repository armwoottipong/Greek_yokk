import { serverTimestamp } from 'firebase/firestore'
import { validateMaterialMetadata } from './summaryMaterialMetadata.js'
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(id)

// Test-only trusted-state compiler, NOT a client-writable bootstrap command.
// The future importer must establish this exact registry and reverse index.
export function materialRegistryShop(shop,materials){
  const sorted=[...materials].sort((a,b)=>a.costRank-b.costRank),ids=sorted.map(m=>m.id)
  if(ids.length>64||new Set(ids).size!==ids.length||sorted.some((m,i)=>m.costRank!==i||!validId(m.id)))throw new Error('Unsupported material registry')
  const productionUsers=Object.fromEntries(ids.map(id=>[id,[]]))
  for(const m of sorted){
    if(!m.productionRecipe)continue
    const inputs=m.productionRecipe.inputIds
    if(!Array.isArray(inputs)||inputs.length<1||inputs.length>2||new Set(inputs).size!==inputs.length||inputs.some(id=>id===m.id||!ids.includes(id)))throw new Error('Invalid production reference')
    for(const id of inputs)productionUsers[id].push(m.id)
  }
  return {...structuredClone(shop),materialIds:ids,productionUsers}
}
function operation(shop,materialId,materialRevision,kind,opId,uid){
  return {schemaVersion:2,kind,status:'committed',opId,uid,createdAt:serverTimestamp(),materialId,materialRevision,shopRevision:shop.revision+1}
}
function nextRoot(shop,opId,kind){return {...structuredClone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:kind}}
export function summaryMaterialCreate(shop,input,{opId='MATERIAL-CREATE',uid='cashier'}={}){
  const allowed=['id','name','emoji','unit','inventoryType','packSize','minAlertQ']
  if(!input||!Object.keys(input).every(k=>allowed.includes(k))||!validId(input.id)||!Array.isArray(shop.materialIds)||shop.materialIds.length>=64||shop.materialIds.includes(input.id)||
    !['ingredient','packaging'].includes(input.inventoryType)||typeof input.unit!=='string'||!input.unit.trim()||input.unit.length>32||
    !Number.isInteger(input.packSize)||input.packSize<1||input.packSize>10000000)throw new Error('Invalid material creation')
  validateMaterialMetadata({name:input.name,emoji:input.emoji,minAlertQ:input.minAlertQ})
  const next={...structuredClone(input),revision:1,costRank:shop.materialIds.length,deleted:false,unitCost:0,packCostCents:0,stock:0,
    lots:{_:{id:'_',qty:0,isInUse:false,expiryDay:999999,receiveDay:999999,ordinal:999999,sortKey:999999*1e9+999999*1000+999999}},
    lotIds:[],lotQty:{_:0},zeroActiveIds:[],allocationIds:[],slotIds:['_','_','_','_'],activeLotId:'',lastStockInDay:999999,expiryDay:999999,
    recipeIndex:{catalogRevision:shop.catalogRevision,quantities:Array(15).fill(0),menus:{_:0,...Object.fromEntries(shop.catalog.menuIds.map(id=>[id,0]))},addons:{_:0,...Object.fromEntries(shop.catalog.addonIds.map(id=>[id,0]))}},
    lastOpId:opId,lastOpKind:'material_create',lastOpIndex:0}
  const nextShop=nextRoot(shop,opId,'material_create')
  nextShop.materialIds.push(input.id);nextShop.productionUsers[input.id]=[]
  return {next,nextShop,operation:{...operation(shop,input.id,0,'material_create',opId,uid),materialSnapshot:structuredClone(next)}}
}
export function summaryMaterialArchive(shop,material,deleted,{opId='MATERIAL-ARCHIVE',uid='cashier'}={}){
  if(typeof deleted!=='boolean'||material.deleted===deleted||!shop.materialIds?.includes(material.id)||shop.catalog.summaryMaterials.includes(material.id)||
    shop.productionUsers?.[material.id]?.length!==0||Object.values(material.recipeIndex.menus).some(q=>q!==0)||Object.values(material.recipeIndex.addons).some(q=>q!==0))throw new Error('Material still referenced or unchanged')
  return {next:{...structuredClone(material),deleted,revision:material.revision+1,lastOpId:opId,lastOpKind:'material_archive',lastOpIndex:0},
    nextShop:nextRoot(shop,opId,'material_archive'),operation:{...operation(shop,material.id,material.revision,'material_archive',opId,uid),deleted}}
}
