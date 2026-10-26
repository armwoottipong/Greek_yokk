import { serverTimestamp } from 'firebase/firestore'

const clone=value=>structuredClone(value)
const validQ=value=>Number.isSafeInteger(value)&&value>=1&&value<=1000000000

// Pure planner for production recipe bindings.
export function summaryProductionRecipe(shop,materials,materialId,recipe,{opId='PRODUCTION-RECIPE',uid='cashier'}={}){
  const ids=shop?.materialIds,users=shop?.productionUsers
  if(!Array.isArray(ids)||!Array.isArray(materials)||!ids.includes(materialId)||!users||typeof users!=='object')throw new Error('Invalid production recipe state')
  const byId=new Map(materials.map(m=>[m.id,m]))
  if(byId.size!==materials.length||materials.some(m=>!ids.includes(m.id))||ids.some(id=>!byId.has(id)))throw new Error('Invalid production material registry')
  const output=byId.get(materialId)
  if(output.deleted||output.inventoryType!=='ingredient')throw new Error('Invalid production output')

  const old=output.productionRecipe||{}
  const recipeKeys=value=>Object.keys(value||{}).sort().join(',')
  if(recipeKeys(old)!==(Object.keys(old).length?'inputIds,quantities,yieldQ':''))throw new Error('Invalid existing production recipe')
  const inputIdsOf=value=>Object.keys(value).length?value.inputIds:[]
  const oldInputs=inputIdsOf(old)
  if(Object.keys(old).length&&(!Array.isArray(oldInputs)||oldInputs.length<1||oldInputs.length>2||new Set(oldInputs).size!==oldInputs.length||!Array.isArray(old.quantities)||old.quantities.length!==oldInputs.length||old.quantities.some(q=>!validQ(q))||!validQ(old.yieldQ)))throw new Error('Invalid existing production recipe')

  let nextRecipe
  if(recipe&&typeof recipe==='object'&&!Array.isArray(recipe)&&Object.keys(recipe).length===0)nextRecipe={}
  else{
    if(!recipe||typeof recipe!=='object'||Array.isArray(recipe)||recipeKeys(recipe)!=='inputIds,quantities,yieldQ')throw new Error('Invalid production recipe')
    const {inputIds,quantities,yieldQ}=recipe
    if(!Array.isArray(inputIds)||inputIds.length<1||inputIds.length>2||new Set(inputIds).size!==inputIds.length||inputIds.some(id=>id===materialId||!ids.includes(id))||
      !Array.isArray(quantities)||quantities.length!==inputIds.length||quantities.some(q=>!validQ(q))||!validQ(yieldQ))throw new Error('Invalid production recipe')
    for(const id of inputIds){const input=byId.get(id);if(!input||input.deleted||input.inventoryType!=='ingredient')throw new Error('Invalid production input')}
    nextRecipe=clone({inputIds,quantities,yieldQ})
  }
  const newInputs=Object.keys(nextRecipe).length?nextRecipe.inputIds:[]
  const sameRecipe=Object.keys(old).length===0&&Object.keys(nextRecipe).length===0||
    old.yieldQ===nextRecipe.yieldQ&&Array.isArray(old.inputIds)&&Array.isArray(nextRecipe.inputIds)&&
    old.inputIds.length===nextRecipe.inputIds.length&&old.inputIds.every((id,i)=>id===nextRecipe.inputIds[i])&&
    Array.isArray(old.quantities)&&Array.isArray(nextRecipe.quantities)&&old.quantities.length===nextRecipe.quantities.length&&
    old.quantities.every((quantity,i)=>quantity===nextRecipe.quantities[i])
  if(sameRecipe)throw new Error('Production recipe unchanged')

  const affected=new Set([...oldInputs,...newInputs])
  for(const id of affected){
    const list=users[id],expected=oldInputs.includes(id)?1:0
    if(!Array.isArray(list)||list.filter(userId=>userId===materialId).length!==expected)throw new Error('Inconsistent production reverse index')
  }
  const nextShop={...clone(shop),revision:shop.revision+1,lastOpId:opId,lastOpKind:'production_recipe'}
  nextShop.productionUsers=clone(users)
  for(const id of affected){
    const had=oldInputs.includes(id),will=newInputs.includes(id)
    if(had&&!will)nextShop.productionUsers[id]=nextShop.productionUsers[id].filter(userId=>userId!==materialId)
    if(!had&&will)nextShop.productionUsers[id]=[...nextShop.productionUsers[id],materialId]
  }
  const next={...clone(output),revision:output.revision+1,lastOpId:opId,lastOpKind:'production_recipe',lastOpIndex:0}
  if(Object.keys(nextRecipe).length)next.productionRecipe=nextRecipe
  else delete next.productionRecipe
  return {next,nextShop,operation:{schemaVersion:2,kind:'production_recipe',status:'committed',opId,uid,createdAt:serverTimestamp(),materialId,materialRevision:output.revision,shopRevision:shop.revision+1,recipe:clone(nextRecipe)}}
}
