import {describe,it,expect,vi} from 'vitest'
import {createFirebaseClientFactory} from '../../src/cloud/firebaseClient.js'
const config={apiKey:'demo-key',authDomain:'demo-test.firebaseapp.com',projectId:'demo-test',appId:'demo-app'}
function sdkMock() {
 const app={},auth={},db={},memory={}
 return {app,auth,db,memory,initializeApp:vi.fn(()=>app),initializeAuth:vi.fn(()=>auth),
  initializeFirestore:vi.fn(()=>db),memoryLocalCache:vi.fn(()=>memory),browserSessionPersistence:{type:'session'},browserPopupRedirectResolver:{},
  connectAuthEmulator:vi.fn(),connectFirestoreEmulator:vi.fn()}
}
describe('explicit Firebase bootstrap without live test traffic',()=>{
 it('does not initialize anything on factory creation',()=>{
  const sdk=sdkMock();createFirebaseClientFactory(sdk)
  expect(sdk.initializeApp).not.toHaveBeenCalled()
 })
 it.each([undefined,'auto','local'])('refuses missing or unknown mode %s before initializing',mode=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk)
  expect(()=>factory({mode,config})).toThrow('mode')
  expect(sdk.initializeApp).not.toHaveBeenCalled()
 })
 it('refuses emulator mode with a live project before initializing',()=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk)
  expect(()=>factory({mode:'emulator',config:{...config,projectId:'yoggie-db'}})).toThrow('demo-')
  expect(sdk.initializeApp).not.toHaveBeenCalled()
 })
 it('refuses production mode with a demo project',()=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk)
  expect(()=>factory({mode:'production',config})).toThrow('demo-')
  expect(sdk.initializeApp).not.toHaveBeenCalled()
 })
 it.each(['apiKey','authDomain','appId','projectId'])('rejects missing %s without falling back',field=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk)
  expect(()=>factory({mode:'emulator',config:{...config,[field]:''}})).toThrow(field)
  expect(sdk.initializeApp).not.toHaveBeenCalled()
 })
 it('uses memory-only Firestore, per-tab auth persistence and only the fixed local emulators',()=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk),client=factory({mode:'emulator',config})
  expect(client).toMatchObject({app:sdk.app,auth:sdk.auth,db:sdk.db,mode:'emulator',projectId:'demo-test'})
  expect(sdk.initializeAuth).toHaveBeenCalledWith(sdk.app,{persistence:sdk.browserSessionPersistence,popupRedirectResolver:sdk.browserPopupRedirectResolver})
  expect(sdk.initializeFirestore).toHaveBeenCalledWith(sdk.app,{localCache:sdk.memory})
  expect(sdk.connectAuthEmulator).toHaveBeenCalledWith(sdk.auth,'http://127.0.0.1:9098',{disableWarnings:true})
  expect(sdk.connectFirestoreEmulator).toHaveBeenCalledWith(sdk.db,'127.0.0.1',8088)
 })
 it('reuses one client and refuses a changed config under the same project/mode',()=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk),first=factory({mode:'emulator',config})
  expect(factory({mode:'emulator',config})).toBe(first)
  expect(()=>factory({mode:'emulator',config:{...config,appId:'different'}})).toThrow('configuration')
  expect(sdk.initializeApp).toHaveBeenCalledTimes(1)
 })
 it('does not connect production to an emulator or pass Analytics config',()=>{
  const sdk=sdkMock(),factory=createFirebaseClientFactory(sdk)
  factory({mode:'production',config:{...config,projectId:'yoggie-db',measurementId:'NO-ANALYTICS'}})
  expect(sdk.connectAuthEmulator).not.toHaveBeenCalled();expect(sdk.connectFirestoreEmulator).not.toHaveBeenCalled()
  expect(sdk.initializeApp.mock.calls[0][0]).not.toHaveProperty('measurementId')
 })
})
