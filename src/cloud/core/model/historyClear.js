import {serverTimestamp} from 'firebase/firestore'

export function planHistoryClear(shop,{opId,uid}){
 if(!Number.isSafeInteger(shop.revision)||shop.revision<0)throw new Error('Invalid shop revision')
 const revision=shop.revision+1
 return {nextShop:{...structuredClone(shop),revision,lastOpId:opId,lastOpKind:'history_clear',inventoryHistoryCutoff:revision},nextMaterials:[],operation:{schemaVersion:2,kind:'history_clear',status:'committed',opId,uid,createdAt:serverTimestamp(),shopRevision:revision,clearedThroughRevision:revision}}
}
