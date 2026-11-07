import {serverTimestamp} from 'firebase/firestore'
const fail=code=>Object.assign(new Error(code),{code})
export function planPlatformSettings(shop,payload,{opId,uid}){
 const {rates,enabled}=payload,ids=shop.catalog.platformIds
 if(!Number.isSafeInteger(payload.expectedRevision)||payload.expectedRevision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
 if(!rates||typeof rates!=='object'||Array.isArray(rates)||Object.keys(rates).length!==ids.length||!ids.every(id=>Object.hasOwn(rates,id)&&Number.isSafeInteger(rates[id])&&rates[id]>=0&&rates[id]<10000))throw fail('INVALID_GP_SETTINGS')
 if(enabled!==undefined&&(!enabled||typeof enabled!=='object'||Array.isArray(enabled)||ids.length>4||Object.keys(enabled).length!==ids.length||!ids.every(id=>Object.hasOwn(enabled,id)&&typeof enabled[id]==='boolean')||!ids.some(id=>enabled[id])))throw fail('INVALID_CHANNEL_SETTINGS')
 const platforms={...shop.catalog.platforms}
 for(const id of ids){const row=platforms[id];platforms[id]={...row,active:enabled?.[id]??row.active,gpBasisPoints:rates[id],revision:row.revision+1}}
 const nextShop={...shop,catalog:{...shop.catalog,platforms},revision:shop.revision+1,catalogRevision:shop.catalogRevision+1,lastOpId:opId,lastOpKind:'platform_gp'}
 return {nextShop,nextMaterials:[],operation:{schemaVersion:2,kind:'platform_gp',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:nextShop.revision,rates:{...rates},...(enabled===undefined?{}:{enabled:{...enabled}})}}
}
