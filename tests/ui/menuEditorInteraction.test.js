import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'
it('retains drafts in collapsible sections and marks a missing required name',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(MenuEdit)
 store.modals.menuEdit={isOpen:true,menuId:null};await flushPromises()
 expect(w.findComponent(Frame).exists()).toBe(true)
 const rowsBefore=w.vm.baseRecipeRows.length;w.vm.form.prices[store.platforms[0].id]=12;w.vm.addBaseRecipeRow();await flushPromises()
 await w.get('[data-menu-prices] summary').trigger('click')
 expect(w.vm.form.prices[store.platforms[0].id]).toBe(12);expect(w.vm.baseRecipeRows).toHaveLength(rowsBefore+1)
 await w.vm.submit();await flushPromises();expect(w.get('#menu-name').attributes('aria-invalid')).toBe('true');expect(store.modals.menuEdit.isOpen).toBe(true);w.unmount()
})
it.each([true,false])('groups recipes by saved type and preserves save payload with hasPackage=%s',async(hasPackage)=>{
 const store=createTestStore();store.resetDemoData()
 store.materials=[
  material('FOOD',100,{name:'ถ้วยทดลอง',category:'Packaging',inventoryType:'ingredient'}),
  material('PACK',100,{name:'กล่องส่งสินค้า',category:'หมวดที่เปลี่ยนชื่อ',inventoryType:'packaging'}),
  material('ARCHIVE',100,{inventoryType:'packaging',isDeleted:true})
 ]
 const prices={[store.platforms[0].id]:125}
 store.menus=[{id:'MENU-TYPE',name:'ทดสอบสูตร',category:'Classic Bowls',emoji:'🥣',description:'สูตรเดิม',prices,hasAddons:false,hasPackage,recipe:[{materialId:'FOOD',qty:12.5},{materialId:'PACK',qty:2}]}]
 vi.spyOn(store,'confirmDialog').mockResolvedValue(true)
 const save=vi.spyOn(store,'saveMenu')
 const w=mount(MenuEdit);store.modals.menuEdit={isOpen:true,menuId:'MENU-TYPE'};await flushPromises()
 expect(w.vm.baseRecipeRows).toEqual([{materialId:'FOOD',qty:12.5}])
 expect(w.vm.packageRecipeRows).toEqual([{materialId:'PACK',qty:2}])
 expect(w.get('[data-menu-recipe]').text()).toContain('ถ้วยทดลอง')
 expect(w.get('[data-menu-recipe]').text()).not.toContain('กล่องส่งสินค้า')
 if(hasPackage){
  expect(w.get('[data-menu-packaging]').text()).toContain('กล่องส่งสินค้า')
  expect(w.get('[data-menu-packaging]').text()).not.toContain('ถ้วยทดลอง')
 }
 expect(w.vm.packagingMaterials.map(m=>m.id)).toEqual(['PACK'])
 await w.vm.submit()
 const payload=save.mock.calls[0][0]
 expect(payload).toMatchObject({name:'ทดสอบสูตร',emoji:'🥣',description:'สูตรเดิม',hasAddons:false,hasPackage,recipe:hasPackage?[{materialId:'FOOD',qty:12.5},{materialId:'PACK',qty:2}]:[{materialId:'FOOD',qty:12.5}]})
 expect(store.menus[0].category).toBe('Classic Bowls')
 expect(payload.prices[store.platforms[0].id]).toBe(125)
 w.unmount()
})
it('does not offer ingredients as packaging when no packaging items exist',async()=>{
 const store=createTestStore();store.resetDemoData();store.materials=[material('MAT010',100,{inventoryType:'ingredient',name:'ถ้วยทดลอง'})]
 const w=mount(MenuEdit);store.modals.menuEdit={isOpen:true,menuId:null};await flushPromises()
 expect(w.vm.packageRecipeRows).toEqual([])
 w.vm.addPackageRecipeRow();await flushPromises()
 expect(w.vm.packageRecipeRows).toEqual([])
 expect(w.vm.packagingMaterials).toEqual([])
 w.unmount()
})
it('canceling dirty close keeps names and recipe quantities intact',async()=>{
 const store=createTestStore();store.resetDemoData();vi.spyOn(store,'confirmDialog').mockResolvedValue(false)
 const w=mount(MenuEdit);store.modals.menuEdit={isOpen:true,menuId:store.menus[0].id};await flushPromises()
 w.vm.form.name='แก้ไขค้าง';w.vm.baseRecipeRows[0].qty=12.5
 await w.vm.requestClose(w.vm.close);expect(store.modals.menuEdit.isOpen).toBe(true);expect(w.vm.baseRecipeRows[0].qty).toBe(12.5);w.unmount()
})
