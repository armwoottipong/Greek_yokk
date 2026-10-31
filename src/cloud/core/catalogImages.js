import {doc,onSnapshot,runTransaction,serverTimestamp} from 'firebase/firestore'
import {validateImage} from '../../domain/catalogImage.js'
const sdkDefault={doc,onSnapshot,runTransaction,serverTimestamp}
const fail=code=>Object.assign(new Error(code),{code})
const identity=['projectId','shopId','generation','uid']
export const imageKey=(kind,id)=>{
 if(!['menus','materials'].includes(kind)||typeof id!=='string'||!id||id.length>160||id.includes('/'))throw fail('INVALID_IMAGE_ENTITY')
 return `${kind}_${id}`
}
export function createCatalogImages({db,getContext},sdk=sdkDefault){
 let closed=false
 const listeners=new Set()
 function guard(s){const c=getContext();if(closed||!c?.ready||!c.online||!['admin','manager'].includes(c.role))throw fail('NOT_READY');if(identity.some(k=>!s[k]||s[k]!==c[k]))throw fail('CONTEXT_CHANGED')}
 const path=(s,key)=>`shops/${s.shopId}/generations/${s.generation}/catalogImages/${key}`
 return {
  watch(kind,id,onValue,onError){
   const s={...getContext()},key=imageKey(kind,id);guard(s)
   const off=sdk.onSnapshot(sdk.doc(db,path(s,key)),row=>{try{guard(s);const data=row.exists()?row.data():{dataURL:'',revision:0};validateImage(data.dataURL);onValue(data)}catch(e){onError(e)}},onError)
   const stop=()=>{off();listeners.delete(stop)};listeners.add(stop);return stop
  },
  async save(kind,id,dataURL,expectedRevision){
   const s={...getContext()},key=imageKey(kind,id);guard(s);validateImage(dataURL)
   if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw fail('INVALID_IMAGE_REVISION')
   const result=await sdk.runTransaction(db,async t=>{
    guard(s)
    const root=await t.get(sdk.doc(db,`shops/${s.shopId}`));guard(s)
    if(!root.exists()||root.data().status!=='active'||root.data().generation!==s.generation)throw fail('SHOP_NOT_READY')
    if(kind==='menus'&&!root.data().catalog?.menus?.[id])throw fail('IMAGE_ENTITY_MISSING')
    if(kind==='materials'){const target=await t.get(sdk.doc(db,`shops/${s.shopId}/generations/${s.generation}/materials/${id}`));guard(s);if(!target.exists())throw fail('IMAGE_ENTITY_MISSING')}
    const ref=sdk.doc(db,path(s,key)),row=await t.get(ref);guard(s)
    if((row.exists()?row.data().revision:0)!==expectedRevision)throw fail('IMAGE_CONFLICT')
    const next={kind,entityId:id,dataURL,revision:expectedRevision+1,updatedBy:s.uid,updatedAt:sdk.serverTimestamp()}
    t.set(ref,next);return next
   });guard(s);return result
  },
  close(){closed=true;for(const stop of [...listeners])stop()}
 }
}
