import {it,expect,vi} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {summaryMaterialArchive} from '../../src/cloud/core/model/materialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {detachMaterialCommands} from '../../src/cloud/core/catalogDetachment.js'
function archiveFixture(){
 sessionStorage.clear();const f=summaryFixture();let data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{},addons:{},groups:{}}},model
 const run=async c=>{const p=planInventoryCommand(data.shop,data.materials,c);data={...data,shop:p.nextShop,materials:data.materials.map(m=>p.nextMaterials.find(n=>n.id===m.id)||m),display:p.displayChange?applyCatalogDisplay(data.display,p.displayChange):data.display};model.update(data);return {ok:true,value:{opId:c.opId,kind:c.kind}}}
 const execute=vi.fn(run)
 model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute,isReady:()=>true,isBlocked:()=>false,storageKey:'archive'})
 return {model,execute,run,get:()=>data,set:next=>{data=next;model.update(next)}}
}
it('requires confirmation and detaches only the chosen material before archiving, retaining all other menu fields',async()=>{
 const h=archiveFixture(),before=structuredClone(h.get()),id=before.materials[0].id
 const task=h.model.softDeleteMaterial(id)
 expect(h.model.modals.confirm).toMatchObject({isOpen:true,confirmationValue:'ยืนยัน'})
 expect(h.execute).not.toHaveBeenCalled();h.model.modals.confirm.onConfirm()
 const result=await task;expect(result,JSON.stringify(result)).toMatchObject({ok:true})
 expect(h.execute.mock.calls.at(-1)[0].kind).toBe('material_archive')
 const after=h.get();expect(after.materials.find(m=>m.id===id)).toMatchObject({deleted:true,stock:before.materials[0].stock})
 for(const collection of ['menus','addons'])for(const [key,old] of Object.entries(before.shop.catalog[collection])){
  const current=after.shop.catalog[collection][key],without=rows=>Object.fromEntries(Object.entries(rows).filter(([key])=>key!==id))
  expect(current.recipe).toEqual(without(old.rawRecipe||old.recipe))
  expect(current.pricesCents).toEqual(old.pricesCents);expect(current.active!==false).toBe(old.active!==false)
  if(collection==='menus'){expect(current.optionIds).toEqual(old.optionIds);expect(current.optionPrices).toEqual(old.optionPrices);expect(current.min).toBe(old.min);expect(current.max).toBe(old.max)}
 }
 h.model.close()
})
it('preserves multiple option groups and disabled packaging while detaching a declared material',()=>{
 const menu={id:'MENU',name:'Menu',active:true,pricesCents:{P:12345},recipe:{B:200},rawRecipe:{A:100,B:200},hasPackage:false,groupIds:['G1','G2'],optionIds:[],min:0,max:0,optionPrices:{P:{_:0}},priceMode:'addon',revision:9,baseMaterialIds:['B']}
 const data={shop:{catalog:{menus:{MENU:menu},addons:{}}},display:{menus:{MENU:{name:'Menu',emoji:'x',description:'keep',deleted:false}}}}
 const before=structuredClone(data),[command]=detachMaterialCommands(data,'A')
 expect(command.payload.input).toMatchObject({id:'MENU',groupIds:['G1','G2'],hasPackage:false,rawRecipe:{B:200},recipe:{B:200},pricesCents:{P:12345}})
 expect(command.payload.input).not.toHaveProperty('revision');expect(command.payload.display).toEqual(data.display.menus.MENU);expect(data).toEqual(before)
})
it('sends nothing when the archive confirmation is cancelled',async()=>{
 const h=archiveFixture(),before=structuredClone(h.get()),task=h.model.softDeleteMaterial(before.materials[0].id)
 expect(h.model.modals.confirm.isOpen).toBe(true);h.model.modals.confirm.onCancel()
 expect(await task).toMatchObject({ok:false});expect(h.execute).not.toHaveBeenCalled();expect(h.get()).toEqual(before);h.model.close()
})
it('requires a fresh confirmation if shop data changed while reviewing affected menus',async()=>{
 const h=archiveFixture(),task=h.model.softDeleteMaterial(h.get().materials[0].id)
 expect(h.model.modals.confirm.isOpen).toBe(true)
 const next=structuredClone(h.get());next.shop.revision++;h.set(next);h.model.modals.confirm.onConfirm()
 expect(await task).toMatchObject({ok:false});expect(h.execute).not.toHaveBeenCalled();h.model.close()
})
it('does not archive or lose recovery intent when a later detachment result is uncertain',async()=>{
 const h=archiveFixture(),id=h.get().materials[0].id
 h.execute.mockImplementationOnce(h.run).mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 const task=h.model.softDeleteMaterial(id);expect(h.model.modals.confirm.isOpen).toBe(true);h.model.modals.confirm.onConfirm()
 expect(await task).toMatchObject({ok:false});expect(h.get().materials.find(m=>m.id===id).deleted).toBe(false)
 expect(h.execute.mock.calls.some(([c])=>c.kind==='material_archive')).toBe(false);expect(h.model.unresolvedDraftCommand).toBeTruthy();h.model.close()
})
it('retires an unreferenced summary member while retaining its document for historical returns',()=>{
 const f=summaryFixture(),shop=materialRegistryShop(f.shop,f.materials),m=f.materials[0]
 shop.catalog.menus={};shop.catalog.addons={};shop.productionUsers[m.id]=[]
 const result=summaryMaterialArchive(shop,m,true)
 expect(result.next.deleted).toBe(true);expect(result.next.stock).toBe(m.stock)
 expect(result.nextShop.catalog.summaryMaterials).not.toContain(m.id)
 expect(result.nextShop.materialIds).toContain(m.id)
})
it('names hidden catalog references and retained-return history in deletion eligibility',()=>{
 sessionStorage.clear();const f=summaryFixture(),m=f.materials[0],shop=materialRegistryShop(f.shop,f.materials)
 shop.catalog.menus={OLD:{active:false,recipe:{[m.id]:100},rawRecipe:{[m.id]:100}}};shop.catalog.addons={};shop.returnMaterials={[m.id]:true}
 const data={shop,materials:f.materials,display:{menus:{OLD:{name:'เมนูเก่า',deleted:true}},addons:{}}}
 const model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute:vi.fn(),isReady:()=>true,isBlocked:()=>false,storageKey:'eligibility'})
 const eligibility=model.materialDeletionEligibility(m.id)
 expect(eligibility.blockers.join(' ')).toContain('เมนูเก่า');expect(eligibility.blockers.join(' ')).toContain('คืนบิล')
 model.close()
})
