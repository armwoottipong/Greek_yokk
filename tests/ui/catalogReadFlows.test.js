import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Addon from '../../src/views/AddonView.vue'
it('opens menu detail without mutation, handles broken recipe and hands off the exact edit ID',async()=>{
 const store=createTestStore();store.resetDemoData();const menu=store.menus[0];menu.recipe=[{materialId:'MISSING',qty:0}]
 const before=JSON.stringify(store.menus)
 const w=mount(Menu,{attachTo:document.body})
 await w.get(`[data-catalog-details="${menu.id}"]`).trigger('click');await flushPromises()
 expect(document.getElementById('menu-recipe').textContent).toContain('ไม่พบวัตถุดิบ')
 expect(document.getElementById('menu-recipe').textContent).not.toContain('Infinity')
 expect(JSON.stringify(store.menus)).toBe(before)
 w.vm.editFromBom();expect(store.modals.menuEdit.menuId).toBe(menu.id);expect(w.vm.isBomModalOpen).toBe(false);w.unmount()
})
it('shows addon details for broken material links and confirms exact deletion ID',async()=>{
 const store=createTestStore();store.resetDemoData();const addon=store.addons[0];addon.materialId='MISSING';addon.amountUsed=0
 vi.spyOn(store,'confirmDialog').mockResolvedValue(true);const remove=vi.spyOn(store,'deleteAddon')
 const w=mount(Addon,{attachTo:document.body})
 await w.get(`[data-addon-details="${addon.id}"]`).trigger('click');await flushPromises()
 expect(document.getElementById('addon-details').textContent).toContain('ไม่พบวัตถุดิบ')
 await w.vm.deleteAddon(addon);expect(remove).toHaveBeenCalledWith(addon.id);w.unmount()
})
