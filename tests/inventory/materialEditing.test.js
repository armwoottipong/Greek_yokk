import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import StockView from '../../src/views/StockView.vue'
import {createTestStore,material} from '../helpers/createStore'
it('material production edit updates raw and output lots and survives reload',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',1000),material('OUT',540,{hasSubRecipe:true,yieldQty:540,subRecipe:[{materialId:'RAW',qty:100}]})]}})
 const result=s.saveMaterial({...s.materials[1],stock:1080})
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
 w.vm.confirmDeletePermanently();expect(s.materials.some(m=>m.id===mat.id)).toBe(true)
 w.vm.confirmArchiveInstead();expect(s.materials.find(m=>m.id===mat.id).isArchived).toBe(true);w.unmount()
})
it('metadata-only edits preserve lots and totals',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}});expect(s.saveMaterial({...s.materials[0],name:'new name'}).ok).toBe(true);expect(s.materials[0].stock).toBe(100)
})
it('duplicate production ingredients are aggregated before mutation',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material('RAW',100),material('OUT',0)]}})
 const result=s.batchProduce('OUT',20,[{materialId:'RAW',qty:60},{materialId:'RAW',qty:60}],'',{},true)
 expect(result?.success??result).toBe(false);expect(s.materials[0].stock).toBe(100);expect(s.materials[1].stock).toBe(0)
})
