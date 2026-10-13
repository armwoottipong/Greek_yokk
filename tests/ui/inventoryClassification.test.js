import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { material, createTestStore } from '../helpers/createStore'
import Stock from '../../src/views/StockView.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import StockIn from '../../src/components/modals/StockInModal.vue'

it('filters by type and overlapping recipe roles immediately without producing', async () => {
  const s=createTestStore(); s.materials=[material('RAW'),material('OUT',0,{hasSubRecipe:true,subRecipe:[{materialId:'RAW',qty:10}]})]
  s.menus=[];s.addons=[{id:'A',name:'Extra raw',recipe:[{materialId:'RAW',qty:2}]}]
  const w=mount(Stock)
  expect(w.get('.desktop-material-table').text()).toContain('ใช้ในการผลิต')
  expect(w.get('.desktop-material-table').text()).toContain('ใช้ใน Add-on')
  w.vm.applyStockFilters({kind:'normal',role:'addon',showDeleted:false});await flushPromises()
  expect(w.findAll('.desktop-material-table [data-material-details]').map(x=>x.attributes('data-material-details'))).toEqual(['RAW'])
  s.addons[0].recipe=[];await flushPromises()
  expect(w.findAll('.desktop-material-table [data-material-details]')).toHaveLength(0)
  expect(s.materials.map(m=>m.stock)).toEqual([100,0]);w.unmount()
})
it('shows direct addon references with quantities on material details', async () => {
  const s=createTestStore();s.materials=[material('RAW')];s.addons=[{id:'A',name:'Extra raw',recipe:[{materialId:'RAW',qty:2}]}];s.menus=[]
  const w=mount(Stock,{attachTo:document.body})
  await w.get('.desktop-material-table [data-material-details="RAW"]').trigger('click');await flushPromises()
  const detail=document.querySelector('#material-details')
  expect(detail.textContent).toContain('Extra raw');expect(detail.textContent).toContain('2 g')
  w.unmount()
})
it('selects three types and allows a production input to have its own recipe', async () => {
  const s=createTestStore();s.materials=[material('RAW',0,{isSubIngredient:true}),material('OUT',0,{hasSubRecipe:true,subRecipe:[{materialId:'RAW',qty:10}]})]
  const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:'RAW'};await flushPromises()
  await w.get('input[type="radio"][value="produced"]').setValue()
  expect(w.vm.form.hasSubRecipe).toBe(true);expect(w.vm.form.inventoryType).toBe('ingredient')
  await w.get('input[type="radio"][value="packaging"]').setValue()
  expect(w.vm.form.hasSubRecipe).toBe(false);expect(w.vm.form.inventoryType).toBe('packaging')
  expect(w.find('[aria-label="หมวดหมู่"]').exists()).toBe(false);w.unmount()
})
it('does not silently replace a cleared origin date when receiving', async () => {
  const s=createTestStore();s.materials=[material('M',0,{category:'Toppings'})]
  const w=mount(StockIn);s.modals.stockIn={isOpen:true,materialId:'M'};await flushPromises()
  const origin=w.get('[aria-label="วันที่รับเข้า"]')
  await origin.setValue('');await w.get('[aria-label="วันหมดอายุ"]').setValue('2026-10-15')
  await w.vm.submit()
  expect(s.materials[0].stock).toBe(0)
  expect(w.text()).toContain('กรุณาระบุวันรับเข้า');w.unmount()
})
it('creates a new dated lot from the material editor without changing legacy category', async () => {
  const s=createTestStore();s.materials=[material('M',0,{category:'Legacy'})]
  vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
  const w=mount(MaterialEdit);s.modals.materialEdit={isOpen:true,materialId:'M'};await flushPromises()
  w.vm.form.stock=10;await flushPromises()
  await w.get('[aria-label="วันที่รับเข้า"]').setValue('2026-10-13')
  await w.vm.submit()
  expect(s.materials[0].stock).toBe(10)
  expect(s.materials[0].category).toBe('Legacy')
  expect(s.materials[0].lots.at(-1).receiveDate).toBe('2026-10-13');w.unmount()
})
it('identifies the origin of produced lots as production dates', async () => {
  const s=createTestStore();s.materials=[material('OUT',100,{hasSubRecipe:true})];s.menus=[];s.addons=[]
  const w=mount(Stock,{attachTo:document.body})
  await w.get('.desktop-material-table [data-material-details="OUT"]').trigger('click');await flushPromises()
  expect(document.querySelector('#material-details .lot-dates dt').textContent).toBe('วันผลิต');w.unmount()
})
