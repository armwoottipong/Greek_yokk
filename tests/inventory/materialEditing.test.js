import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import StockView from '../../src/views/StockView.vue'
import {createTestStore,material} from '../helpers/createStore'
it('material production edit updates raw and output lots and survives reload',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',1000),material('OUT',540,{hasSubRecipe:true,yieldQty:540,subRecipe:[{materialId:'RAW',qty:100}]})]}})
 const result=s.saveMaterial({...s.materials[1],stock:1080,lastStockInDate:'2026-10-13',expiryDate:null})
 expect(result.ok).toBe(true);expect(s.materials.map(m=>m.stock)).toEqual([900,1080]);expect(s.materials.map(m=>m.lots.reduce((n,l)=>n+l.qty,0))).toEqual([900,1080])
 expect(JSON.parse(localStorage.getItem('GY_DATABASE_V3')).materials.map(m=>m.stock)).toEqual([900,1080])
})
it('discovers every addon recipe row including packaging and names each addon once',()=>{
 const s=createTestStore();s.resetDemoData()
 s.addons=[{id:'A',name:'Fruit kit',recipe:[{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}]},{id:'B',name:'Second kit',recipe:[{materialId:'PACK',qty:1}]}]
 expect(s.getMaterialUsage('FOOD').usedInAddons).toEqual(['Fruit kit'])
 expect(s.getMaterialUsage('PACK')).toEqual(expect.objectContaining({isInUse:true,usedInAddons:['Fruit kit','Second kit']}))
 expect(s.getMaterialUsage('UNUSED').isInUse).toBe(false)
})
it('material edit protects an addon packaging row from permanent deletion and suggests archive',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0]
 s.menus=[];s.addons=[{id:'A',name:'Fruit kit',recipe:[{materialId:s.materials[1].id,qty:25},{materialId:mat.id,qty:2}]}]
 const confirm=vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:mat.id};await flushPromises()
 await w.vm.handlePermanentDelete()
 expect(s.materials.some(m=>m.id===mat.id)).toBe(true);expect(confirm).not.toHaveBeenCalled()
 expect(s.toasts.at(-1).message).toContain('Fruit kit');expect(s.toasts.at(-1).message).toContain('จัดเก็บแทน');w.unmount()
})
it('stock delete warning lists addons using a later recipe row and offers archive',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0]
 s.menus=[];s.addons=[{id:'A',name:'Fruit kit',recipe:[{materialId:s.materials[1].id,qty:25},{materialId:mat.id,qty:2}]}]
 const w=mount(StockView,{attachTo:document.body});w.vm.onActionPermanentDelete(mat);await flushPromises()
 expect(w.vm.deleteUsageWarning.usedInAddons).toEqual(['Fruit kit'])
 await w.vm.confirmDeletePermanently();expect(s.materials.some(m=>m.id===mat.id)).toBe(true)
 await w.vm.confirmArchiveInstead();expect(s.materials.find(m=>m.id===mat.id).isArchived).toBe(true);w.unmount()
})
it('metadata-only edits preserve lots and totals',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}});expect(s.saveMaterial({...s.materials[0],name:'new name'}).ok).toBe(true);expect(s.materials[0].stock).toBe(100)
})
it('duplicate production ingredients are aggregated before mutation',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',100),material('OUT',0)]}})
 const result=s.batchProduce('OUT',20,[{materialId:'RAW',qty:60},{materialId:'RAW',qty:60}],'',{},true)
 expect(result?.success??result).toBe(false);expect(s.materials[0].stock).toBe(100);expect(s.materials[1].stock).toBe(0)
})


it('waits for cloud archive confirmation and retains the original editor state after rejection',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0]
 let resolve;const archive=vi.spyOn(s,'softDeleteMaterial').mockImplementation(()=>new Promise(r=>{resolve=r}))
 const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:mat.id};await flushPromises()
 const task=w.vm.handleArchiveToggle()
 expect(w.vm.form.isDeleted).toBe(false)
 resolve({ok:false,message:'server rejected'});await task;await flushPromises()
 expect(w.vm.form.isDeleted).toBe(false);expect(s.modals.materialEdit.isOpen).toBe(true)
 expect(archive).toHaveBeenCalledTimes(1);w.unmount()
})

it('keeps the original editor open when cloud permanent deletion is unavailable',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0]
 vi.spyOn(s,'getMaterialUsage').mockReturnValue({isInUse:false})
 vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 vi.spyOn(s,'deleteMaterialPermanently').mockResolvedValue({ok:false,message:'audit retained'})
 const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:mat.id};await flushPromises()
 await w.vm.handlePermanentDelete();await flushPromises()
 expect(s.modals.materialEdit.isOpen).toBe(true);expect(w.vm.formError).toBe('audit retained');w.unmount()
})

it('keeps original draft review open when an uncertain cloud command prevents discard',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(StockView)
 vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 vi.spyOn(s,'discardStockDrafts').mockResolvedValue({ok:false,message:'pending receipt'})
 w.vm.showDraftDetails=true;await flushPromises();await w.vm.revertPendingChanges();await flushPromises()
 expect(w.vm.showDraftDetails).toBe(true);w.unmount()
})


it('shows a spinner on archive and ignores a second click until Firebase completes',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0];let resolve
 const archive=vi.spyOn(s,'softDeleteMaterial').mockImplementation(()=>new Promise(r=>{resolve=r}))
 const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:mat.id};await flushPromises()
 const button=w.get('button[title="จัดเก็บวัตถุดิบเพื่อซ่อนจากหน้าหลัก"]')
 await button.trigger('click');await flushPromises()
 expect(button.attributes('aria-busy')).toBe('true');expect(button.find('.ui-button-spinner').exists()).toBe(true)
 await button.trigger('click');expect(archive).toHaveBeenCalledTimes(1)
 resolve({ok:false,message:'rejected'});await flushPromises()
 expect(button.attributes('aria-busy')).toBeUndefined();expect(s.modals.materialEdit.isOpen).toBe(true);w.unmount()
})


it('locks save-all and draft details during an unresolved server commit',async()=>{
 const s=createTestStore();s.resetDemoData();const m=s.materials[0]
 s.stockAdjust(m.id,Math.max(0,m.stock-1),'count','',true)
 let resolve;const commit=vi.spyOn(s,'commitStockDrafts').mockImplementation(()=>new Promise(r=>{resolve=r}))
 const w=mount(StockView,{global:{stubs:{teleport:true}}});await flushPromises()
 const button=()=>w.get('[data-save-stock-drafts]')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');expect(button().find('.ui-button-spinner').exists()).toBe(true)
 await button().trigger('click');expect(commit).toHaveBeenCalledTimes(1)
 expect(w.get('[data-review-stock-drafts]').attributes('disabled')).toBeDefined()
 resolve({ok:false,message:'uncertain'});await flushPromises()
 expect(s.hasStockDrafts).toBe(true);expect(button().attributes('aria-busy')).toBeUndefined();w.unmount()
})

it('allows only one save confirmation and one cloud save while the original editor is pending',async()=>{
 const s=createTestStore();s.resetDemoData();const mat=s.materials[0]
 let confirm,save;const confirmation=vi.spyOn(s,'confirmDialog').mockImplementation(()=>new Promise(r=>{confirm=r}))
 const persist=vi.spyOn(s,'saveMaterial').mockImplementation(()=>new Promise(r=>{save=r}))
 const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:mat.id};await flushPromises()
 const button=w.get('.material-editor-footer .ui-button--primary')
 await button.trigger('click');await button.trigger('click');await flushPromises()
 expect(confirmation).toHaveBeenCalledTimes(1);expect(button.attributes('aria-busy')).toBe('true')
 confirm(true);await flushPromises();await button.trigger('click');expect(persist).toHaveBeenCalledTimes(1)
 save({ok:false,message:'retry after checking result'});await flushPromises()
 expect(s.modals.materialEdit.isOpen).toBe(true);expect(button.attributes('aria-busy')).toBeUndefined();w.unmount()
})
