import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env,f
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{
 await env.clearFirestore();f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
 f.shop.allowedEmails={'admin@example.com':true,'manager@example.com':true,'viewer@example.com':true}
 f.shop.userRoles={'admin@example.com':'admin','manager@example.com':'manager','viewer@example.com':'viewer'}
 await seedSetCatalog(env,f)
})
afterAll(async()=>{await env?.cleanup()})
it.each(['admin','manager','viewer','unlisted'])('enforces %s authorization for command closure',async uid=>{
 const db=env.authenticatedContext(uid,{email:uid+'@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
 const transport=createCoreTransport({db,getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:uid,online:true,ready:true})})
 const result=transport.abortInventory({opId:'PENDING',kind:'material_metadata',payload:{expectedRevision:f.shop.revision}})
 if(['admin','manager'].includes(uid))expect(await result).toMatchObject({rejected:true})
 else await expect(result).rejects.toMatchObject({code:'permission-denied'})
})
