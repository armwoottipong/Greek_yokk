import {afterEach,expect,it,vi} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {packageStockFixture} from '../firestore/summaryPackageStockFixture.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {summaryStock} from '../../src/cloud/core/model/stock.js'
import {summaryCount} from '../../src/cloud/core/model/count.js'
import {summaryPackageStock} from '../../src/cloud/core/model/packageStock.js'

const models=[]
afterEach(()=>{for(const model of models.splice(0))model.close();sessionStorage.clear();vi.useRealTimers()})
function setup(customize=()=>{}){
 sessionStorage.clear()
 const fixture=summaryFixture();customize(fixture)
 const data={shop:materialRegistryShop(fixture.shop,fixture.materials),materials:fixture.materials,display:{menus:{},addons:{},platforms:{}}}
 const execute=vi.fn(async command=>({ok:true,value:{opId:command.opId,kind:command.kind}}))
 const model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute,isReady:()=>true,isBlocked:()=>false,storageKey:'stock-save-audit'})
 models.push(model)
 return {model,data,execute}
}
function zeroCostLot(){
 const fixture=summaryFixture(),material=fixture.materials[0],id=material.lotIds[0]
 material.unitCost=0;material.lots[id].unitCost=0
 return {fixture,material,id}
}

it('stages receiving and physical count together and confirms both in revision order',async()=>{
 const {model,data,execute}=setup(),m=data.materials[0],before=m.stock/100
 expect(model.stockIn(m.id,1.25,.5,'receipt',.5,{receiveDate:'2026-11-07',expiryDate:null}).ok).toBe(true)
 expect(model.stockAdjust(m.id,before+.5,'count','').ok).toBe(true)
 expect(execute).not.toHaveBeenCalled()
 expect(model.matMap[m.id].stock).toBe(before+.5)
 expect((await model.commitStockDrafts()).ok).toBe(true)
 expect(execute.mock.calls.map(([c])=>[c.kind,c.payload.expectedRevision])).toEqual([['inventory',data.shop.revision],['stock_count',data.shop.revision+1]])
 expect(model.hasStockDrafts).toBe(false)
 expect(model.matMap[m.id].stock).toBe(before+.5)
})

it('retains the same receiving operation ID and draft after an uncertain submission',async()=>{
 const {model,data,execute}=setup(),m=data.materials[0]
 expect(model.stockIn(m.id,1,.5,'',null,{receiveDate:'2026-11-07',expiryDate:null}).ok).toBe(true)
 execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 expect((await model.commitStockDrafts()).ok).toBe(false)
 const command=execute.mock.calls[0][0]
 expect(model.discardStockDrafts().ok).toBe(false)
 expect((await model.commitStockDrafts()).ok).toBe(true)
 expect(execute.mock.calls[1][0]).toEqual(command)
})

it('includes a legitimate zero-cost existing ingredient lot in merged receiving cost',()=>{
 const {fixture,material,id}=zeroCostLot(),qtyQ=material.lotQty[id],price=1
 const result=summaryStock(fixture.shop,material,{qtyQ,unitCost:price,receiveDay:material.lots[id].receiveDay,expiryDay:material.lots[id].expiryDay,newLotId:'UNUSED'})
 expect(result.operation.mode).toBe('merge')
 expect(result.next.unitCost).toBe(.5)
 expect(result.next.lots[id].unitCost).toBe(.5)
})

it('uses an explicit zero lot cost when valuing discarded inventory',()=>{
 const {fixture,material,id}=zeroCostLot();material.unitCost=5
 const result=summaryCount(fixture.shop,fixture.materials,[{materialId:material.id,mode:'waste',requestedQ:100,counts:[{id,to:material.lotQty[id]-100}]}])
 expect(result.operation.rows[0].lossCents).toBe(0)
})

it('caps actual waste at the lot remainder and preserves immutable lot provenance',()=>{
 const {fixture,material,id}=zeroCostLot();material.unitCost=2;material.lots[id].unitCost=2
 const before=structuredClone(material),quantity=material.lotQty[id]
 const result=summaryCount(fixture.shop,fixture.materials,[{materialId:material.id,mode:'waste',requestedQ:quantity+100,counts:[{id,to:0}]}])
 expect(material).toEqual(before)
 expect(result.nextMaterials[0].lotQty[id]).toBe(0)
 expect(result.nextMaterials[0].lots).toEqual(before.lots)
 expect(result.operation.rows[0].lossCents).toBe(quantity*2)
})

it('merges packaging into a working lot without deleting other historical quantities',()=>{
 const {base}=packageStockFixture(),material=base.materials[11],before=structuredClone(material)
 const result=summaryPackageStock(base.shop,material,{qtyQ:125,unitCost:.5,packCostCents:50,receiveDay:999999,expiryDay:999999})
 expect(material).toEqual(before)
 expect(result.next.stock).toBe(before.stock+125)
 expect(result.next.lotIds).toEqual(before.lotIds)
 for(const id of material.lotIds)expect(result.next.lotQty[id]).toBe(before.lotQty[id]+(id===result.operation.lotId?125:0))
 expect(result.next.slotIds).toHaveLength(4)
})

it('weights an existing zero-cost package master lot correctly',()=>{
 const {base}=packageStockFixture(),material=base.materials[11],id=material.slotIds[0]
 material.lots[id].unitCost=0
 const result=summaryPackageStock(base.shop,material,{qtyQ:100,unitCost:1})
 expect(result.next.lots[id].unitCost).toBe(100/(material.lotQty[id]+100))
})

it('blocks archiving a material used by a production recipe before issuing a command',async()=>{
 const {model,data,execute}=setup(f=>{f.materials[12].productionRecipe={yieldQ:100,inputIds:[f.materials[0].id],quantities:[100]}})
 expect((await model.softDeleteMaterial(data.materials[0].id)).ok).toBe(false)
 expect(execute).not.toHaveBeenCalled()
})
