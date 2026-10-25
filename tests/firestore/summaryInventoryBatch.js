import { serverTimestamp } from 'firebase/firestore'
import { summaryStock } from './summaryStock.js'
import { summaryPackageStock } from './summaryPackageStock.js'
import { summaryProduce } from './summaryProduce.js'
import { summaryCount } from './summaryCount.js'
import { summarySwitch } from './summarySwitch.js'

const clone=value=>structuredClone(value)
const isRecord=value=>!!value&&typeof value==='object'&&!Array.isArray(value)
const maxStock=1000000000
const maxCost=100000
const encodedBytes=value=>new TextEncoder().encode(JSON.stringify(value)).byteLength
const validActionNote=(action)=>['reason','note'].every(key=>action[key]===undefined||typeof action[key]==='string'&&action[key].length<=(key==='reason'?200:1000))
const validInputNote=input=>input?.note===undefined||typeof input.note==='string'&&input.note.length<=1000
const validQtyQ=value=>Number.isSafeInteger(value)&&value>=1&&value<=maxStock

function validateMaterials(shop,materials){
  if(!shop||!Array.isArray(shop.materialIds)||new Set(shop.materialIds).size!==shop.materialIds.length||
    !Array.isArray(materials)||new Set(materials.map(m=>m?.id)).size!==materials.length)throw new Error('Invalid inventory batch registry')
  const byId=new Map(materials.map(m=>[m.id,m]))
  return byId
}

function validateAction(action,byId,registered){
  if(!isRecord(action)||!['receive','produce','count','waste','switch'].includes(action.kind)||typeof action.materialId!=='string')throw new Error('Invalid inventory batch action')
  const target=byId.get(action.materialId)
  if(!registered.has(action.materialId)||!target||target.deleted)throw new Error('Invalid inventory batch material')
  if(action.kind==='produce'){
    const recipe=target.productionRecipe
    if(!isRecord(action.input)||!validQtyQ(action.input.qtyQ)||!validActionNote(action)||!validInputNote(action.input)||
      !recipe||!Array.isArray(recipe.inputIds)||recipe.inputIds.length<1||recipe.inputIds.length>2||
      new Set(recipe.inputIds).size!==recipe.inputIds.length||recipe.inputIds.includes(action.materialId))throw new Error('Invalid production recipe')
    return [action.materialId,...recipe.inputIds]
  }
  if(action.kind==='receive'&&(!isRecord(action.input)||!validQtyQ(action.input.qtyQ)||!validInputNote(action.input)))throw new Error('Invalid receipt input')
  if(action.kind==='count'&&(!Array.isArray(action.counts)||action.counts.length<1||action.counts.length>4||!validActionNote(action)))throw new Error('Invalid count input')
  if(action.kind==='waste'&&(typeof action.lotId!=='string'||!validQtyQ(action.qtyQ)||!validActionNote(action)))throw new Error('Invalid waste input')
  if(action.kind==='switch'&&typeof action.lotId!=='string')throw new Error('Invalid switch input')
  return [action.materialId]
}

function checkSnapshot(material){
  if(!Number.isSafeInteger(material.stock)||material.stock<0||material.stock>maxStock||!Number.isFinite(material.unitCost)||
    material.unitCost<0||material.unitCost>maxCost||!Array.isArray(material.lotIds)||material.lotIds.length>1000)throw new Error('Inventory batch snapshot exceeds bounds')
  for(const id of material.lotIds){
    const unitCost=material.lots?.[id]?.unitCost
    if(!Number.isFinite(unitCost)||unitCost<0||unitCost>maxCost)throw new Error('Inventory batch lot cost exceeds bounds')
  }
}

function stageAction(shop,current,action,context){
  const {opId,uid,businessDay}=context
  let f
  if(action.kind==='receive'){
    const material=current.get(action.materialId),input={...action.input,opId,uid,businessDay}
    f=material.inventoryType==='packaging'?summaryPackageStock(shop,material,input):material.inventoryType==='ingredient'?summaryStock(shop,material,input):null
    if(!f)throw new Error('Invalid receipt material type')
    current.set(material.id,f.next)
    return f.operation
  }
  if(action.kind==='produce'){
    const all=[...current.values()],f=summaryProduce(shop,all,action.materialId,{...action.input,opId,uid})
    for(const material of f.nextInputs)current.set(material.id,material)
    current.set(f.nextOutput.id,f.nextOutput)
    return f.operation
  }
  if(action.kind==='count'){
    const request={materialId:action.materialId,mode:'count',counts:clone(action.counts),reason:action.reason,note:action.note}
    f=summaryCount(shop,[...current.values()],[request],{opId,uid})
    for(const material of f.nextMaterials)current.set(material.id,material)
    return f.operation
  }
  if(action.kind==='waste'){
    const material=current.get(action.materialId),from=material.lotQty?.[action.lotId]
    const request={materialId:action.materialId,mode:'waste',counts:[{id:action.lotId,to:from-Math.min(action.qtyQ,from)}],requestedQ:action.qtyQ,reason:action.reason,note:action.note}
    f=summaryCount(shop,[...current.values()],[request],{opId,uid})
    for(const next of f.nextMaterials)current.set(next.id,next)
    return f.operation
  }
  const material=current.get(action.materialId)
  f=summarySwitch(shop,material,action.lotId,{opId,uid})
  current.set(material.id,f.next)
  return f.operation
}

export function summaryInventoryBatch(shop,materials,actions,{opId='INVENTORY-BATCH',uid='cashier',businessDay=Math.floor((Date.now()+7*3600000)/86400000)}={}){
  const byId=validateMaterials(shop,materials),registered=new Set(shop.materialIds)
  if(!Array.isArray(actions)||actions.length<1||actions.length>6||!Number.isSafeInteger(businessDay)||
    !Number.isSafeInteger(shop.revision)||!Number.isSafeInteger(shop.catalogRevision))throw new Error('Invalid inventory batch')
  const targetIds=[]
  for(const action of actions)targetIds.push(...validateAction(action,byId,registered))
  const unique=[...new Set(targetIds)]
  if(unique.length>6)throw new Error('Inventory batch touches too many materials')
  for(const id of unique){
    const material=byId.get(id)
    if(!registered.has(id)||!material||material.deleted)throw new Error('Invalid inventory batch material')
    checkSnapshot(material)
  }
  const materialIds=unique.sort((a,b)=>byId.get(a).costRank-byId.get(b).costRank)
  const initial=Object.fromEntries(materialIds.map(id=>[id,clone(byId.get(id))]))
  const current=new Map(materialIds.map(id=>[id,clone(byId.get(id))])),steps=[]
  for(const action of actions){
    const before=Object.fromEntries(materialIds.map(id=>[id,clone(current.get(id))]))
    const operation=stageAction(shop,current,action,{opId,uid,businessDay})
    for(const id of materialIds)checkSnapshot(current.get(id))
    const after=Object.fromEntries(materialIds.map(id=>[id,clone(current.get(id))]))
    const command=clone(operation);delete command.createdAt;command.status='planned'
    const step={before,after,command}
    if(encodedBytes(step)>400000)throw new Error('Inventory batch step exceeds size bound')
    steps.push(step)
  }
  const proposal={schemaVersion:2,kind:'inventory_batch',status:'prepared',opId,uid,createdAt:serverTimestamp(),rootRevision:shop.revision,businessDay,stepCount:steps.length,materialIds:[...materialIds],initial}
  if(encodedBytes(proposal)>400000)throw new Error('Inventory batch proposal exceeds size bound')
  const nextMaterials=materialIds.map((id,index)=>({...clone(current.get(id)),revision:byId.get(id).revision+1,lastOpId:opId,lastOpKind:'inventory_batch',lastOpIndex:index}))
  const nextShop={...clone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'inventory_batch'}
  const operation={schemaVersion:2,kind:'inventory_batch',status:'committed',opId,uid,createdAt:serverTimestamp(),beforeShopRevision:shop.revision,
    shopRevision:nextShop.revision,businessDay,stepCount:steps.length,materialIds:[...materialIds]}
  return {proposal,steps,nextMaterials,nextShop,operation}
}
