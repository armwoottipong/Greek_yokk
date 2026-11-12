import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {assertFails,assertSucceeds} from '@firebase/rules-unit-testing'
import {doc,getDoc,getDocs,collection,setDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,writeBatch} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createShopAccess} from '../../src/cloud/shopAccess.js'
import {businessDay} from '../../src/cloud/core/orderEntry.js'
let env
const ROOT='shops/proof-shop',GEN=ROOT+'/generations/g1',alice='alice@example.com',bob='bob@example.com'
const claims=email=>({email,email_verified:true,firebase:{sign_in_provider:'google.com'}})
const db=(uid='alice',extra={})=>env.authenticatedContext(uid,{...claims(uid+'@example.com'),...extra}).firestore()
const shop=()=>({status:'active',generation:'g1',revision:1,allowedEmails:{[alice]:true,[bob]:true},userRoles:{[alice]:'admin',[bob]:'admin'}})
const acl=(emails={[alice]:true,[bob]:true},extra={})=>({allowedEmails:{...emails,'armwoottipong@gmail.com':true},userRoles:{...Object.fromEntries(Object.keys(emails).map(email=>[email,'admin'])),'armwoottipong@gmail.com':'admin'},revision:2,lastOpKind:'access',lastOpId:'ACCESS-1',...extra})
const presence=()=>({email:alice,displayName:'Alice',photoURL:'https://lh3.googleusercontent.com/a/avatar',lastSeen:serverTimestamp()})
async function seed(root=shop(),documents=[]){await env.withSecurityRulesDisabled(async ctx=>{const admin=ctx.firestore(),batch=writeBatch(admin);batch.set(doc(admin,ROOT),root);for(const row of documents)batch.set(doc(admin,row.path),row.data);await batch.commit()})}
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore();await seed()})
afterAll(async()=>{await env?.cleanup()})
it('allows verified Google emails in either token case and grants equal rights to explicit administrators',async()=>{
 for(const client of [db(),db('bob'),db('mixed',{email:'ALICE@EXAMPLE.COM'})])expect((await assertSucceeds(getDoc(doc(client,ROOT)))).data().revision).toBe(1)
 await assertSucceeds(updateDoc(doc(db('bob'),ROOT),acl({[alice]:true,[bob]:true,'new@example.com':true})))
})
it.each([
 ['anonymous',()=>env.unauthenticatedContext().firestore()],['not listed',()=>db('stranger')],
 ['unverified',()=>db('alice',{email_verified:false})],['password identity',()=>db('alice',{firebase:{sign_in_provider:'password'}})],
 ['missing email',()=>env.authenticatedContext('alice',{email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()]
])('denies %s shop, business and presence reads and writes',async(_name,getClient)=>{
 const client=getClient()
 await assertFails(getDoc(doc(client,ROOT)));await assertFails(getDocs(collection(client,GEN+'/materials')))
 await assertFails(getDocs(collection(client,ROOT+'/presence')));await assertFails(updateDoc(doc(client,ROOT),acl()))
 await assertFails(setDoc(doc(client,ROOT+'/presence/alice'),presence()))
})
it('fails closed for missing or empty live email maps',async()=>{
 for(const allowedEmails of [undefined,{}]){const root=shop();if(allowedEmails)root.allowedEmails=allowedEmails;else delete root.allowedEmails;await seed(root);await assertFails(getDoc(doc(db(),ROOT)))}
})
it.each([
 ['empty',()=>acl({})],['remove self',()=>acl({[bob]:true})],['false value',()=>acl({[alice]:true,[bob]:false})],
 ['mixed case key',()=>acl({[alice]:true,'Bob@example.com':true})],['invalid email',()=>acl({[alice]:true,bad:true})],
 ['too many',()=>acl(Object.fromEntries([[alice,true],...Array.from({length:50},(_,i)=>['u'+i+'@example.com',true])]))],
 ['business change',()=>acl(undefined,{status:'importing'})],['stale revision',()=>acl(undefined,{revision:1})],
 ['unsafe id',()=>acl(undefined,{lastOpId:'../bad'})]
])('rejects %s allowlist edit',async(_name,change)=>{await assertFails(updateDoc(doc(db(),ROOT),change()))})
it('revokes already authenticated clients immediately for reads and writes',async()=>{
 const client=db('bob');await assertSucceeds(getDoc(doc(client,ROOT)))
 await assertSucceeds(updateDoc(doc(db(),ROOT),acl({[alice]:true})))
 await assertFails(getDoc(doc(client,ROOT)));await assertFails(updateDoc(doc(client,ROOT),acl({[alice]:true,[bob]:true},{revision:3})))
 await assertFails(setDoc(doc(client,ROOT+'/presence/bob'),{...presence(),email:bob}))
})
it('requires the own uid, exact current email, bounded display/photo fields and server timestamp',async()=>{
 const client=db(),ref=doc(client,ROOT+'/presence/alice')
 await assertSucceeds(setDoc(ref,presence()));expect((await getDoc(ref)).data().lastSeen).toBeInstanceOf(Timestamp)
 await assertSucceeds(getDocs(collection(db('bob'),ROOT+'/presence')))
 const bad=[{...presence(),email:bob},{...presence(),lastSeen:Timestamp.fromMillis(0)},{...presence(),displayName:'x'.repeat(121)},{...presence(),photoURL:'https://evil.com/a'},{...presence(),extra:true}]
 for(const value of bad)await assertFails(setDoc(ref,value))
 await assertFails(setDoc(doc(client,ROOT+'/presence/bob'),presence()))
 await assertSucceeds(deleteDoc(ref))
})
function importedShop(count=16,fourLots=true){
 const source=coreSource();source.materials=source.materials.slice(0,count)
 const ids=new Set(source.materials.map(m=>m.id))
 for(const item of [...source.menus,...source.addons])item.recipe=item.recipe.filter(row=>ids.has(row.materialId))
 if(fourLots)for(const material of source.materials)material.lots=[1,1,1,997].map((qty,i)=>({id:material.id+'-L'+i,qty,isInUse:i===0}))
 for(const menu of source.menus)for(const row of menu.recipe)row.qty=2
 const plan=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_access',sourceSha256:'a'.repeat(64)})
 return {root:{...plan.shop,generation:'g1',allowedEmails:{[alice]:true,[bob]:true},userRoles:{[alice]:'admin',[bob]:'admin'}},documents:plan.documents.map(row=>({...row,path:row.path.replace('/g_trial_access/','/g1/')}))}
}
function runtime(uid='alice'){
 const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:'one',online:true,ready:true}
 return createCoreTransport({db:db(uid),getContext:()=>context})
}
it('records manual sales with POS off, keeps future orders out of receipts and consumes a due order once',async()=>{
 const {root,documents}=importedShop(16)
 root.posEnabled=false
 await seed(root,documents)
 const api=runtime(),day=businessDay()
 const id='ENTRY-PRE-'+root.revision+'-01234567-0123-0123-0123-012345678901'
 const payload={platformId:root.catalog.platformIds[0],lines:[{menuId:root.catalog.menuIds[0],qty:1,optionIds:[]}]}
 const input={id,pickupDay:day+1,expectedCatalogRevision:root.catalogRevision,...payload,packageAdjustments:[]}
 await api.savePreorder(input)
 await api.savePreorder(input)
 const {shop:next,materials:before}=await api.snapshot()
 expect(Object.keys(next.preorders)).toEqual([id])
 expect(await api.receipt('sale',id)).toBeNull()
 const sale={kind:'sale',opId:id+'_01234567-0123-0123-0123-012345678901',payload}
 await expect(api.commit(sale)).rejects.toMatchObject({code:'PREORDER_NOT_DUE'})
 next.preorders[id].pickupDay=day
 await seed(next,documents)
 await api.commit(sale)
 const after=await api.snapshot()
 expect(after.shop.preorders).toEqual({})
 expect(after.materials.some((m,i)=>m.stock<before[i].stock)).toBe(true)
 await expect(api.commit({...sale,opId:id+'_11234567-0123-0123-0123-012345678901'})).rejects.toMatchObject({code:'PREORDER_NO_LONGER_PENDING'})
 await api.commit({kind:'cancel',opId:'RETURN-CONVERTED-PREORDER',payload:{orderId:sale.opId}})
 const returned=await api.snapshot()
 expect(returned.shop.preorders).toEqual({})
 expect(returned.materials.map(m=>m.lotQty)).toEqual(before.map(m=>m.lotQty))
 const pending={...input,id:'ENTRY-PRE-'+returned.shop.revision+'-11234567-0123-0123-0123-012345678901'}
 await api.savePreorder(pending)
 await api.cancelPreorder(pending.id)
 const cancelled=await api.snapshot()
 expect(cancelled.shop.preorders).toEqual({})
 expect(cancelled.materials.map(m=>m.lotQty)).toEqual(returned.materials.map(m=>m.lotQty))
 expect(await api.receipt('sale',pending.id)).toBeNull()
 await api.commit({kind:'sale',opId:'ENTRY-'+day+'-01234567-0123-0123-0123-012345678901',payload})
})
it('commits and cancels a backdated sale as a manager with POS disabled',async()=>{
 const {root,documents}=importedShop(16)
 root.posEnabled=false;root.userRoles[bob]='manager'
 await seed(root,documents)
 const api=runtime('bob'),before=await api.snapshot(),day=businessDay()
 const payload={platformId:root.catalog.platformIds[0],lines:[{menuId:root.catalog.menuIds[0],qty:1,optionIds:[]}]}
 const idFor=value=>`ENTRY-BACK-${value}-01234567-0123-0123-0123-012345678901`
 await expect(api.commit({kind:'sale',opId:idFor(day+1),payload})).rejects.toMatchObject({code:'ORDER_ENTRY_DAY_CHANGED'})
 const opId=idFor(day-2)
 await api.commit({kind:'sale',opId,payload})
 const recorded=await api.receipt('sale',opId)
 expect(recorded.createdAt.toMillis()).toBeGreaterThan(Date.now()-86400000)
 expect((await api.snapshot()).materials.some((m,i)=>m.stock<before.materials[i].stock)).toBe(true)
 await api.commit({kind:'cancel',opId:'BACKDATED-RETURN',payload:{orderId:opId}})
 expect((await api.snapshot()).materials.map(m=>m.stock)).toEqual(before.materials.map(m=>m.stock))
})
it('allows only an admin to change POS availability and keeps returns available while disabled',async()=>{
 const {root,documents}=importedShop(0)
 root.userRoles[bob]='manager'
 await seed(root,documents)
 const admin=runtime(),manager=runtime('bob')
 const sale={opId:'BEFORE-POS-OFF',kind:'sale',payload:{platformId:root.catalog.platformIds[0],lines:[{menuId:root.catalog.menuIds[0],qty:1,optionIds:[]}]}}
 await admin.commit(sale)
 const {shop:current}=await admin.snapshot()
 const access=createShopAccess({db:db(),shopId:'proof-shop',getShop:()=>current,getUser:()=>({uid:'alice',email:alice})})
 try{
  const change={posEnabled:false,revision:current.revision+1,lastOpKind:'pos_setting',lastOpId:'POS-OFF'}
  await assertFails(updateDoc(doc(db('bob'),ROOT),change))
  await assertFails(updateDoc(doc(db(),ROOT),{...change,posEnabled:'false'}))
  await assertFails(updateDoc(doc(db(),ROOT),{...change,catalogRevision:current.catalogRevision+1}))
  await access.savePosEnabled(false,true)
  expect((await manager.snapshot()).shop).toMatchObject({posEnabled:false,catalogRevision:current.catalogRevision})
  await expect(access.savePosEnabled(true,true)).rejects.toThrow('POS_SETTING_CONFLICT')
  await expect(manager.commit({...sale,opId:'AFTER-POS-OFF'})).rejects.toMatchObject({code:'POS_DISABLED'})
  expect(await admin.commit(sale)).toMatchObject({opId:sale.opId})
  await admin.commit({opId:'RETURN-WHILE-POS-OFF',kind:'cancel',payload:{orderId:sale.opId}})
  await access.savePosEnabled(true,false)
  await manager.commit({...sale,opId:'AFTER-POS-ON'})
 }finally{access.close()}
})
it.each([0,1,2,7,13,14,15,16])('preserves the %i-material sale and cancellation with strict email checks',async count=>{
 const {root,documents}=importedShop(count);await seed(root,documents)
 const api=runtime(),before=await api.snapshot(),menuIds=root.catalog.menuIds,platformId=root.catalog.platformIds[0]
 const lines=(count===16?[menuIds[0],menuIds[4],menuIds[0],menuIds[4]]:[menuIds[0]]).map(menuId=>({menuId,qty:1,optionIds:[]}))
 const receipt=await api.commit({opId:'STRICT-'+count,kind:'sale',payload:{platformId,lines}});expect(receipt.materialIds).toHaveLength(count)
 await api.commit({opId:'RETURN-'+count,kind:'cancel',payload:{orderId:receipt.opId}})
 expect((await api.snapshot()).materials.map(m=>m.stock)).toEqual(before.materials.map(m=>m.stock))
})
it('resolves competing bill returns from two devices and restores each original lot once',async()=>{
 const {IDBFactory}=await import('fake-indexeddb')
 const {createCommandJournal}=await import('../../src/cloud/journal.js')
 const {createCoreCommands}=await import('../../src/cloud/core/commands.js')
 const {root,documents}=importedShop(7)
 root.userRoles[bob]='manager'
 await seed(root,documents)
 const api=runtime(),before=await api.snapshot()
 const sale=await api.commit({opId:'RETURN-RACE-SALE',kind:'sale',payload:{platformId:root.catalog.platformIds[0],lines:[{menuId:root.catalog.menuIds[0],qty:1,optionIds:[]}]}})
 const devices=['alice','bob'].map(uid=>{
  const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:uid,online:true,ready:true,protocolCertified:true}
  const journal=createCommandJournal({indexedDB:new IDBFactory(),ownerId:uid})
  const commands=createCoreCommands({journal,transport:runtime(uid),getContext:()=>context})
  return {journal,commands,request:{opId:`RETURN-RACE-${uid}`,kind:'cancel',payload:{orderId:sale.opId}}}
 })
 try{
  const attempts=await Promise.all(devices.map(device=>device.commands.execute(device.request)))
  const results=await Promise.all(attempts.map((result,index)=>result.ok?result:devices[index].commands.recover(devices[index].request)))
  expect(results.every(result=>result.ok)).toBe(true)
  expect(results.filter(result=>result.value.rejected)).toMatchObject([{value:{code:'ORDER_ALREADY_CANCELLED',result:{orderId:sale.opId}}}])
  for(const device of devices)expect(await device.commands.pending()).toEqual([])
  const after=await api.snapshot()
  expect(after.materials.map(m=>m.lotQty)).toEqual(before.materials.map(m=>m.lotQty))
  expect(after.shop.revision).toBe(before.shop.revision+2)
 }finally{await Promise.all(devices.map(device=>device.journal.close()))}
})
it('receives, counts, creates a production recipe and produces under the same strict policy',async()=>{
 const {root,documents}=importedShop(16,false);await seed(root,documents)
 const api=runtime(),first=(await api.snapshot()).materials[0]
 await api.commit({opId:'ACCESS-RECEIVE',kind:'receive',payload:{materialId:first.id,input:{qtyQ:100,unitCost:0.5,receiveDay:21000,expiryDay:999999,newLotId:'RECEIVED'}}})
 await api.commit({opId:'ACCESS-COUNT',kind:'stock_count',payload:{requests:[{materialId:first.id,counts:[{id:'RECEIVED',to:50}]}]}})
 await api.commit({opId:'ACCESS-CREATE',kind:'material_create',payload:{input:{id:'NEW',name:'New',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}}})
 await api.commit({opId:'ACCESS-RECIPE',kind:'production_recipe',payload:{materialId:'NEW',recipe:{inputIds:[first.id],quantities:[100],yieldQ:200}}})
 await api.commit({opId:'ACCESS-PRODUCE',kind:'produce',payload:{materialId:'NEW',input:{qtyQ:100}}})
 expect((await api.snapshot()).materials.find(m=>m.id==='NEW').stock).toBe(100)
 const bob=runtime('bob'),latest=await bob.snapshot()
 const rates=Object.fromEntries(latest.shop.catalog.platformIds.map(id=>[id,1500]))
 await bob.commit({opId:'ACCESS-GP',kind:'platform_gp',payload:{expectedRevision:latest.shop.revision,rates}})
 expect((await api.snapshot()).shop.catalog.platforms[latest.shop.catalog.platformIds[0]].gpBasisPoints).toBe(1500)
})

it('viewer reads reports but cannot commit receiving, while manager can commit the same command',async()=>{
 const {root,documents}=importedShop(16,false);root.userRoles={[alice]:'viewer',[bob]:'manager'};await seed(root,documents)
 const viewer=runtime(),before=await viewer.snapshot(),materialId=before.materials[0].id
 const command={opId:'ROLE-RECEIVE',kind:'receive',payload:{materialId,input:{qtyQ:100,unitCost:0.5,receiveDay:21000,expiryDay:999999,newLotId:'ROLELOT'}}}
 await assertFails(viewer.commit(command));await runtime('bob').commit(command)
 const client=db();await assertFails(updateDoc(doc(client,ROOT),acl()));await assertFails(setDoc(doc(client,ROOT+'/invitations/VIEWER'),{email:alice,role:'viewer',status:'pending',createdBy:'alice',createdAt:serverTimestamp()}))
 await assertSucceeds(setDoc(doc(client,ROOT+'/presence/alice'),presence()))
})
it('manager cannot change roles or GP, while admin can save the same GP command',async()=>{
 const {root,documents}=importedShop(16,false);root.userRoles={[alice]:'admin',[bob]:'manager'};await seed(root,documents)
 await assertFails(updateDoc(doc(db('bob'),ROOT),acl()))
 const manager=runtime('bob'),before=await manager.snapshot(),rates=Object.fromEntries(before.shop.catalog.platformIds.map(id=>[id,1500]))
 await assertFails(manager.commit({opId:'ROLE-MANAGER-GP',kind:'platform_gp',payload:{expectedRevision:before.shop.revision,rates}}))
 await runtime().commit({opId:'ROLE-ADMIN-GP',kind:'platform_gp',payload:{expectedRevision:before.shop.revision,rates}})
})
it('queues invitations atomically for allowed recipients and prevents forged status or recipient changes',async()=>{
 const client=db(),batch=writeBatch(client),email='invited@example.com',invitation={email,role:'admin',createdBy:'alice',createdAt:serverTimestamp(),status:'pending'}
 batch.update(doc(client,ROOT),acl({[alice]:true,[bob]:true,[email]:true}));batch.set(doc(client,ROOT+'/invitations/INVITE'),invitation);await assertSucceeds(batch.commit())
 await assertFails(updateDoc(doc(client,ROOT+'/invitations/INVITE'),{status:'sent'}));await assertFails(deleteDoc(doc(client,ROOT+'/invitations/INVITE')))
 await assertFails(setDoc(doc(client,ROOT+'/invitations/FORGED'),{...invitation,email:'not-allowed@example.com'}))
 await assertFails(setDoc(doc(client,ROOT+'/invitations/FORGED-ROLE'),{...invitation,role:'manager'}))
})
it('blocks removing or demoting the owner and does not let a manager promote themselves',async()=>{
 const root=shop();root.userRoles[bob]='manager';await seed(root)
 const owner='armwoottipong@gmail.com',valid=acl()
 await assertFails(updateDoc(doc(db(),ROOT),{...valid,userRoles:{...valid.userRoles,[owner]:'viewer'}}))
 await assertFails(updateDoc(doc(db(),ROOT),{...valid,userRoles:{[alice]:'admin',[bob]:'manager'}}))
 await assertFails(updateDoc(doc(db('bob'),ROOT),valid))
 await assertSucceeds(updateDoc(doc(db(),ROOT),valid))
})

it('denies viewer and manager invitation get/list even for an existing request',async()=>{
 const root=shop();root.userRoles={[alice]:'viewer',[bob]:'manager'};await seed(root,[{path:ROOT+'/invitations/PRIVATE',data:{email:alice,role:'viewer',status:'pending'}}])
 for(const client of [db(),db('bob')]){await assertFails(getDoc(doc(client,ROOT+'/invitations/PRIVATE')));await assertFails(getDocs(collection(client,ROOT+'/invitations')))}
})

it.each(['alice','bob'])('allows %s 16-material dense sale and cancellation with manager/admin roles',async uid=>{
 const {root,documents}=importedShop(16);root.userRoles[bob]='manager';await seed(root,documents)
 const api=runtime(uid),before=await api.snapshot(),ids=root.catalog.menuIds,lines=[ids[0],ids[4],ids[0],ids[4]].map(menuId=>({menuId,qty:1,optionIds:[]}))
 const receipt=await api.commit({opId:'DENSE-'+uid,kind:'sale',payload:{platformId:root.catalog.platformIds[0],lines}})
 await api.commit({opId:'DENSE-RETURN-'+uid,kind:'cancel',payload:{orderId:receipt.opId}})
 expect((await api.snapshot()).materials.map(m=>m.stock)).toEqual(before.materials.map(m=>m.stock))
})
