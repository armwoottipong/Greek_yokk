import { serverTimestamp } from 'firebase/firestore'
import { summaryFixture } from './summaryFixture.js'
import { materialRegistryShop } from './summaryMaterialAuthor.js'

// Independent trusted initial-state and hand-built command oracle.
export function typeFixture({menus=4,fourLots=false}={}){
  const base=summaryFixture(fourLots?{prepareMaterials:materials=>{for(const m of materials){m.lots=[500,500,1000,998000].map((qty,i)=>({...m.lots[0],id:`${m.id}-${i}`,qty,isInUse:i===0,receiveDay:20000+i}));m.activeLotId=m.lots[0].id}}}:{}),c=base.shop.catalog
  while(c.menuIds.length<menus){const id=`TYPE-MENU-${c.menuIds.length}`;c.menuIds.push(id);c.menus[id]={...structuredClone(c.menus.SIMPLE),id}}
  for(const menu of Object.values(c.menus)){
    menu.rawRecipe={...structuredClone(menu.recipe),S11:100};menu.hasPackage=menu.id!=='SIMPLE'
    menu.recipe=Object.fromEntries(Object.entries(menu.rawRecipe).filter(([id])=>menu.hasPackage||base.materials.find(m=>m.id===id).inventoryType!=='packaging'))
    menu.materialIds=[...new Set([...menu.materialIds,...Object.keys(menu.rawRecipe)])]
  }
  for(const m of base.materials)m.recipeIndex.menus={_:0,...Object.fromEntries(c.menuIds.map(id=>[id,c.menus[id].recipe[m.id]||0]))}
  base.shop=materialRegistryShop(base.shop,base.materials)
  const target=base.materials[11],opId='TYPE',inventoryType='ingredient'
  const nextShop={...structuredClone(base.shop),revision:base.shop.revision+1,catalogRevision:base.shop.catalogRevision+1,lastOpId:opId,lastOpKind:'material_type'}
  const nextMaterials=base.materials.map((m,i)=>({...structuredClone(m),inventoryType:m.id===target.id?inventoryType:m.inventoryType,
    revision:m.revision+1,lastOpId:opId,lastOpKind:'material_type',lastOpIndex:i,
    recipeIndex:{...structuredClone(m.recipeIndex),catalogRevision:nextShop.catalogRevision,
      menus:m.id===target.id?{_:0,...Object.fromEntries(c.menuIds.map(id=>[id,c.menus[id].rawRecipe[m.id]||0]))}:structuredClone(m.recipeIndex.menus)}}))
  return {base,f:{nextShop,nextMaterials,operation:{schemaVersion:2,kind:'material_type',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),
    targetId:target.id,targetRevision:target.revision,previousType:target.inventoryType,inventoryType,sourceCatalogRevision:base.shop.catalogRevision,
    shopRevision:nextShop.revision,materialIds:[...c.summaryMaterials]}}}
}
