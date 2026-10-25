// Build-time selection only. Importing this module does not initialize Firebase.
const loadersDefault={local:()=>import('../App.vue'),cloud:()=>import('../CloudApp.vue')}
export function readCloudConfiguration(env){
 const mode=env.VITE_DATA_MODE==='firebase'?'production':env.VITE_DATA_MODE==='firebase-emulator'?'emulator':null
 if(!mode)throw new Error('Explicit Firebase build mode is required')
 const shopId=env.VITE_FIREBASE_SHOP_ID
 if(typeof shopId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(shopId)||/^__.*__$/.test(shopId))throw new Error('Invalid Firebase shop ID')
 let raw
 try{raw=JSON.parse(env.VITE_FIREBASE_CONFIG)}catch{throw new Error('Invalid Firebase web configuration')}
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid Firebase web configuration')
 for(const field of ['apiKey','authDomain','projectId','appId']){
  if(typeof raw[field]!=='string'||!raw[field].trim())throw new Error(`Missing Firebase ${field}`)
 }
 if(!/^[a-z0-9-]+$/.test(raw.projectId)||(mode==='emulator')!==raw.projectId.startsWith('demo-'))throw new Error('Firebase project does not match build mode')
 const config=Object.fromEntries(['apiKey','authDomain','projectId','appId','storageBucket','messagingSenderId'].filter(k=>raw[k]!==undefined).map(k=>[k,raw[k]]))
 return {mode,config,shopId}
}
export async function loadApplication(env,loaders=loadersDefault){
 if(!env.VITE_DATA_MODE||env.VITE_DATA_MODE==='local')return {component:(await loaders.local()).default,props:{}}
 const connection=readCloudConfiguration(env)
 return {component:(await loaders.cloud()).default,props:{connection}}
}
