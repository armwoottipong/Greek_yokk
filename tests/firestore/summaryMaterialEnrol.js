import { serverTimestamp } from 'firebase/firestore'

// Test-only bounded replacement, never a sixteenth simultaneous sale guard.
export function summaryMaterialEnrol(shop,materials,removedId,addedId,{opId='ENROL',uid='cashier'}={}){
  const c=shop.catalog,removed=materials.find(m=>m.id===removedId),incoming=materials.find(m=>m.id===addedId)
  if(c.summaryMaterials.length!==15||c.menuIds.length>64||c.addonIds.length>64||!c.summaryMaterials.includes(removedId)||c.summaryMaterials.includes(addedId)||
    !shop.materialIds?.includes(addedId)||!removed||removed.deleted||!incoming||incoming.deleted||removed.recipeIndex.catalogRevision!==shop.catalogRevision||
    Object.values(removed.recipeIndex.menus).some(q=>q!==0)||Object.values(removed.recipeIndex.addons).some(q=>q!==0))throw new Error('Invalid sale material replacement')
  const ids=[removedId,addedId]
  if(Object.values(c.menus).some(m=>m.materialIds.some(id=>ids.includes(id))||Object.keys(m.recipe).some(id=>ids.includes(id)))||
    Object.values(c.addons).some(a=>Object.keys(a.recipe).some(id=>ids.includes(id))))throw new Error('Remove all catalogue material references first')
  const members=c.summaryMaterials.filter(id=>id!==removedId).concat(addedId).map(id=>materials.find(m=>m.id===id))
  if(members.some(m=>!m||m.deleted||!Number.isSafeInteger(m.costRank))||new Set(members.map(m=>m.costRank)).size!==15)throw new Error('Invalid material guards')
  members.sort((a,b)=>a.costRank-b.costRank)
  const nextMaterials=members.map((m,i)=>{
    if(m.id!==addedId&&m.recipeIndex.catalogRevision!==shop.catalogRevision)throw new Error('Stale material cache')
    const index=m.id===addedId?{quantities:Array(15).fill(0),menus:{_:0,...Object.fromEntries(c.menuIds.map(id=>[id,0]))},addons:{_:0,...Object.fromEntries(c.addonIds.map(id=>[id,0]))}}:structuredClone(m.recipeIndex)
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'material_enrol',lastOpIndex:i,recipeIndex:{...index,catalogRevision:shop.catalogRevision+1}}
  })
  const nextShop={...structuredClone(shop),revision:shop.revision+1,catalogRevision:shop.catalogRevision+1,lastOpId:opId,lastOpKind:'material_enrol'}
  nextShop.catalog.summaryMaterials=members.map(m=>m.id)
  return {nextMaterials,nextShop,operation:{schemaVersion:2,kind:'material_enrol',status:'committed',opId,uid,createdAt:serverTimestamp(),addedId,removedId,
    removedRevision:removed.revision,sourceCatalogRevision:shop.catalogRevision,shopRevision:nextShop.revision,materialIds:[...nextShop.catalog.summaryMaterials]}}
}
