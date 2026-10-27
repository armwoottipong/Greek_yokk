import { serverTimestamp } from 'firebase/firestore'
import { summaryMenuQuantity,summaryEffectiveRecipe } from './recipe.js'

export function summaryCatalog(shop,materials,change=()=>{}, {opId='CATALOG-EDIT',uid='cashier',entity}={}) {
  const catalog=structuredClone(shop.catalog);change(catalog)
  if(catalog.menuIds.length>64||catalog.addonIds.length>64||catalog.platformIds.length>4)throw new Error('Unsupported catalog dimensions')
  if(['menuIds','addonIds','platformIds','counterIds'].some(key=>JSON.stringify(catalog[key])!==JSON.stringify(shop.catalog[key])))throw new Error('Use a structural catalogue command')
  const changed=[]
  for(const collection of ['menus','addons','platforms'])for(const key of Object.keys(catalog[collection])){
    if(JSON.stringify(catalog[collection][key])!==JSON.stringify(shop.catalog[collection][key]))changed.push({collection,key})
  }
  if(changed.length===0&&entity&&catalog[entity.collection]?.[entity.key])changed.push(entity)
  if(changed.length!==1)throw new Error('One catalog entity per edit command')
  const {collection,key}=changed[0]
  if(collection==='menus'&&Object.hasOwn(catalog.menus[key],'rawRecipe'))catalog.menus[key].recipe=summaryEffectiveRecipe(catalog.menus[key],materials)
  if(collection==='menus'&&((catalog.menus[key].groupId||'')!==(shop.catalog.menus[key].groupId||'')||JSON.stringify(catalog.menus[key].groupIds||[])!==JSON.stringify(shop.catalog.menus[key].groupIds||[])))throw new Error('Use menu command for group binding')
  const counterIndex=collection==='platforms'?15+catalog.platformIds.indexOf(key):(catalog.counterIds||[]).indexOf(key,collection==='addons'?4:0)
  if(collection==='addons'){
    for(const p of catalog.platformIds)catalog.addonPrices[p][key]=catalog.addons[key].pricesCents[p]
    for(const menu of Object.values(catalog.menus))if(menu.optionIds.includes(key)){
      menu.choiceMaterials[key]=Object.keys(catalog.addons[key].recipe)
      // Preserve existing references as a safe superset, including ingredients
      // shared by other choices. A later menu edit can rebuild the minimal set.
      menu.materialIds=[...new Set([...menu.materialIds,...menu.choiceMaterials[key]])]
    }
  }
  const nextMaterials=catalog.summaryMaterials.map((id,i)=>{
    const m=materials.find(item=>item.id===id)
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'catalog',lastOpIndex:i,
      recipeIndex:{catalogRevision:shop.catalogRevision+1,...(m.recipeIndex.quantities?{quantities:[...m.recipeIndex.quantities]}:{}),addons:{_:0,...Object.fromEntries(catalog.addonIds.map(key=>[key,catalog.addons[key].recipe[id]||0]))},
        menus:{_:0,...Object.fromEntries(catalog.menuIds.map(key=>[key,summaryMenuQuantity(catalog.menus[key],m)]))}}}
  })
  const operation={schemaVersion:2,kind:'catalog',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:shop.revision+1,sourceCatalogRevision:shop.catalogRevision,materialIds:[...catalog.summaryMaterials],counterIndex,collection,entityId:key,entitySnapshot:structuredClone(catalog[collection][key])}
  return {operation,...(collection==='addons'?{referenceProof:{opId}}:{}),...(collection==='menus'?{shapeProof:{opId}}:{}),nextMaterials,nextShop:{...structuredClone(shop),catalog,catalogRevision:shop.catalogRevision+1,revision:shop.revision+1,lastOpId:opId,lastOpKind:'catalog'}}
}
// Structural menu command. Menu recipes are authoritative in the root;
// each compulsory material leaf validates one quantity, without a new read.
export function summaryMenu(shop,materials,input,{opId='MENU-EDIT',uid='cashier'}={}){
  if(!input||typeof input.id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(input.id)||input.id==='_')throw new Error('Invalid menu')
  const catalog=structuredClone(shop.catalog),old=catalog.menus[input.id],create=!old
  if(create&&catalog.menuIds.length>=64)throw new Error('Unsupported menu count')
  const menu={...structuredClone(input),revision:create?1:old.revision+1}
  const oldGroup=old?.groupId||'',newGroup=menu.groupId||''
  if(newGroup){
    if(!catalog.groups?.[newGroup]?.active)throw new Error('Invalid menu group')
    menu.priceMode='addon';menu.optionIds=[];menu.min=0;menu.max=0
    menu.optionPrices=Object.fromEntries(catalog.platformIds.map(p=>[p,{_:0}]))
  }else delete menu.groupId
  if(oldGroup!==newGroup){
    if(oldGroup)catalog.groups[oldGroup].menuIds=catalog.groups[oldGroup].menuIds.filter(id=>id!==menu.id)
    if(newGroup)catalog.groups[newGroup].menuIds.push(menu.id)
  }
  if(menu.optionIds.length>45)throw new Error('Unsupported menu option count')
  menu.choiceMaterials=Object.fromEntries(menu.optionIds.map(key=>[key,Object.keys(catalog.addons[key]?.recipe||{})]))
  menu.materialIds=[...new Set([...Object.keys(menu.recipe),...Object.values(menu.choiceMaterials).flat()])]
  catalog.menus[menu.id]=menu
  if(create)catalog.menuIds.push(menu.id)
  const nextMaterials=catalog.summaryMaterials.map((id,i)=>{
    const m=materials.find(item=>item.id===id)
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'menu',lastOpIndex:i,
      recipeIndex:{...structuredClone(m.recipeIndex),catalogRevision:shop.catalogRevision+1,menus:{...structuredClone(m.recipeIndex.menus),[menu.id]:menu.recipe[id]||0}}}
  })
  const operation={schemaVersion:2,kind:'menu',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:shop.revision+1,
    sourceCatalogRevision:shop.catalogRevision,materialIds:[...catalog.summaryMaterials],entityId:menu.id,entitySnapshot:structuredClone(menu),create}
  return {operation,shapeProof:{opId},nextMaterials,nextShop:{...structuredClone(shop),catalog,catalogRevision:shop.catalogRevision+1,revision:shop.revision+1,lastOpId:opId,lastOpKind:'menu'}}
}
// Additive addon enrolment. Existing menus explicitly opt in in a later
// menu command; creating a topping never changes a menu's price or selection.
export function summaryAddon(shop,materials,id,input,{opId='ADDON-CREATE',uid='cashier'}={}){
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id)||id==='_')throw new Error('Invalid addon')
  const catalog=structuredClone(shop.catalog),index=4+catalog.addonIds.length
  if(catalog.addons[id])throw new Error('Use an existing addon edit command')
  if(catalog.addonIds.length>=64)throw new Error('Unsupported addon count')
  const addon={...structuredClone(input),active:input.active??true}
  catalog.addonIds.push(id);if(index<15&&catalog.counterIds)catalog.counterIds[index]=id;catalog.addons[id]=addon
  for(const p of catalog.platformIds)catalog.addonPrices[p][id]=addon.pricesCents[p]
  const nextMaterials=catalog.summaryMaterials.map((key,i)=>{
    const m=materials.find(item=>item.id===key),quantities=m.recipeIndex.quantities?[...m.recipeIndex.quantities]:null
    if(index<15&&quantities)quantities[index]=addon.recipe[key]||0
    return {...structuredClone(m),revision:m.revision+1,lastOpId:opId,lastOpKind:'addon',lastOpIndex:i,
      recipeIndex:{...structuredClone(m.recipeIndex),catalogRevision:shop.catalogRevision+1,...(quantities?{quantities}:{}),addons:{...structuredClone(m.recipeIndex.addons),[id]:addon.recipe[key]||0}}}
  })
  const operation={schemaVersion:2,kind:'addon',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:shop.revision+1,
    sourceCatalogRevision:shop.catalogRevision,materialIds:[...catalog.summaryMaterials],entityId:id,entitySnapshot:structuredClone(addon),counterIndex:index}
  return {operation,shapeProof:{opId},nextMaterials,nextShop:{...structuredClone(shop),catalog,catalogRevision:shop.catalogRevision+1,revision:shop.revision+1,lastOpId:opId,lastOpKind:'addon'}}
}
