import { serverTimestamp } from 'firebase/firestore'

const clone=value=>structuredClone(value)
const validMap=value=>!!value&&typeof value==='object'&&!Array.isArray(value)
const validId=id=>typeof id==='string'&&id!=='_'&&/^[A-Za-z0-9_-]{1,200}$/.test(id)

export function summaryPlatform(shop,_materials,input,{opId='PLATFORM',uid='cashier'}={}){
  const catalog=shop?.catalog,platformIds=catalog?.platformIds,platforms=catalog?.platforms
  if(!input||typeof input!=='object'||Array.isArray(input)||!validId(input.id)||
    !Object.keys(input).every(key=>['id','name','emoji','active','gpBasisPoints','sourcePlatformId'].includes(key))||
    typeof input.name!=='string'||!input.name.trim()||input.name.length>200||typeof (input.emoji??'')!=='string'||(input.emoji??'').length>32||
    typeof (input.active??true)!=='boolean'||!Number.isInteger(input.gpBasisPoints)||input.gpBasisPoints<0||input.gpBasisPoints>9999||
    input.sourcePlatformId!==undefined&&typeof input.sourcePlatformId!=='string'||!Array.isArray(platformIds)||platformIds.length>4||
    new Set(platformIds).size!==platformIds.length||!validMap(platforms)||
    !Array.isArray(catalog.menuIds)||catalog.menuIds.length>64)throw new Error('Invalid platform command')
  const old=platforms[input.id],create=old===undefined
  if(create){
    const sourceId=input.sourcePlatformId,source=platforms[sourceId]
    if(platformIds.includes(input.id)||typeof sourceId!=='string'||!platformIds.includes(sourceId)||!source||source.active!==true||platformIds.length>=4)throw new Error('Invalid platform source or capacity')
  }else if(!platformIds.includes(input.id)||input.sourcePlatformId!==undefined&&input.sourcePlatformId!=='')throw new Error('Invalid platform edit')
  const sourcePlatformId=create?input.sourcePlatformId:'',beforePlatform=create?{}:clone(old)
  const activeCount=platformIds.filter(id=>platforms[id]?.active===true&&id!==input.id).length+((input.active??true)?1:0)
  if(activeCount<1)throw new Error('At least one platform must remain active')

  const nextCatalog=clone(catalog),emoji=input.emoji??'',active=input.active??true
  const entitySnapshot=create?{revision:1,active,gpBasisPoints:input.gpBasisPoints,name:input.name,emoji}:
    {...clone(old),revision:old.revision+1,active,gpBasisPoints:input.gpBasisPoints,name:input.name,emoji}
  nextCatalog.platforms[input.id]=entitySnapshot
  if(create){
    const requireColumn=(map,sourceId)=>{
      if(!validMap(map)||!Object.hasOwn(map,sourceId))throw new Error('Missing source price column')
      return clone(map[sourceId])
    }
    for(const menu of Object.values(nextCatalog.menus||{})){
      menu.pricesCents[input.id]=requireColumn(menu.pricesCents,sourcePlatformId)
      menu.optionPrices[input.id]=requireColumn(menu.optionPrices,sourcePlatformId)
    }
    for(const addon of Object.values(nextCatalog.addons||{}))addon.pricesCents[input.id]=requireColumn(addon.pricesCents,sourcePlatformId)
    for(const group of Object.values(nextCatalog.groups||{}))group.optionPrices[input.id]=requireColumn(group.optionPrices,sourcePlatformId)
    nextCatalog.addonPrices[input.id]=requireColumn(nextCatalog.addonPrices,sourcePlatformId)
    nextCatalog.platformIds.push(input.id)
  }
  const nextShop={...clone(shop),catalog:nextCatalog,catalogRevision:shop.catalogRevision,revision:shop.revision+1,lastOpId:opId,lastOpKind:'platform'}
  const nextMaterials=[]
  const operation={schemaVersion:2,kind:'platform',status:'committed',opId,uid,createdAt:serverTimestamp(),entityId:input.id,create,sourcePlatformId,
    beforePlatform,entitySnapshot:clone(entitySnapshot),sourceCatalogRevision:shop.catalogRevision,shopRevision:nextShop.revision,materialIds:[]}
  return {nextShop,nextMaterials,operation}
}
