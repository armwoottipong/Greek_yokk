import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,setDoc,getDoc,writeBatch} from 'firebase/firestore'
import {assertFails} from '@firebase/rules-unit-testing'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
let env
const ROOT='shops/proof-shop',GEN=`${ROOT}/generations/g1`
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore()})
afterAll(async()=>{await env?.cleanup()})
function setup(){const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'device',online:true,ready:true},db=env.authenticatedContext(context.uid).firestore();return {db,api:createCoreTransport({db,getContext:()=>context})}}
function fixture(count){
 const f=summaryFixture(),c=f.shop.catalog
 f.materials=f.materials.slice(0,count);f.shop.materialIds=f.materials.map(m=>m.id);f.shop.productionUsers=Object.fromEntries(f.shop.materialIds.map(id=>[id,[]]));f.shop.returnMaterials={};c.summaryMaterials=[...f.shop.materialIds]
 for(const menu of Object.values(c.menus)){
  menu.recipe=count?{S0:100}:{};menu.rawRecipe=structuredClone(menu.recipe);menu.hasPackage=true;menu.baseMaterialIds=Object.keys(menu.recipe);menu.materialIds=[...f.shop.materialIds]
  menu.choiceMaterials=Object.fromEntries(menu.optionIds.map(id=>[id,count?['S0']:[]]))
 }
 for(const addon of Object.values(c.addons)){addon.recipe=count?{S0:100}:{};addon.materialIds=Object.keys(addon.recipe)}
 return f
}
async function seed(f){await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore(),b=writeBatch(db);b.set(doc(db,ROOT),f.shop);b.set(doc(db,`${GEN}/display/catalog`),{menus:{},addons:{},groups:{},platforms:{}});for(const m of f.materials)b.set(doc(db,`${GEN}/materials/${m.id}`),m);await b.commit()})}
const sale=(id,options={})=>({opId:id,kind:'sale',payload:{platformId:'P',lines:Array.from({length:options.lines??1},(_,i)=>({menuId:'SIMPLE',qty:i+1,optionIds:options.addons?Array.from({length:11},(_,i)=>`A${i}`):[],note:`line ${i}`}))}})
it.each([0,1,2,7,14,15])('commits and cancels a %i-material receipt using only physical rows',async count=>{
 const f=fixture(count);await seed(f);const {api}=setup(),r=await api.commit(sale(`SIZE-${count}`))
 expect(r.materialIds).toHaveLength(count)
 await api.commit({opId:`CANCEL-${count}`,kind:'cancel',payload:{orderId:r.opId}})
 expect((await api.snapshot()).materials.map(m=>m.stock)).toEqual(f.materials.map(m=>m.stock))
})
it('proves six lines with all eleven addons on one physical material within Rules limits',async()=>{
 await seed(fixture(1));const {api}=setup(),r=await api.commit(sale('WORST-SMALL',{lines:6,addons:true}))
 expect(r.lines).toHaveLength(6);expect(r.materialIds).toEqual(['S0']);expect(r.addonCounts.A10).toBe(21)
 await api.commit({opId:'WORST-RETURN',kind:'cancel',payload:{orderId:r.opId}})
})
it('creates a real first material and menu from an empty reset shop, then sells and cancels',async()=>{
 const f=fixture(0),c=f.shop.catalog
 c.menus={};c.menuIds=[];c.addons={};c.addonIds=[];c.groups={};c.groupIds=[];c.counterIds=Array(15).fill('_');c.addonPrices={P:{_:0}};c.recipeRegistryIds=[]
 await seed(f);const {api}=setup()
 await api.commit({opId:'FIRST-MATERIAL',kind:'material_create',payload:{input:{id:'FIRST',name:'First ingredient',emoji:'',unit:'g',inventoryType:'ingredient',packSize:1,minAlertQ:0}}})
 await api.commit({opId:'FIRST-STOCK',kind:'receive',payload:{materialId:'FIRST',input:{qtyQ:1000,unitCost:1,receiveDay:21000,expiryDay:999999,newLotId:'FIRST-LOT'}}})
 await api.commit({opId:'FIRST-MENU',kind:'menu',payload:{input:{id:'FIRSTMENU',name:'First menu',active:true,pricesCents:{P:6900},recipe:{FIRST:100},rawRecipe:{FIRST:100},hasPackage:true,optionIds:[],min:0,max:0,optionPrices:{P:{_:0}},priceMode:'addon'},display:{name:'First menu',emoji:''}}})
 const r=await api.commit({opId:'FIRST-SALE',kind:'sale',payload:{platformId:'P',lines:[{menuId:'FIRSTMENU',qty:1,optionIds:[]}]}})
 expect(r.materialIds).toEqual(['FIRST']);expect((await api.snapshot()).materials).toHaveLength(1)
 await api.commit({opId:'FIRST-CANCEL',kind:'cancel',payload:{orderId:r.opId}})
 expect((await api.snapshot()).materials[0].stock).toBe(1000)
})
it.each(['count','lineQuantity','billOperands','omittedMaterial'])('rejects forged small-shop %s atomically',async tamper=>{
 const base=fixture(1);await seed(base);const {db,api}=setup(),command=sale(`FORGED-${tamper}`,{lines:6,addons:true})
 const f=summaryMultiGroupSale(base.shop,base.materials,command.payload.lines,{opId:command.opId,uid:'cashier',platformId:'P'});f.order.proofMode='prepared'
 if(tamper==='count'){f.order.addonCounts.A10++;f.order.billOperands.addonCounts=f.order.addonCounts}
 if(tamper==='lineQuantity'){f.order.lineQtys[5]++;f.order.billOperands.lineQtys=f.order.lineQtys}
 if(tamper==='billOperands')f.order.billOperands={...f.order.billOperands,lineQtys:[0,0,0,0,0,0]}
 await env.withSecurityRulesDisabled(async ctx=>{
  const admin=ctx.firestore(),b=writeBatch(admin)
  b.set(doc(admin,`${GEN}/preparedSales/${command.opId}/certificates/bill`),{opId:command.opId,uid:'cashier',catalogRevision:base.shop.catalogRevision,platformId:'P',addonKeys:f.order.addonKeys,materialIds:f.order.materialIds,billOperands:f.order.billOperands,lines:f.order.lines})
  for(const m of base.materials)b.set(doc(admin,`${GEN}/materials/${m.id}`),{...m,billPreparations:{[command.opId]:{uid:'cashier',catalogRevision:base.shop.catalogRevision,needed:f.order.inventory[0].needed}}})
  await b.commit()
 })
 const b=writeBatch(db);b.set(doc(db,ROOT),f.nextShop);b.set(doc(db,`${GEN}/orders/${command.opId}`),f.order)
 if(tamper!=='omittedMaterial')for(const m of f.nextMaterials)b.set(doc(db,`${GEN}/materials/${m.id}`),m)
 await assertFails(b.commit());expect((await getDoc(doc(db,ROOT))).data().revision).toBe(base.shop.revision);expect((await api.snapshot()).materials[0].stock).toBe(base.materials[0].stock)
})
