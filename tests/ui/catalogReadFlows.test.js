import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
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
 await w.get('[data-menu-edit]').trigger('click');await flushPromises();expect(w.get('#menu-name').element.value).toBe(menu.name);expect(store.modals.menuEdit.isOpen).toBe(false);expect(w.find('[role=dialog]').exists()).toBe(false);w.unmount()
})
it('shows addon details for broken material links and confirms exact deletion ID',async()=>{
 const store=createTestStore();store.resetDemoData();const addon=store.addons[0];addon.recipe=[{materialId:'MISSING',qty:1}]
 vi.spyOn(store,'confirmDialog').mockResolvedValue(true);const remove=vi.spyOn(store,'deleteAddon')
 const w=mount(Addon,{attachTo:document.body})
 await w.get(`[data-addon-details="${addon.id}"]`).trigger('click');await flushPromises()
 expect(document.getElementById('addon-details').textContent).toContain('ไม่พบวัตถุดิบ')
 await w.vm.deleteAddon(addon);expect(remove).toHaveBeenCalledWith(addon.id);w.unmount()
})
it('groups addon details by inventory type with separate estimated costs and every recipe row',async()=>{
 const store=createTestStore();store.resetDemoData()
 store.materials.push(material('FOOD',100,{name:'Cup fruit',category:'Packaging',unitCost:0.2}),material('PACK',100,{name:'Plain sleeve',category:'Fruit',inventoryType:'packaging',unit:'ใบ',unitCost:3}))
 const addon=store.addons[0];addon.recipe=[{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}]
 const before=JSON.stringify(store.addons)
 const w=mount(Addon,{attachTo:document.body})
 await w.get(`[data-addon-details="${addon.id}"]`).trigger('click');await flushPromises()
 const detail=document.getElementById('addon-details')
 const ingredients=detail.querySelector('[data-addon-ingredients]'),packaging=detail.querySelector('[data-addon-packaging]')
 expect(ingredients?.textContent).toContain('วัตถุดิบ');expect(ingredients?.textContent).toContain('Cup fruit');expect(ingredients?.textContent).toContain('฿5.00');expect(ingredients?.textContent).not.toContain('Plain sleeve')
 expect(packaging?.textContent).toContain('บรรจุภัณฑ์');expect(packaging?.textContent).toContain('Plain sleeve');expect(packaging?.textContent).toContain('2 ใบ');expect(packaging?.textContent).toContain('฿6.00');expect(packaging?.textContent).not.toContain('Cup fruit')
 expect(JSON.stringify(store.addons)).toBe(before);w.unmount()
})
