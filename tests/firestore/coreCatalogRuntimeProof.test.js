import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,setDoc,getDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {readFileSync} from 'node:fs'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {coreSource} from '../fixtures/coreSource.js'
let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env.cleanup()})
const root='shops/proof-shop',gen=`${root}/generations/g1`
function setup(uid='cashier'){const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid,deviceId:'device',online:true,ready:true};const db=env.authenticatedContext(uid,{email:uid+'@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore();return {db,api:createCoreTransport({db,getContext:()=>context})}}
async function seed(source=coreSource()){
 const p=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_catalog',sourceSha256:'a'.repeat(64)})
 p.shop.generation='g1';p.documents=p.documents.map(d=>({...d,path:d.path.replace('/g_trial_catalog/','/g1/')}))
 p.shop.allowedEmails={'cashier@example.com':true,'other@example.com':true}
 await env.withSecurityRulesDisabled(async c=>{const b=writeBatch(c.firestore());b.set(doc(c.firestore(),root),p.shop);for(const d of p.documents)b.set(doc(c.firestore(),d.path),d.data);await b.commit()})
 return {shop:p.shop,materials:p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data),display:p.documents.find(d=>d.path.endsWith('/display/catalog')).data}
}
function addon(shop,id='NEW'){return {kind:'addon',opId:`ADD_${id}`,payload:{entityId:id,input:{name:id,active:true,recipe:{[shop.catalog.summaryMaterials[0]]:100},pricesCents:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,1000]))},display:{name:id,emoji:''}}}}
function group(shop,id){return {kind:'group',opId:`GROUP_${id}`,payload:{input:{id,name:id,active:true,allowRepeat:false,pricingMode:'extra',min:0,max:3,optionIds:['NEW'],optionPrices:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,{_:0,NEW:100}]))},display:{name:id,emoji:''}}}}
function menu(shop){return {kind:'menu',opId:'MENU',payload:{input:{id:'NEW_MENU',name:'New menu',active:true,pricesCents:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,6900])),rawRecipe:{[shop.catalog.summaryMaterials[0]]:100},hasPackage:true,recipe:{[shop.catalog.summaryMaterials[0]]:100},optionIds:[],min:0,max:0,priceMode:'addon',optionPrices:Object.fromEntries(shop.catalog.platformIds.map(p=>[p,{_:0}])),groupIds:['G','H']},display:{name:'New menu',emoji:'',description:'Two choices'}}}}
async function admissionParts(db,command,f,shop){for(let index=0;index*4<f.operation.validationIds.length;index++)await setDoc(doc(db,`${gen}/recipeAdmissions/${command.opId}/parts/${index}`),{opId:command.opId,index,uid:'cashier',sourceRevision:shop.revision,kind:command.kind,entityId:f.operation.entityId,input:f.operation.input,entitySnapshot:f.operation.entitySnapshot,materialIds:f.operation.validationIds.slice(index*4,index*4+4)})}
function catalogBatch(db,command,f,display,{omitCheck=false,omitAdmitted=false,omitInputProof=false,omitShape=false,omitReference=false}={}){const b=writeBatch(db);b.set(doc(db,root),f.nextShop);b.set(doc(db,`${gen}/operations/${command.opId}`),f.operation);b.set(doc(db,`${gen}/display/catalog`),applyCatalogDisplay(display,f.displayChange));if(!omitInputProof)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/input`),f.inputProof);if(!omitAdmitted)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/admitted`),f.admittedProof);if(f.shapeProof&&!omitShape)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/shape`),f.shapeProof);if(f.referenceProof&&!omitReference)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/0`),f.referenceProof);for(const p of f.checkProofs||[])if(!omitCheck||p.index!==4)b.set(doc(db,`${gen}/operations/${command.opId}/referenceProofs/check${p.index}`),p.data);return b}
it('commits addon/group/two-group menu with the sixteen-guard source and preserves bill cancellation after edit',async()=>{
 const base=await seed(),{api}=setup()
 const sale={kind:'sale',opId:'OLD_BILL',payload:{platformId:base.shop.catalog.platformIds[0],lines:[{menuId:base.shop.catalog.menuIds[0],qty:1,optionIds:[]}],approvedShortages:{}}}
 await api.commit(sale)
 const warehouseBefore=(await api.snapshot()).materials
 await api.commit(addon(base.shop));for(const id of ['G','H'])await api.commit(group(base.shop,id));await api.commit(menu(base.shop))
 const edit=addon(base.shop);edit.opId='EDIT';edit.payload.input.pricesCents[base.shop.catalog.platformIds[0]]=2000
 expect((await api.commit(edit)).kind).toBe('catalog');expect((await api.commit(edit)).input.pricesCents[base.shop.catalog.platformIds[0]]).toBe(2000)
 await expect(api.commit({...edit,payload:{...edit.payload,display:{name:'forged',emoji:''}}})).rejects.toThrow('COMMAND_ID_COLLISION')
 expect((await api.snapshot()).materials).toEqual(warehouseBefore)
 expect((await api.commit({kind:'cancel',opId:'CANCEL',payload:{orderId:'OLD_BILL'}})).kind).toBe('cancel')
 const after=await api.snapshot();expect(after.shop.catalog.groups.G.multiMenuIds).toEqual(['NEW_MENU'])
})
it.each(['omitCheck','omitAdmitted','omitInputProof','forgedInput','omitDisplay','forgedDisplay','forgedStock'])('denies %s atomically',async tamper=>{
 const base=await seed(),{db,api}=setup(),command={...menu(base.shop),opId:'FORGED'};command.payload.input.groupIds=[]
 const f=planInventoryCommand(base.shop,base.materials,command,'cashier');await admissionParts(db,command,f,base.shop)
 if(tamper==='forgedInput')f.operation.input.pricesCents[base.shop.catalog.platformIds[0]]++
 const b=catalogBatch(db,command,f,base.display,{omitCheck:tamper==='omitCheck',omitAdmitted:tamper==='omitAdmitted',omitInputProof:tamper==='omitInputProof'})
 if(tamper==='omitDisplay')b.delete(doc(db,`${gen}/display/catalog`))
 if(tamper==='forgedDisplay'){const display=applyCatalogDisplay(base.display,f.displayChange);display.menus[base.shop.catalog.menuIds[0]].name='Forged';b.set(doc(db,`${gen}/display/catalog`),display)}
 if(tamper==='forgedStock'){const m=structuredClone(base.materials[0]);m.stock++;b.set(doc(db,`${gen}/materials/${m.id}`),m)}
 await assertFails(b.commit());expect((await api.snapshot()).shop.revision).toBe(base.shop.revision)
})
it('fences races at the expected revision and supports addon slot twelve',async()=>{
 const base=await seed(),a=setup().api,b=setup('other').api
 const command=addon(base.shop);command.payload.expectedRevision=base.shop.revision
 const other=addon(base.shop,'OTHER');other.payload.expectedRevision=base.shop.revision
 const results=await Promise.allSettled([a.commit(command),b.commit(other)])
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.find(r=>r.status==='rejected').reason.message).toBe('STALE_INVENTORY_DRAFT')
 for(let i=0;i<12;i++)await a.commit(addon(base.shop,`A${i}`))
 const edit=addon(base.shop,'A11');edit.opId='EDIT_LAST';edit.payload.input.pricesCents[base.shop.catalog.platformIds[0]]=2000;expect((await a.commit(edit)).counterIndex).toBe(-1)
})
it.skipIf(!process.env.GY_LATEST_BACKUP)('uses the actual latest source and preserves warehouse records across catalog edits',async()=>{
 const source=JSON.parse(readFileSync(process.env.GY_LATEST_BACKUP,'utf8')),base=await seed(source),{api,db}=setup()
 expect(base.shop.catalog.summaryMaterials).toHaveLength(16)
 const originalMaterials=(await api.snapshot()).materials
 await api.commit(addon(base.shop));for(const id of ['G','H'])await api.commit(group(base.shop,id));await api.commit(menu(base.shop))
 const after=await api.snapshot();expect(after.materials).toEqual(originalMaterials)
 const idle=after.materials.find(m=>!after.shop.catalog.summaryMaterials.includes(m.id))
 await api.commit({kind:'material_metadata',opId:'IDLE_EDIT',payload:{materialId:idle.id,metadata:{name:'Updated idle',emoji:idle.emoji,minAlertQ:idle.minAlertQ}}})
 expect((await getDoc(doc(db,`${gen}/display/catalog`))).data().menus.NEW_MENU.name).toBe('New menu')
 await assertFails(setDoc(doc(db,`${gen}/display/catalog`),{forged:true}))
})

it('leaves all sixty-four warehouse records unchanged across catalog edits',async()=>{
 const source=coreSource();for(let i=16;i<64;i++)source.materials.push({id:`IDLE${i}`,name:`Idle ${i}`,inventoryType:'ingredient',stock:1000,unitCost:0.2,lots:[{id:`IDLELOT${i}`,qty:1000,isInUse:true}]})
 const base=await seed(source),{api}=setup();await api.commit(addon(base.shop));await api.commit(group(base.shop,'G'));await api.commit(group(base.shop,'H'));await api.commit(menu(base.shop))
 const after=await api.snapshot();expect(after.materials).toHaveLength(64)
})

it('supports fifteen-material legacy menu/addon edits and display-only addon changes',async()=>{
 const base=await seed(coreSource({protectedCount:15})),{api,db}=setup()
 await api.commit(addon(base.shop));const change=menu(base.shop);change.payload.input.groupIds=[];await api.commit(change)
 const edit=addon(base.shop);edit.opId='EDIT';edit.payload.display.emoji='x';expect((await api.commit(edit)).kind).toBe('catalog')
 expect((await getDoc(doc(db,`${gen}/display/catalog`))).data().addons.NEW.emoji).toBe('x')
})

// Paired low-level plans distinguish real server references from a planner clone.
it.each([false,true])('checks group63 retirement reference for fifteen guards (referenced=%s)',async referenced=>{
 const base=await seed(coreSource({protectedCount:15})),{api,db}=setup()
 await api.commit(addon(base.shop));await api.commit(addon(base.shop,'OTHER'))
 const state=await api.snapshot(),c=state.shop.catalog
 c.groupIds=Array.from({length:64},(_,i)=>`G${i}`)
 c.groups=Object.fromEntries(c.groupIds.map((id,i)=>{const option=referenced&&i===63?'NEW':'OTHER';return [id,{id,name:id,active:true,revision:1,min:0,max:1,allowRepeat:false,pricingMode:'extra',optionIds:[option],optionPrices:{P:{_:0,[option]:0}},menuIds:[],multiMenuIds:[]}]}))
 await env.withSecurityRulesDisabled(async context=>{await setDoc(doc(context.firestore(),root),state.shop)})
 const planningShop=structuredClone(state.shop),realGroups=structuredClone(c.groups)
 planningShop.catalog.groups.G63.optionIds=['OTHER'];planningShop.catalog.groups.G63.optionPrices={P:{_:0,OTHER:0}}
 const command=addon(state.shop);command.opId='RETIRE';command.payload.input.active=false;command.payload.display.deleted=true
 const f=planInventoryCommand(planningShop,state.materials,command,'cashier');f.nextShop.catalog.groups=realGroups
 await admissionParts(db,command,f,state.shop)
 const display=(await getDoc(doc(db,`${gen}/display/catalog`))).data(),batch=catalogBatch(db,command,f,display)
 if(referenced)await assertFails(batch.commit());else await batch.commit()
 expect((await api.snapshot()).shop.catalog.addons.NEW.active).toBe(referenced)
})
