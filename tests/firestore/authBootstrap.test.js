import {it,expect} from 'vitest'
import {initializeApp,deleteApp} from 'firebase/app'
import {signInWithCredential,GoogleAuthProvider,signOut,deleteUser,initializeAuth,inMemoryPersistence,connectAuthEmulator} from 'firebase/auth'
import {initializeFirestore,memoryLocalCache,connectFirestoreEmulator} from 'firebase/firestore'
import {createFirebaseClientFactory} from '../../src/cloud/firebaseClient.js'
import {assertEmulatorTarget} from './helpers.js'

it('initializes the real SDK against local demo Auth and signs in with Google without role setup',async()=>{
 assertEmulatorTarget('demo-greek-yogg')
 // Node SDK has no popup resolver/sessionStorage. Only the test adapter uses
 // in-memory Auth; browser persistence/resolver wiring is tested separately.
 const nodeSdk={initializeApp,initializeAuth:app=>initializeAuth(app,{persistence:inMemoryPersistence}),
  browserSessionPersistence:inMemoryPersistence,connectAuthEmulator,initializeFirestore,memoryLocalCache,connectFirestoreEmulator}
 const client=createFirebaseClientFactory(nodeSdk)({mode:'emulator',config:{apiKey:'demo-key',authDomain:'demo-greek-yogg.firebaseapp.com',projectId:'demo-greek-yogg',appId:'demo-auth-bootstrap'}})
 const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url')
 const now=Math.floor(Date.now()/1000),sub=`bootstrap-${now}-${Math.random().toString(36).slice(2)}`
 const token=encode({alg:'none',typ:'JWT'})+'.'+encode({iss:'https://accounts.google.com',sub,aud:'demo-client',iat:now,exp:now+3600,email:`${sub}@example.test`,email_verified:true})+'.'
 try {
  expect(client.auth.emulatorConfig.host).toBe('127.0.0.1')
  const result=await signInWithCredential(client.auth,GoogleAuthProvider.credential(token))
  expect(result.user.email).toBe(`${sub}@example.test`)
  expect(result.user.providerData[0].providerId).toBe('google.com')
  expect(client.auth.currentUser.uid).toBe(result.user.uid)
  await deleteUser(result.user)
  await signOut(client.auth)
  expect(client.auth.currentUser).toBe(null)
 }finally{await deleteApp(client.app)}
})
