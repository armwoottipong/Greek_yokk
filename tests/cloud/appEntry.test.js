import {it,expect,vi} from 'vitest'
import {loadApplication,readCloudConfiguration} from '../../src/cloud/appEntry.js'

const valid={VITE_DATA_MODE:'firebase',VITE_FIREBASE_SHOP_ID:'greek-yogg',VITE_FIREBASE_CONFIG:JSON.stringify({apiKey:'public-web-key',authDomain:'example.firebaseapp.com',projectId:'example-project',appId:'web-app'})}
it('loads only the existing POS when Firebase mode is not explicitly enabled',async()=>{
 const loaders={local:vi.fn(async()=>({default:'local'})),cloud:vi.fn()}
 expect(await loadApplication({},loaders)).toEqual({component:'local',props:{}})
 expect(loaders.local).toHaveBeenCalledOnce();expect(loaders.cloud).not.toHaveBeenCalled()
})
it('loads only the cloud entry and validates its explicit project/shop',async()=>{
 const loaders={local:vi.fn(),cloud:vi.fn(async()=>({default:'cloud'}))}
 expect(await loadApplication(valid,loaders)).toMatchObject({component:'cloud',props:{connection:{mode:'production',shopId:'greek-yogg',config:{projectId:'example-project'}}}})
 expect(loaders.local).not.toHaveBeenCalled()
})
it.each([
 {...valid,VITE_DATA_MODE:'typo'},
 {...valid,VITE_FIREBASE_CONFIG:'invalid'},
 {...valid,VITE_FIREBASE_SHOP_ID:'../shop'},
 {...valid,VITE_FIREBASE_CONFIG:'{}'},
 {...valid,VITE_FIREBASE_CONFIG:JSON.stringify({...JSON.parse(valid.VITE_FIREBASE_CONFIG),projectId:'demo-unintended'})},
 {...valid,VITE_DATA_MODE:'firebase-emulator'},
])('fails closed before loading any app for invalid configuration',async env=>{
 const loaders={local:vi.fn(),cloud:vi.fn()}
 await expect(loadApplication(env,loaders)).rejects.toThrow()
 expect(loaders.local).not.toHaveBeenCalled();expect(loaders.cloud).not.toHaveBeenCalled()
})
it('accepts an explicit demo-project emulator configuration',()=>{
 const env={...valid,VITE_DATA_MODE:'firebase-emulator',VITE_FIREBASE_CONFIG:JSON.stringify({...JSON.parse(valid.VITE_FIREBASE_CONFIG),projectId:'demo-greek-yogg'})}
 expect(readCloudConfiguration(env)).toMatchObject({mode:'emulator',shopId:'greek-yogg',config:{projectId:'demo-greek-yogg'}})
})
