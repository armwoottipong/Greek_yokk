import {it,expect} from 'vitest'
import {createTestStore,material} from '../helpers/createStore.js'
import {compileCoreImport} from '../../scripts/core-import.js'
import {encodeLegacyId as key} from '../../src/cloud/paths.js'
import {catalogGroups} from '../../src/cloud/core/catalogPresentation.js'
import {projectMaterial,projectReceipt} from '../../src/cloud/core/productPresentation.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {summaryCancel} from '../../src/cloud/core/model/cancel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'

function source(){
 const make=(id,stock,unitCost,extra={})=>material(id,stock,{unitCost,packCost:unitCost*1000,lots:[{id:`LOT-${id}`,qty:stock,initialQty:stock,unitCost,isInUse:true,receiveDate:'2026-11-01',expiryDate:'2099-01-01'}],...extra})
 return {schemaVersion:4,revision:0,
  materials:[make('BASE',100,.2,{hasSubRecipe:true,yieldQty:100,subRecipe:[{materialId:'MILK',qty:200}]}),make('MILK',1000,.1,{unit:'ml'}),make('CUP',10,.5,{unit:'ใบ',inventoryType:'packaging'}),make('FRUIT',20,2,{unit:'ลูก'})],
  platforms:[{id:'PLAT01',name:'หน้าร้าน',gpPercent:0,isActive:true},{id:'PLAT02',name:'Delivery',gpPercent:30,isActive:true}],
  addons:[{id:'A',name:'Fruit',isActive:true,prices:{PLAT01:5,PLAT02:7},recipe:[{materialId:'FRUIT',qty:.5}]}],
  addonGroups:[{id:'G',name:'Fruit group',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'extra',options:[{addonId:'A',prices:{PLAT01:0,PLAT02:7}}]}],
  menus:[{id:'M',name:'Bowl',isActive:true,hasAddons:true,addonGroupIds:['G'],hasPackage:true,prices:{PLAT01:69,PLAT02:99},recipe:[{materialId:'BASE',qty:12.5},{materialId:'CUP',qty:1}]}],orders:[],activityLogs:[],stockShortages:[],gasApiUrl:''}
}
function imported(raw){
 const compiled=compileCoreImport(raw,{generation:'g_trial_parity',sourceSha256:'a'.repeat(64)})
 return {shop:compiled.shop,materials:compiled.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data),display:compiled.documents.find(d=>d.path.endsWith('/display/catalog')).data}
}
it('preserves Local group activation, pause, warning and unset-price state on offline Firebase projection',()=>{
 const raw=source(),group=raw.addonGroups[0]
 raw.menus[0].hasAddons=false;raw.menus[0].addonGroupIds=[]
 Object.assign(group,{isActive:false,warnLowStock:true,autoPauseOutOfStock:true})
 group.options[0]={addonId:'A',paused:true,prices:{PLAT01:0},unpricedPlatformIds:['PLAT02']}
 const d=imported(raw),loaded=catalogGroups(d)[0]
 expect(loaded).toMatchObject({isActive:false,warnLowStock:true,autoPauseOutOfStock:true,options:[{addonId:key('A'),paused:true,unpricedPlatformIds:[key('PLAT02')]}]})
})
it.each(['PLAT01','PLAT02'])('keeps sale totals, stock units and cancellation equal across modes on %s',platform=>{
 const raw=source(),s=createTestStore(),d=imported(raw)
 Object.assign(s,structuredClone(raw));s.currentPlatformId=platform
 expect(s.addToCart(s.menus[0],[{...s.addons[0],groupId:'G'}],2)).toBe(true)
 const local=s.checkout();expect(local).toBeTruthy()
 const f=summaryMultiGroupSale(d.shop,d.materials,[{menuId:key('M'),qty:2,optionIds:[key('A')]}],{platformId:key(platform),opId:'SALE',uid:'cashier'})
 expect(f.order.subtotalCents/100).toBe(local.subtotal)
 expect(f.order.gpCents/100).toBe(local.gpAmount)
 expect(f.order.grossProfitCents/100).toBe(local.grossProfit)
 for(const m of f.nextMaterials)expect(projectMaterial(m).stock).toBe(s.matMap[raw.materials.find(row=>key(row.id)===m.id).id].stock)
 expect(projectReceipt(f.order,d).items[0].selectedAddons[0].price).toBe(platform==='PLAT01'?0:7)
 expect(s.undoOrder(local.orderId).ok).toBe(true)
 const cancelled=summaryCancel(f.nextShop,f.nextMaterials,f.order)
 for(const m of cancelled.nextMaterials)expect(m.stock/100).toBe(raw.materials.find(row=>key(row.id)===m.id).stock)
})
it('preserves receiving/production quantities and costs with original ml and piece units',()=>{
 const raw=source(),s=createTestStore();Object.assign(s,structuredClone(raw))
 const d=imported(raw)
 expect(s.stockIn('MILK',25.5,.1,'',null,{receiveDate:'2026-11-05',expiryDate:'2099-01-01'},false).ok).toBe(true)
 let f=planInventoryCommand(d.shop,d.materials,{kind:'receive',opId:'RECEIVE',payload:{materialId:key('MILK'),input:{qtyQ:2550,unitCost:.1,note:'',receiveDay:20762,expiryDay:47117,newLotId:'NEW-LOT',lotCreatedAtISO:'2026-11-05T00:00:00Z'}}})
 const milk=f.nextMaterials.find(m=>m.id===key('MILK'))
 expect(milk.stock/100).toBe(s.matMap.MILK.stock)
 expect(milk.unit).toBe('ml')
 const materials=d.materials.map(m=>f.nextMaterials.find(n=>n.id===m.id)||m)
 expect(s.batchProduce('BASE',10,[{materialId:'MILK',qty:20}],'',{receiveDate:'2026-11-05',expiryDate:'2099-01-01'},false).ok).toBe(true)
 f=planInventoryCommand(f.nextShop,materials,{kind:'produce',opId:'PRODUCE',payload:{materialId:key('BASE'),input:{qtyQ:1000,note:'',receiveDay:20762,expiryDay:47117,lotId:'PRODUCED'}}})
 for(const m of f.nextMaterials)expect(m.stock/100).toBe(s.matMap[raw.materials.find(row=>key(row.id)===m.id).id].stock)
})
