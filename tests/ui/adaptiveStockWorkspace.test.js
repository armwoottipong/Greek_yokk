import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Stock from '../../src/views/StockView.vue'
import Filter from '../../src/components/ui/FilterDropdown.vue'
it('routes primary stock actions to existing store dialogs',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Stock)
 try{
  expect(w.findComponent({name:'StockToolbar'}).exists()).toBe(true)
  await w.get('[data-stock-receive]').trigger('click');expect(store.modals.stockIn.isOpen).toBe(true);expect(store.modals.stockIn.materialId).toBe(store.activeMaterials[0].id)
  await w.get('[data-stocktake-open]').trigger('click');expect(store.modals.stocktake.isOpen).toBe(true)
  expect(w.text()).not.toContain('ระงับขายเมนู')
 }finally{w.unmount()}
})
it('applies usage/type/archive filters only after Apply, without a calendar',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Stock,{attachTo:document.body})
 try{
  await w.get('[data-stock-filter]').trigger('click');await flushPromises()
  const filter=w.getComponent(Filter)
  expect(filter.props('includeDates')).toBe(false)
  expect(document.getElementById('stock-filters').closest('[inert]')).toBeNull()
  expect(document.querySelector('#stock-filters .calendar-panel')).toBeNull()
  filter.vm.draft.role='production';filter.vm.draft.showDeleted=true
  filter.vm.$emit('close');await flushPromises()
  expect(w.vm.selectedRole).toBe('all');expect(w.vm.showDeleted).toBe(false)
  await w.get('[data-stock-filter]').trigger('click');await flushPromises()
  filter.vm.draft.role='production';filter.vm.draft.kind='all';filter.vm.draft.showDeleted=true;filter.vm.apply();await flushPromises()
  expect(w.vm.filteredMaterials.length).toBeGreaterThan(0)
  expect(w.vm.filteredMaterials.every(m=>store.materialUsageById.get(m.id).production.length)).toBe(true);expect(w.vm.showDeleted).toBe(true)
  await w.get('[data-stock-filter]').trigger('click');await flushPromises()
  filter.vm.reset();filter.vm.apply();await flushPromises()
  expect(w.vm.selectedRole).toBe('all');expect(w.vm.selectedKind).toBe('all');expect(w.vm.showDeleted).toBe(false)
  await w.get('input[aria-label="ค้นหาวัตถุดิบ"]').setValue('ไม่มีรายการนี้แน่นอน')
  expect(w.vm.filteredMaterials).toHaveLength(0)
  await w.get('input[aria-label="ค้นหาวัตถุดิบ"]').setValue('')
  expect(w.vm.filteredMaterials).toHaveLength(store.activeMaterials.length)
 }finally{w.unmount()}
})
