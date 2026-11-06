import {doc,runTransaction,serverTimestamp,onSnapshot} from 'firebase/firestore'
import {reorderExact,menuOrderFields} from '../../domain/catalogOrdering.js'
const defaults={doc,runTransaction,serverTimestamp,onSnapshot}
const fail=code=>Object.assign(new Error(code),{code})
export function createCatalogOrdering({db,getContext},sdk=defaults){
 let closed=false
 const listeners=new Set(),identity=['projectId','shopId','generation','uid']
 const path=s=>`shops/${s.shopId}/generations/${s.generation}/display/catalog`
 function guard(s){
  const c=getContext()
  if(closed||!c?.ready||!c.online||!['admin','manager'].includes(c.role))throw fail('NOT_READY')
  if(identity.some(key=>!s[key]||s[key]!==c[key]))throw fail('CONTEXT_CHANGED')
 }
 return {
  async saveMenuOrder(ids,{expectedOrderRevision,expectedCatalogRevision}={}){
   const s={...getContext()};guard(s)
   if(!Array.isArray(ids)||!ids.length||ids.length>64||ids.some(id=>typeof id!=='string'))throw fail('INVALID_CATALOG_ORDER')
   if(!Number.isSafeInteger(expectedOrderRevision)||expectedOrderRevision<0||!Number.isSafeInteger(expectedCatalogRevision)||expectedCatalogRevision<0)throw fail('CATALOG_ORDER_CHANGED')
   const result=await sdk.runTransaction(db,async transaction=>{
    guard(s)
    const root=await transaction.get(sdk.doc(db,`shops/${s.shopId}`)),display=await transaction.get(sdk.doc(db,path(s)));guard(s)
    if(!root.exists()||root.data().status!=='active'||root.data().generation!==s.generation||!display.exists())throw fail('SHOP_NOT_READY')
    const shop=root.data(),before=display.data()
    if(shop.catalogRevision!==expectedCatalogRevision||(before.menuOrderRevision||0)!==expectedOrderRevision)throw fail('CATALOG_ORDER_CHANGED')
    const allIds=shop.catalog.menuIds||Object.keys(shop.catalog.menus)
    const visible=allIds.filter(id=>!before.menus?.[id]?.deleted).map(id=>({id}))
    reorderExact(visible,ids)
    // Keep tombstones at the end so Rules can prove no catalog identity is lost.
    const next={menuOrder:ids.concat(allIds.filter(id=>!ids.includes(id))),menuOrderRevision:expectedOrderRevision+1,menuOrderCatalogRevision:expectedCatalogRevision,menuOrderUpdatedBy:s.uid,menuOrderUpdatedAt:sdk.serverTimestamp()}
    transaction.update(sdk.doc(db,path(s)),next)
    return next
   });guard(s);return result
  },
  watchMenuOrder(onValue,onError){
   const s={...getContext()};guard(s)
   const off=sdk.onSnapshot(sdk.doc(db,path(s)),{includeMetadataChanges:true},row=>{
    try{guard(s);if(row.exists()&&!row.metadata?.fromCache)onValue(menuOrderFields(row.data()))}catch(error){onError(error)}
   },onError)
   const stop=()=>{off();listeners.delete(stop)};listeners.add(stop);return stop
  },
  close(){closed=true;for(const stop of [...listeners])stop()}
 }
}
