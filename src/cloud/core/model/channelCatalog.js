import {serverTimestamp} from 'firebase/firestore'

const fail=code=>Object.assign(new Error(code),{code})
const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(id)&&id!=='_'
const has=(object,key)=>Object.hasOwn(object,key)

export function channelProofCount(catalog){
 return Math.max(1,Math.ceil(Math.max(catalog.menuIds.length,catalog.addonIds.length,catalog.groupIds.length)/2))
}

export function planChannelCatalog(shop,{input,expectedRevision},{opId,uid}){
 if(expectedRevision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
 if(!input||!validId(input.id))throw fail('INVALID_CHANNEL_SETTINGS')
 const {id,name,gpBasisPoints,sourceId}=input,adding=has(input,'sourceId'),before=shop.catalog
 if(adding){
  if(Object.keys(input).length!==4||typeof name!=='string'||!name||name!==name.trim()||name.length>80||/\r|\n/.test(name)||!Number.isInteger(gpBasisPoints)||gpBasisPoints<0||gpBasisPoints>9999||!validId(sourceId)||!before.platformIds.includes(sourceId)||!before.platforms[sourceId].active)throw fail('INVALID_CHANNEL_SETTINGS')
  if(has(before.platforms,id))throw fail('CHANNEL_ID_USED')
  if(before.platformIds.length>=4)throw fail('CHANNEL_LIMIT')
 }else{
  if(Object.keys(input).length!==1||!before.platformIds.includes(id))throw fail('INVALID_CHANNEL_SETTINGS')
  if(!before.platformIds.some(key=>key!==id&&before.platforms[key].active))throw fail('LAST_ACTIVE_CHANNEL')
 }
 const catalog=structuredClone(before)
 function changeColumn(map){
  if(adding){if(!has(map,sourceId))throw fail('INVALID_CHANNEL_SETTINGS');map[id]=structuredClone(map[sourceId])}
  else delete map[id]
 }
 if(adding){catalog.platformIds.push(id);catalog.platforms[id]={active:false,revision:1,gpBasisPoints}}
 else{catalog.platformIds=catalog.platformIds.filter(key=>key!==id);delete catalog.platforms[id]}
 changeColumn(catalog.addonPrices)
 for(const row of Object.values(catalog.menus)){changeColumn(row.pricesCents);changeColumn(row.optionPrices)}
 for(const row of Object.values(catalog.addons))changeColumn(row.pricesCents)
 for(const row of Object.values(catalog.groups))changeColumn(row.optionPrices)
 const nextShop={...shop,catalog,revision:shop.revision+1,catalogRevision:shop.catalogRevision+1,lastOpId:opId,lastOpKind:'channel'}
 const operation={schemaVersion:2,kind:'channel',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:nextShop.revision,input:{...input}}
 return {nextShop,nextMaterials:[],operation}
}

export function applyChannelDisplay(display,platformIds,input){
 const {id,name,sourceId}=input,platforms=display.platforms||{}
 if(sourceId&&has(platforms,id))throw fail('CHANNEL_ID_USED')
 return {
  ...display,
  platformAvailabilityOrder:display.platformAvailabilityOrder||[...platformIds],
  ...(sourceId?{platforms:{...platforms,[id]:{name,sourcePlatformId:sourceId}}}:{})
 }
}
