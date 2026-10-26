import {it,expect,vi} from 'vitest'
import {computed} from 'vue'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {typeFixture} from '../firestore/summaryMaterialTypeFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
function setup(customize=()=>{}){
 sessionStorage.clear()
 const f=summaryFixture();customize(f);const shop=materialRegistryShop(f.shop,f.materials)
 const data={shop,materials:f.materials,display:{menus:{},addons:{},platforms:{}}}
 let ready=true,blocked=false,source=data,model
 const execute=vi.fn(async command=>{const value={opId:command.opId,kind:command.kind};model.acknowledge(value);return {ok:true,value}})
 model=createInventoryModel({getData:()=>source,loadServer:async()=>source,execute,isReady:()=>ready,isBlocked:()=>blocked,storageKey:'inventory-test'})
 return {model,data,execute,setReady:v=>ready=v,setBlocked:v=>blocked=v,setData:v=>{source=v;model.update(v)}}
}
it('stages original receiving UI inputs as canonical quantities, without a network write before Save',async()=>{
 const {model,data,execute}=setup(),m=data.materials[0],before=m.stock
 expect(model.stockIn(m.id,1.25,.5,'รับเข้า',.5,{receiveDate:'2026-10-26',expiryDate:null},true).ok).toBe(true)
 expect(execute).not.toHaveBeenCalled();expect(model.matMap[m.id].stock).toBe((before+125)/100);expect(model.hasStockDrafts).toBe(true)
 expect((await model.commitStockDrafts()).ok).toBe(true)
 expect(execute.mock.calls[0][0]).toMatchObject({kind:'inventory',payload:{materialId:m.id,input:{qtyQ:125,unitCost:.5},expectedRevision:data.shop.revision}})
 expect(model.hasStockDrafts).toBe(false);model.close()
})
it('preserves a draft across reload and refuses to overwrite a baseline advanced by another device',async()=>{
 const first=setup(),id=first.data.materials[0].id
 expect(first.model.stockAdjust(id,first.data.materials[0].stock/100-1,'ตรวจนับ','',true).ok).toBe(true)
 const restored=createInventoryModel({getData:()=>first.data,loadServer:async()=>({...first.data,shop:{...first.data.shop,revision:first.data.shop.revision+1}}),execute:first.execute,isReady:()=>true,isBlocked:()=>false,storageKey:'inventory-test'})
 expect(restored.hasStockDrafts).toBe(true)
 expect((await restored.commitStockDrafts()).ok).toBe(false);expect(first.execute).not.toHaveBeenCalled();expect(restored.hasStockDrafts).toBe(true)
 first.model.close();restored.close()
})
it('keeps the same draft command after uncertain results and blocks clearing while unresolved',async()=>{
 const {model,data,execute}=setup(),m=data.materials[0]
 model.stockAdjust(m.id,m.stock/100-1,'นับ','',true)
 execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 expect((await model.commitStockDrafts()).ok).toBe(false)
 const command=execute.mock.calls[0][0];expect(model.discardStockDrafts().ok).toBe(false)
 await model.commitStockDrafts();expect(execute.mock.calls[1][0]).toEqual(command);expect(model.hasStockDrafts).toBe(false);model.close()
})
it('stages stocktake atomically in memory and blocks new mutations when disconnected',()=>{
 const {model,data,setReady,execute}=setup(),m=data.materials[0]
 const before=model.matMap[m.id].stock
 const result=model.batchStocktake([{materialId:m.id,newStock:before-1},{materialId:'MISSING',newStock:0}],true)
 expect(result.ok).toBe(false);expect(model.matMap[m.id].stock).toBe(before);expect(model.hasStockDrafts).toBe(false)
 setReady(false);expect(model.stockAdjust(m.id,before-1,'','',true).ok).toBe(false);expect(execute).not.toHaveBeenCalled();model.close()
})

it('invalidates original StockView computed material lists on staged, discarded and server updates',()=>{
 const {model,data,setData}=setup(),m=data.materials[0]
 const stock=computed(()=>model.materials.find(row=>row.id===m.id).stock)
 const original=stock.value
 expect(model.stockAdjust(m.id,original-1,'นับ','',true).ok).toBe(true)
 expect(stock.value).toBe(original-1)
 model.discardStockDrafts();expect(stock.value).toBe(original)
 const updated=structuredClone(data);updated.materials[0].stock-=200;updated.shop.revision++
 setData(updated);expect(stock.value).toBe(original-2);model.close()
})

it('removes a production recipe before changing its output to packaging through the original editor',async()=>{
 const {model,data,execute}=setup(f=>{Object.assign(f,typeFixture().base);f.materials[12].productionRecipe={yieldQ:1000,inputIds:['S0','S1'],quantities:[100,100]}}),id=data.materials[12].id,m=model.matMap[id]
 const result=await model.saveMaterial({...m,name:'บรรจุภัณฑ์',emoji:'📦',unit:'ชิ้น',inventoryType:'packaging',hasSubRecipe:false,subRecipe:[],packSize:1,packCost:10,unitCost:10,minAlert:0})
 expect(result,JSON.stringify(result)).toMatchObject({ok:true})
 const kinds=execute.mock.calls.map(([c])=>c.kind)
 expect(kinds.indexOf('production_recipe')).toBeLessThan(kinds.indexOf('material_type'));model.close()
})
it('does not freeze the baseline after an empty original stocktake',()=>{
 const {model,data,setData}=setup();model.batchStocktake([])
 const updated=structuredClone(data);updated.materials[0].stock-=100;updated.shop.revision++
 setData(updated);expect(model.stockDraftSnapshot[0].stock).toBe(updated.materials[0].stock/100);model.close()
})

it('uses the original active-then-insertion lot order for an overall physical count reduction',()=>{
 const {model,data}=setup(f=>{const m=f.materials[0],old=m.lots[m.lotIds[0]];m.lotIds=['A','B','C'];m.lots={_:m.lots._,...Object.fromEntries(m.lotIds.map((id,i)=>[id,{...old,id,qty:10000,ordinal:i,expiryDay:[40000,50000,45000][i],receiveDay:20000+i}]))};m.lotQty={_:0,A:10000,B:10000,C:10000};m.stock=30000;m.activeLotId='A';m.zeroActiveIds=[];m.allocationIds=['A','C','B'];m.slotIds=['A','C','B','_']})
 expect(model.stockAdjust(data.materials[0].id,50,'ตรวจนับ','',true).ok).toBe(true)
 expect(model.matMap[data.materials[0].id].lots.map(l=>[l.id,l.qty])).toEqual([['A',0],['B',0],['C',50]]);model.close()
})

it('retains confirmed prefix changes when a later command is rejected and the remainder is discarded',async()=>{
 const {model,data,execute}=setup(),a=data.materials[0],b=data.materials[1]
 model.stockAdjust(a.id,a.stock/100-1,'นับ','',true);model.stockAdjust(b.id,b.stock/100-1,'นับ','',true)
 execute.mockImplementationOnce(async c=>{const value={opId:c.opId,kind:c.kind};model.acknowledge(value);return {ok:true,value}})
 execute.mockImplementationOnce(async c=>({ok:true,value:{opId:c.opId,kind:c.kind,rejected:true,code:'STALE_INVENTORY_DRAFT'}}))
 expect((await model.commitStockDrafts()).ok).toBe(false);expect(model.hasStockDrafts).toBe(true)
 expect(model.discardStockDrafts().ok).toBe(true)
 expect(model.matMap[a.id].stock).toBe(a.stock/100-1);expect(model.matMap[b.id].stock).toBe(b.stock/100);model.close()
})

it('increases the current live lot when an imported depleted lot retains a historical active flag',()=>{
 const {model,data}=setup(f=>{const m=f.materials[0],old=m.lots[m.lotIds[0]];m.lotIds=['OLD','LIVE'];m.lots={_:m.lots._,OLD:{...old,id:'OLD',qty:0,ordinal:0},LIVE:{...old,id:'LIVE',qty:10000,ordinal:1}};m.lotQty={_:0,OLD:0,LIVE:10000};m.stock=10000;m.activeLotId='LIVE';m.zeroActiveIds=['OLD'];m.allocationIds=['LIVE'];m.slotIds=['LIVE','_','_','_']})
 expect(model.stockAdjust(data.materials[0].id,101,'ตรวจนับ','',true).ok).toBe(true)
 expect(model.matMap[data.materials[0].id].lots.map(l=>[l.id,l.qty])).toEqual([['OLD',0],['LIVE',101]]);model.close()
})
