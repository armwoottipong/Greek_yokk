import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Stock from '../../src/views/StockView.vue'
import Confirm from '../../src/components/modals/ConfirmModal.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
it('names deletion, starts on cancel, and offers archive for a referenced material',async()=>{
 const store=createTestStore();store.materials=[material('M',100)];store.menus=[{id:'MENU',name:'สูตร',recipe:[{materialId:'M',qty:1}]}]
 const w=mount(Stock,{attachTo:document.body})
 w.vm.onActionPermanentDelete(store.materials[0]);await flushPromises()
 expect(document.getElementById('stock-delete-material')).toBeTruthy()
 expect(document.activeElement.textContent).toContain('ยกเลิก')
 expect(document.querySelector('[data-delete-material]')).toBeNull()
 w.vm.closeDeleteModal();expect(store.materials[0].isDeleted).not.toBe(true)
 w.vm.onActionArchive(store.materials[0]);expect(store.materials[0].isDeleted).toBe(true)
 w.vm.onActionRestore(store.materials[0]);expect(store.materials[0].isDeleted).toBe(false);w.unmount()
})
it('consumes a confirm callback once even when callback leaves the dialog open',()=>{
 const store=createTestStore();const callback=vi.fn();store.modals.confirm={isOpen:true,title:'Test',onConfirm:callback}
 const w=mount(Confirm);w.vm.onConfirm();w.vm.onConfirm();expect(callback).toHaveBeenCalledOnce();w.unmount()
})
it('uses app confirmation instead of native confirmation for unused materials',async()=>{
 const store=createTestStore();store.materials=[material('M',100)]
 const confirm=vi.spyOn(store,'confirmDialog').mockResolvedValue(false)
 const remove=vi.spyOn(store,'deleteMaterialPermanently')
 const w=mount(MaterialEdit);store.modals.materialEdit={isOpen:true,materialId:'M'};await flushPromises()
 await w.vm.handlePermanentDelete();expect(confirm).toHaveBeenCalledOnce();expect(remove).not.toHaveBeenCalled();w.unmount()
})
