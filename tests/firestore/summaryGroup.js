import { serverTimestamp } from 'firebase/firestore'

// Experimental single-group authoring; not the runtime API.
export function summaryGroup(shop,materials,input,options={}){return summaryGroupWithLimit(shop,materials,input,options,3)}
export function summaryGroupWithLimit(shop,materials,input,{opId='GROUP-EDIT',uid='cashier'}={},repeatLimit=3){
  if(!input||typeof input.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(input.id)||input.id==='_')throw new Error('Invalid group')
  if(typeof input.allowRepeat!=='boolean')throw new Error('Invalid repeat setting')
  if(input.allowRepeat&&input.max>repeatLimit)throw new Error('Unsupported repeating selection count')
  const catalog=structuredClone(shop.catalog),old=catalog.groups?.[input.id],create=!old
  catalog.groups??={};catalog.groupIds??=[]
  if(create&&catalog.groupIds.length>=64)throw new Error('Unsupported group count')
  if(input.optionIds.length>45)throw new Error('Unsupported group option count')
  const menuIds=old?.menuIds||[]
  if(input.active===false&&menuIds.length)throw new Error('Group is assigned to menus')
  const group={...structuredClone(input),name:typeof input.name==='string'?input.name.trim():input.name,revision:create?1:old.revision+1,active:input.active??true,menuIds:[...menuIds],
    optionPrices:Object.fromEntries(catalog.platformIds.map(p=>[p,{_:0,...structuredClone(input.optionPrices?.[p]||{})}]))}
  catalog.groups[group.id]=group;if(create)catalog.groupIds.push(group.id)
  const nextMaterials=catalog.summaryMaterials.map((id,i)=>{
    const m=materials.find(row=>row.id===id)
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'group',lastOpIndex:i,
      recipeIndex:{...structuredClone(m.recipeIndex),catalogRevision:shop.catalogRevision+1}}
  })
  const operation={schemaVersion:2,kind:'group',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:shop.revision+1,
    sourceCatalogRevision:shop.catalogRevision,materialIds:[...catalog.summaryMaterials],entityId:group.id,entitySnapshot:structuredClone(group),create}
  return {operation,shapeProof:{opId},nextMaterials,nextShop:{...structuredClone(shop),catalog,catalogRevision:shop.catalogRevision+1,revision:shop.revision+1,lastOpId:opId,lastOpKind:'group'}}
}
