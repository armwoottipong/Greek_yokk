import {initializeApp} from 'firebase/app'
import {initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,browserSessionPersistence,browserPopupRedirectResolver,connectAuthEmulator} from 'firebase/auth'
import {initializeFirestore,memoryLocalCache,connectFirestoreEmulator} from 'firebase/firestore'

const sdkDefault={initializeApp,initializeAuth,indexedDBLocalPersistence,browserLocalPersistence,browserSessionPersistence,browserPopupRedirectResolver,
  connectAuthEmulator,initializeFirestore,memoryLocalCache,connectFirestoreEmulator}
const fields=['apiKey','authDomain','projectId','appId','storageBucket','messagingSenderId']

// Creating/importing this module does not connect to Firebase. The caller must
// explicitly select production or a demo-project Emulator before initialization.
export function createFirebaseClientFactory(sdk=sdkDefault) {
 const clients=new Map()
 return ({mode,config}={})=>{
  if(!['production','emulator'].includes(mode))throw new Error('Explicit Firebase mode is required')
  for(const field of ['apiKey','authDomain','projectId','appId']) {
   if(typeof config?.[field]!=='string'||!config[field].trim())throw new Error(`Missing Firebase ${field}`)
  }
  if(!/^[a-z0-9-]+$/.test(config.projectId))throw new Error('Invalid Firebase projectId')
  if(mode==='emulator'&&!config.projectId.startsWith('demo-'))throw new Error('Emulator requires a demo- project')
  if(mode==='production'&&config.projectId.startsWith('demo-'))throw new Error('Production cannot use a demo- project')
  const clean=Object.fromEntries(fields.filter(field=>config[field]!==undefined).map(field=>[field,config[field]]))
  const key=`${mode}:${config.projectId}`,signature=JSON.stringify(clean),existing=clients.get(key)
  if(existing) {
   if(existing.signature!==signature)throw new Error('Firebase configuration changed for an initialized project')
   return existing.client
  }
  const app=sdk.initializeApp(clean,`greek-yogg-${mode}-${config.projectId}`)
  const auth=sdk.initializeAuth(app,{persistence:[sdk.indexedDBLocalPersistence,sdk.browserLocalPersistence,sdk.browserSessionPersistence],popupRedirectResolver:sdk.browserPopupRedirectResolver})
  const db=sdk.initializeFirestore(app,{localCache:sdk.memoryLocalCache()})
  if(mode==='emulator') {
   sdk.connectAuthEmulator(auth,'http://127.0.0.1:9098',{disableWarnings:true})
   sdk.connectFirestoreEmulator(db,'127.0.0.1',8088)
  }
  const client=Object.freeze({app,auth,db,mode,projectId:config.projectId})
  clients.set(key,{signature,client})
  return client
 }
}
export const getFirebaseClient=createFirebaseClientFactory()
