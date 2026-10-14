import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import StockIn from '../../src/components/modals/StockInModal.vue'

it('synchronizes typed purchase packs with base quantity before staging a receipt',async()=>{
 const store=createTestStore();store.resetDemoData()
 const mat=store.activeMaterials.find(m=>!m.hasSubRecipe&&m.packSize>1)
 const wrapper=mount(StockIn)
 try {
  store.modals.stockIn={isOpen:true,materialId:mat.id};await flushPromises()
  await wrapper.get('[aria-label="จำนวนแพ็คที่รับเข้า"]').setValue('2.5')
  expect(wrapper.vm.inputPackQty).toBe(2.5)
  expect(wrapper.vm.inputBaseQty).toBe(2.5*mat.packSize)
  wrapper.vm.unitMode='base';await flushPromises()
  await wrapper.get('[aria-label="จำนวนหน่วยที่รับเข้า"]').setValue(String(1.5*mat.packSize))
  expect(wrapper.vm.inputPackQty).toBe(1.5)
 }finally{wrapper.unmount()}
})

it('synchronizes typed production batches and yield in either unit mode',async()=>{
 const store=createTestStore();store.resetDemoData()
 const mat=store.activeMaterials.find(m=>m.hasSubRecipe&&m.subRecipe?.length)
 const wrapper=mount(StockIn)
 try {
  store.modals.stockIn={isOpen:true,materialId:mat.id};await flushPromises()
  await wrapper.get('[aria-label="จำนวนรอบผลิต"]').setValue('1.5')
  expect(wrapper.vm.produceYieldQty).toBe(1.5*mat.yieldQty)
  wrapper.vm.produceUnitMode='base';await flushPromises()
  await wrapper.get('[aria-label="จำนวนที่ต้องการผลิต"]').setValue(String(2*mat.yieldQty))
  expect(wrapper.vm.produceBatchCount).toBe(2)
 }finally{wrapper.unmount()}
})
