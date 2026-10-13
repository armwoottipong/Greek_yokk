import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore, material } from '../helpers/createStore'
import Settings from '../../src/views/SettingsView.vue'
import Pos from '../../src/views/PosView.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'

it('removes category settings while keeping backup navigation available', async () => {
  createTestStore()
  const w=mount(Settings)
  expect(w.find('[data-settings="categories"]').exists()).toBe(false)
  const backup=w.findAll('button').find(b=>b.text().includes('สำรองและกู้คืน'))
  expect(backup).toBeTruthy()
  await backup.trigger('click')
  expect(w.get('[data-settings="backup"]').isVisible()).toBe(true);w.unmount()
})
it('searches menus with mixed inventory types without a category strip', async () => {
  const s=createTestStore();s.materials=[material('R'),material('O',100,{hasSubRecipe:true}),material('P',100,{inventoryType:'packaging'})]
  s.menus=[{id:'M',name:'Mixed bowl',description:'Three types',isActive:true,prices:{PLAT01:50},recipe:[{materialId:'R',qty:2},{materialId:'O',qty:2},{materialId:'P',qty:1}]}]
  const w=mount(Pos)
  expect(w.find('nav[aria-label="หมวดเมนู"]').exists()).toBe(false)
  await w.get('[data-pos-search]').setValue('Three types')
  expect(w.text()).toContain('Mixed bowl')
  await w.get('[data-pos-search]').setValue('missing')
  expect(w.text()).toContain('ไม่พบเมนู');w.unmount()
})
it.each([[MenuEdit,'menuEdit','menuId','menus'],[AddonEdit,'addonEdit','addonId','addons']])('edits a sales item without category controls or overwriting legacy category', async (Component,modal,idKey,collection) => {
  const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
  const item=s[collection][0], category=item.category
  const w=mount(Component);s.modals[modal]={isOpen:true,[idKey]:item.id};await flushPromises()
  expect(w.find('[aria-label="หมวดหมู่"]').exists()).toBe(false)
  w.vm.form.name='Renamed';await w.vm.submit()
  expect(s[collection].find(row=>row.id===item.id).name).toBe('Renamed')
  expect(s[collection].find(row=>row.id===item.id).category).toBe(category);w.unmount()
})
it('offers normal and produced ingredients for addon recipes regardless of their old role', async () => {
  const s=createTestStore();s.resetDemoData()
  s.materials=[material('RAW',100,{isSubIngredient:true}),material('OUT',100,{hasSubRecipe:true,isSubIngredient:true}),material('P',100,{inventoryType:'packaging'})]
  s.addons[0].recipe=[{materialId:'RAW',qty:2}]
  const w=mount(AddonEdit);s.modals.addonEdit={isOpen:true,addonId:s.addons[0].id};await flushPromises()
  expect(w.find('optgroup[label="วัตถุดิบที่มีการผลิต"] option[value="OUT"]').exists()).toBe(true)
  expect(w.find('optgroup[label="วัตถุดิบปกติ"] option[value="RAW"]').exists()).toBe(true)
  expect(w.find('optgroup[label="บรรจุภัณฑ์"] option[value="P"]').exists()).toBe(true);w.unmount()
})
