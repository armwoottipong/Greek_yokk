import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
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
it('canceling dirty close keeps names and recipe quantities intact',async()=>{
 const store=createTestStore();store.resetDemoData();vi.spyOn(store,'confirmDialog').mockResolvedValue(false)
 const w=mount(MenuEdit);store.modals.menuEdit={isOpen:true,menuId:store.menus[0].id};await flushPromises()
 w.vm.form.name='แก้ไขค้าง';w.vm.baseRecipeRows[0].qty=12.5
 await w.vm.requestClose(w.vm.close);expect(store.modals.menuEdit.isOpen).toBe(true);expect(w.vm.baseRecipeRows[0].qty).toBe(12.5);w.unmount()
})
