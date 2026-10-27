import {serverTimestamp} from 'firebase/firestore'
const fail=code=>Object.assign(new Error(code),{code})
export function planPlatformSettings(shop,payload,{opId,uid}){
 const rates=payload.rates,ids=shop.catalog.platformIds
 if(!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
 if(!rates||typeof rates!=='object'||Array.isArray(rates)||Object.keys(rates).length!==ids.length||!ids.every(id=>Object.hasOwn(rates,id)&&Number.isSafeInteger(rates[id])&&rates[id]>=0&&rates[id]<10000))throw fail('INVALID_GP_SETTINGS')
 const nextShop=structuredClone(shop)
 for(const id of ids)nextShop.catalog.platforms[id]={...nextShop.catalog.platforms[id],gpBasisPoints:rates[id],revision:nextShop.catalog.platforms[id].revision+1}
 nextShop.revision++;nextShop.catalogRevision++;nextShop.lastOpId=opId;nextShop.lastOpKind='platform_gp'
 return {nextShop,nextMaterials:[],operation:{schemaVersion:2,kind:'platform_gp',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:nextShop.revision,rates:structuredClone(rates)}}
}
