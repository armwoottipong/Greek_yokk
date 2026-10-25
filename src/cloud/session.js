import {onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut} from 'firebase/auth'
import {doc,onSnapshot} from 'firebase/firestore'
const sdkDefault={onAuthStateChanged,GoogleAuthProvider,signInWithPopup,signOut,doc,onSnapshot}
const userInfo=user=>user?{uid:user.uid,email:user.email||null,displayName:user.displayName||null}:null
const messages={
 'auth/popup-closed-by-user':'ยกเลิกการเข้าสู่ระบบแล้ว',
 'auth/popup-blocked':'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ กรุณาอนุญาตหน้าต่างป๊อปอัป',
 'auth/network-request-failed':'เชื่อมต่อไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่'
}

// Login/lifecycle readiness only. This module cannot enable sale writes; the
// certified command transport and pending-command gate must be added separately.
export function createShopSession({auth,db,shopId,onState},sdk=sdkDefault) {
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId||''))throw new Error('Invalid shopId')
 if(typeof onState!=='function')throw new Error('onState is required')
 let authStop=null,shopStop=null,epoch=0,disposed=false,popup=null
 let state={phase:'signed_out',user:null,shop:null,serverReady:false,code:null,message:''}
 const publish=patch=>{if(disposed)return;state={...state,...patch};onState({...state})}
 const stopShop=()=>{if(shopStop)shopStop();shopStop=null}
 const clear=(user=null)=>{epoch++;stopShop();publish({phase:user?'loading':'signed_out',user:userInfo(user),shop:null,serverReady:false,code:null,message:''})}
 const failure=(error,token)=>{
  if(disposed||token!==epoch)return
  publish({phase:'error',shop:null,serverReady:false,code:error?.code||'UNKNOWN',message:'โหลดข้อมูลร้านไม่ได้ กรุณาลองเชื่อมต่อใหม่'})
 }
 const acceptUser=user=>{
  if(disposed)return
  clear(user)
  if(!user)return
  const token=epoch
  shopStop=sdk.onSnapshot(sdk.doc(db,'shops',shopId),{includeMetadataChanges:true},snapshot=>{
   if(disposed||token!==epoch)return
   if(snapshot.metadata?.fromCache!==false){publish({phase:'loading',shop:null,serverReady:false});return}
   if(!snapshot.exists()){publish({phase:'setup_required',shop:null,serverReady:false});return}
   const data=snapshot.data()
   if(!['active','importing','maintenance'].includes(data.status)||typeof data.generation!=='string'||!data.generation){failure({code:'INVALID_SHOP'},token);return}
   publish({phase:data.status==='active'?'ready':data.status,shop:data,serverReady:data.status==='active',code:null,message:''})
  },error=>failure(error,token))
 }
 return {
  start(){
   if(disposed)throw new Error('Session disposed')
   if(authStop)return
   authStop=sdk.onAuthStateChanged(auth,acceptUser,error=>failure(error,epoch))
  },
  signIn(){
   if(disposed)return Promise.resolve({ok:false,code:'DISPOSED'})
   if(popup)return popup
   const token=epoch
   publish({phase:'signing_in',message:'',code:null})
   popup=(async()=>{
    try{await sdk.signInWithPopup(auth,new sdk.GoogleAuthProvider());return {ok:true}}
    catch(error){
     const code=error?.code||'UNKNOWN'
     if(!disposed&&token===epoch)publish({phase:state.user?'loading':'signed_out',code,message:messages[code]||'เข้าสู่ระบบไม่ได้ กรุณาลองใหม่'})
     return {ok:false,code}
    }finally{popup=null}
   })()
   return popup
  },
  async signOut(){
   if(disposed)return {ok:false,code:'DISPOSED'}
   clear()
   try{await sdk.signOut(auth);return {ok:true}}
   catch(error){return {ok:false,code:error?.code||'UNKNOWN'}}
  },
  dispose(){
   if(disposed)return
   clear()
   if(authStop)authStop()
   authStop=null;disposed=true
  }
 }
}
