import { summaryMenu } from './catalog.js'

// Prepared recipe and two-group menu binding planner.
export function summaryPreparedMenu(shop,materials,input,options){
  const hasRaw=!!input&&Object.hasOwn(input,'rawRecipe'),hasPackage=!!input&&Object.hasOwn(input,'hasPackage')
  if(hasRaw!==hasPackage)throw new Error('Prepared recipe fields must be paired')
  const assigned=menu=>menu?.groupIds?.length?menu.groupIds:menu?.groupId?[menu.groupId]:[]
  const old=shop?.catalog?.menus?.[input?.id],previous=assigned(old),next=input?.groupIds??assigned(input)
  if(old&&Object.hasOwn(old,'rawRecipe')&&!hasRaw)throw new Error('Declared recipe cannot be discarded')
  if(!Array.isArray(next)||next.length>2||new Set(next).size!==next.length||next.some(id=>!shop.catalog.groups?.[id]?.active||next.length===2&&!(shop.catalog.groups[id].max<=3)))throw new Error('Invalid menu group binding')
  const canonical={...structuredClone(input)}
  delete canonical.groupIds;delete canonical.groupId
  if(next.length===1)canonical.groupId=next[0]
  if(next.length===2){
    canonical.priceMode='addon';canonical.optionIds=[];canonical.min=0;canonical.max=0
    canonical.optionPrices=Object.fromEntries(shop.catalog.platformIds.map(platformId=>[platformId,{_:0}]))
  }
  if(hasRaw){
    if(!input.rawRecipe||typeof input.rawRecipe!=='object'||Array.isArray(input.rawRecipe)||typeof input.hasPackage!=='boolean')throw new Error('Invalid prepared recipe')
    const materialIds=shop?.catalog?.summaryMaterials
    if(!Array.isArray(materialIds))throw new Error('Invalid prepared material registry')
    const entries=Object.entries(input.rawRecipe)
    for(const [id,quantity] of entries){
      const material=materials.find(item=>item.id===id)
      if(!materialIds.includes(id)||!material||material.deleted||!['ingredient','packaging'].includes(material.inventoryType)||
        !Number.isSafeInteger(quantity)||quantity<0||quantity>1000000000)throw new Error('Invalid prepared recipe row')
    }
    const rawRecipe=structuredClone(input.rawRecipe)
    canonical.rawRecipe=rawRecipe;canonical.hasPackage=input.hasPackage
    canonical.recipe=Object.fromEntries(entries.filter(([id])=>input.hasPackage||materials.find(item=>item.id===id).inventoryType!=='packaging'))
  }
  const result=summaryMenu(shop,materials,canonical,options)
  const menu=result.nextShop.catalog.menus[input.id]
  if(hasRaw)menu.materialIds=[...new Set([...menu.materialIds,...Object.keys(input.rawRecipe)])]
  const groups=structuredClone(shop.catalog.groups)
  for(const id of new Set([...previous,...next])){
    const group=groups[id],was=previous.includes(id),now=next.includes(id),wasMulti=was&&previous.length===2,nowMulti=now&&next.length===2
    if(was&&!now)group.menuIds=group.menuIds.filter(key=>key!==input.id)
    if(!was&&now)group.menuIds.push(input.id)
    if(wasMulti!==nowMulti)group.multiMenuIds=nowMulti?(group.multiMenuIds||[]).concat(input.id):(group.multiMenuIds||[]).filter(key=>key!==input.id)
  }
  result.nextShop.catalog.groups=groups
  if(next.length===2)menu.groupIds=[...next]
  result.operation.entitySnapshot=structuredClone(menu)
  return result
}
