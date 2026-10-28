import {doc,collection,query,orderBy,limit,onSnapshot,runTransaction,setDoc,serverTimestamp} from 'firebase/firestore'
const sdkDefault={doc,collection,query,orderBy,limit,onSnapshot,runTransaction,setDoc,serverTimestamp}
export function allowedEmailMap(values){
 if(!Array.isArray(values)||!values.length||values.length>50)throw new Error('INVALID_EMAILS')
 const emails=values.map(v=>String(v).trim().toLowerCase())
 if(emails.some(v=>v.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))||new Set(emails).size!==emails.length)throw new Error('INVALID_EMAILS')
 return Object.fromEntries(emails.sort().map(email=>[email,true]))
}
const same=(a,b)=>JSON.stringify(Object.keys(a||{}).sort())===JSON.stringify(Object.keys(b||{}).sort())
export const googlePhoto=url=>typeof url==='string'&&/^https:\/\/[^/]+\.googleusercontent\.com\//.test(url)&&url.length<=1000?url:''
export function createShopAccess({db,shopId,getUser,onPresence=()=>{},onError=()=>{}},sdk=sdkDefault){
 if(!/^[A-Za-z0-9_-]{1,120}$/.test(shopId))throw new Error('Invalid shopId')
 let disposed=false,stop=null,writing=false,saving=false
 const root=sdk.doc(db,'shops',shopId)
 return {
  watch(){
   if(disposed||stop)return
   stop=sdk.onSnapshot(sdk.query(sdk.collection(db,'shops',shopId,'presence'),sdk.orderBy('lastSeen','desc'),sdk.limit(50)),{includeMetadataChanges:true},snapshot=>{
    if(disposed)return
    if(snapshot.metadata?.fromCache!==false){onPresence([]);return}
    onPresence(snapshot.docs.map(d=>({uid:d.id,...d.data()})))
   },()=>{if(!disposed){onPresence([]);onError('PRESENCE_UNAVAILABLE')}})
  },
  async heartbeat(){
   const user=getUser();if(disposed||writing||!user?.uid||!user.email)return
   writing=true
   try{await sdk.setDoc(sdk.doc(db,'shops',shopId,'presence',user.uid),{email:user.email.toLowerCase(),displayName:(user.displayName||'').slice(0,120),photoURL:googlePhoto(user.photoURL),lastSeen:sdk.serverTimestamp()})}
   catch{if(!disposed)onError('PRESENCE_UNAVAILABLE')}
   finally{writing=false}
  },
  async save(emails,expected){
   if(disposed||saving)throw new Error('ACCESS_BUSY')
   const user=getUser(),map=allowedEmailMap(emails)
   if(!user?.email||!map[user.email.toLowerCase()])throw new Error('KEEP_CURRENT_EMAIL')
   saving=true
   const opId=crypto.randomUUID()
   try{return await sdk.runTransaction(db,async tx=>{
    if(disposed||getUser()?.uid!==user.uid)throw new Error('SESSION_CHANGED')
    const snapshot=await tx.get(root)
    if(!snapshot.exists())throw new Error('SHOP_NOT_FOUND')
    const live=snapshot.data()
    if(!same(live.allowedEmails,expected))throw new Error('ACCESS_CONFLICT')
    if(!live.allowedEmails?.[user.email.toLowerCase()])throw new Error('ACCESS_DENIED')
    tx.update(root,{allowedEmails:map,revision:live.revision+1,lastOpKind:'access',lastOpId:opId})
    return map
   })}finally{saving=false}
  },
  close(){disposed=true;stop?.();stop=null;onPresence([])}
 }
}
