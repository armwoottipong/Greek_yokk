import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,getDocFromServer,writeBatch,setLogLevel} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
let env,f,db,api
setLogLevel('silent')
const root='shops/proof-shop',path=()=>`${root}/generations/${f.shop.generation}`
const command=(opId='GP',expectedRevision=f.shop.revision)=>({kind:'platform_gp',opId,payload:{expectedRevision,rates:Object.fromEntries(f.shop.catalog.platformIds.map(id=>[id,2550]))}})
const client=uid=>{const db=env.authenticatedContext(uid).firestore();return {db,api:createCoreTransport({db,getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:f.shop.generation,uid,deviceId:uid,ready:true,online:true})})}}
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore();f=summaryFixture();await env.withSecurityRulesDisabled(async c=>{const d=c.firestore(),b=writeBatch(d);b.set(doc(d,root),f.shop);for(const m of f.materials)b.set(doc(d,`${path()}/materials/${m.id}`),m);await b.commit()});({db,api}=client('alice'))})
afterAll(async()=>env.cleanup())
async function direct(change=()=>{},actor=db,mode='both'){
 const planned=planInventoryCommand(f.shop,f.materials,command(),'alice');change(planned)
 const b=writeBatch(actor);if(mode!=='receipt')b.set(doc(actor,root),planned.nextShop);if(mode!=='root')b.set(doc(actor,`${path()}/operations/GP`),planned.operation);return b.commit()
}
it('saves atomically for equal accounts, retries once and rejects stale drafts/collisions',async()=>{
 const b=client('bob'),c=command();const saved=await api.commit(c);expect(saved.rates).toEqual(c.payload.rates)
 expect(await api.commit(c)).toEqual(saved)
 const snapshot=await b.api.snapshot();expect(snapshot.shop.catalogRevision).toBe(f.shop.catalogRevision+1);expect(Object.fromEntries(snapshot.materials.map(m=>[m.id,m]))).toEqual(Object.fromEntries(f.materials.map(m=>[m.id,m])))
 expect(snapshot.shop.catalog.menus).toEqual(f.shop.catalog.menus)
 await expect(b.api.commit(command('STALE'))).rejects.toThrow('STALE_INVENTORY_DRAFT')
 expect((await b.api.rejectStaleInventory(command('STALE'))).rejected).toBe(true)
 await expect(api.commit({...c,payload:{...c.payload,rates:{...c.payload.rates,[f.shop.catalog.platformIds[0]]:3000}}})).rejects.toThrow('COMMAND_ID_COLLISION')
 expect((await b.api.commit(command('BOB',snapshot.shop.revision))).uid).toBe('bob')
})
it('denies root-only and receipt-only writes and unauthenticated writes',async()=>{
 await assertFails(direct(()=>{},db,'root'));await assertFails(direct(()=>{},db,'receipt'))
 await assertFails(direct(()=>{},env.unauthenticatedContext().firestore()))
})
it.each(['negative','hundred','fraction','extra','price','active','stock','identity','revision','time'])('denies tampering: %s',async kind=>{
 await assertFails(direct(p=>{const id=f.shop.catalog.platformIds[0];switch(kind){
 case 'negative':p.operation.rates[id]=-1;p.nextShop.catalog.platforms[id].gpBasisPoints=-1;break
 case 'hundred':p.operation.rates[id]=10000;p.nextShop.catalog.platforms[id].gpBasisPoints=10000;break
 case 'fraction':p.operation.rates[id]=0.5;p.nextShop.catalog.platforms[id].gpBasisPoints=0.5;break
 case 'extra':p.operation.rates.extra=0;break
 case 'price':p.nextShop.catalog.menus[Object.keys(p.nextShop.catalog.menus)[0]].active=false;break
 case 'active':p.nextShop.catalog.platforms[id].active=false;break
 case 'stock':p.nextShop.materialIds=['fake'];break
 case 'identity':p.operation.uid='bob';break
 case 'revision':p.nextShop.catalogRevision--;break
 case 'time':p.operation.createdAt='yesterday';break
 }}))
 expect((await getDocFromServer(doc(db,root))).data()).toEqual(f.shop)
})
it('new sales use the saved GP and cancellation preserves historical money',async()=>{
 const id=f.shop.catalog.platformIds[0],menu=Object.values(f.shop.catalog.menus).find(m=>m.min===0)
 const sale=opId=>({kind:'sale',opId,payload:{platformId:id,lines:[{menuId:menu.id,qty:1,optionIds:[]}]}})
 const old=await api.commit(sale('OLD'));await api.commit(command('GP',(await api.snapshot()).shop.revision))
 const fresh=await api.commit(sale('NEW'));expect((await api.snapshot()).shop.catalog.platforms[id].gpBasisPoints).toBe(2550)
 expect(fresh.gpCents).toBe(Math.round(fresh.subtotalCents*0.255));expect(fresh.subtotalCents).toBe(old.subtotalCents)
 await api.commit({kind:'cancel',opId:'RETURN',payload:{orderId:'OLD'}})
 const saved=(await getDocFromServer(doc(db,`${path()}/orders/OLD`))).data();expect(saved.gpCents).toBe(old.gpCents);expect(saved.status).toBe('cancelled')
})
