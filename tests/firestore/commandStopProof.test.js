import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDoc,setDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {ROOT,GENERATION} from './proofFixture.js'
let env,f
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore();f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials);await seedSetCatalog(env,f)})
afterAll(async()=>{await env?.cleanup()})
function setup(uid='cashier'){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:uid,online:true,ready:true}
 const db=env.authenticatedContext(uid).firestore();return {db,api:createCoreTransport({db,getContext:()=>context})}
}
function command(opId='STOP-ME'){return {opId,kind:'material_metadata',payload:{materialId:f.materials[0].id,metadata:{name:'must not apply',emoji:'',minAlertQ:0},expectedRevision:f.shop.revision}}}
it('stops an uncommitted inventory command without changing balances and fences late attempts',async()=>{
 const {api,db}=setup(),c=command(),before=await api.snapshot()
 expect(await api.abortInventory(c)).toMatchObject({rejected:true,code:'COMMAND_STOPPED'})
 const after=await api.snapshot();expect(after.materials).toEqual(before.materials);expect(after.shop.revision).toBe(before.shop.revision+1)
 expect((await api.commit(c)).kind).toBe('command_abort')
 // The server must also fence a client that rebuilds the same operation ID.
 await expect(api.commit({...c,payload:{...c.payload,expectedRevision:after.shop.revision}})).rejects.toBeDefined()
 const marker=doc(db,`${GENERATION}/operations/${c.opId}`),closed=await getDoc(marker)
 expect(closed.exists()).toBe(true)
 expect(closed.data()).toMatchObject({uid:'cashier',sourceKind:c.kind,sourceRevision:before.shop.revision})
 await assertFails(setDoc(marker,{...closed.data(),sourceKind:'SOMETHING-ELSE'}))
 expect(await api.abortInventory(c)).toMatchObject({receipt:{kind:'command_abort'}})
})
it('returns the committed receipt if the original command won the race',async()=>{
 const {api}=setup(),c=command();const receipt=await api.commit(c)
 expect(await api.abortInventory(c)).toEqual({receipt})
})
it('can only commit or stop when independently running tabs race',async()=>{
 const a=setup(),b=setup(),c=command('RACE')
 const results=await Promise.allSettled([a.api.commit(c),b.api.abortInventory(c)])
 const receipt=await a.api.receipt(c.kind,c.opId),snapshot=await a.api.snapshot()
 expect(results[1].status).toBe('fulfilled')
 if(receipt?.kind!=='command_abort'){expect(results[1].value).toEqual({receipt});expect(snapshot.materials[0].name).toBe('must not apply')}
 else{expect(results[1].value.rejected||results[1].value.receipt?.kind==='command_abort').toBeTruthy();expect(snapshot.materials[0].name).toBe(f.materials[0].name)}
 expect(snapshot.shop.revision).toBe(f.shop.revision+1)
})
it.each(['stock','catalog','revision','sourceReceipt','omitClosure'])('rejects a forged stop with %s changes',async tamper=>{
 const {db}=setup(),source=command(),id=source.opId,operation={schemaVersion:2,kind:'command_abort',status:'committed',opId:id,uid:'cashier',sourceKind:source.kind,sourceRevision:f.shop.revision,shopRevision:f.shop.revision+1}
 const {serverTimestamp}=await import('firebase/firestore');operation.createdAt=serverTimestamp()
 const root={...f.shop,revision:f.shop.revision+1,lastOpId:id,lastOpKind:'command_abort'}
 const batch=writeBatch(db)
 if(tamper==='stock')batch.set(doc(db,`${GENERATION}/materials/${f.materials[0].id}`),{...f.materials[0],stock:0})
 if(tamper==='catalog')root.catalog={...root.catalog,menuIds:[]}
 if(tamper==='revision')root.revision++
 if(tamper==='sourceReceipt')operation.sourceKind='sale'
 if(tamper!=='omitClosure')batch.set(doc(db,`${GENERATION}/operations/${source.opId}`),operation)
 batch.set(doc(db,ROOT),root)
 await assertFails(batch.commit());expect((await getDoc(doc(db,ROOT))).data().revision).toBe(f.shop.revision)
})
