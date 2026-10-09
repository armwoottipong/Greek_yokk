import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
const state = vi.hoisted(() => ({ store: null }))
vi.mock('@/stores/posStore', () => ({ usePosStore: () => state.store, formatThaiDate: x => x, formatDisplayDate: x => x }))
vi.mock('@/composables/useModalForm', () => ({ useModalForm: () => ({ saveSnapshot: () => {}, requestClose: () => {}, confirmSave: async () => true }) }))
import StockAdjust from '../../src/components/modals/StockAdjustModal.vue'
import Stocktake from '../../src/components/modals/StocktakeModal.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
beforeEach(() => {
 const material = { id:'M1', name:'Milk', unit:'g', stock:540, packUnit:'bag', packSize:1000, unitCost:0, category:'raw', lots:[{id:'L1',qty:40},{id:'L2',qty:500}], isDeleted:false }
 state.store = reactive({ materials:[material], matMap:{M1:material}, activeMaterials:[material], materialCategories:[], modals:{stocktake:{isOpen:false},stockAdjust:{isOpen:false,materialId:'M1',lotId:'L2'},materialEdit:{isOpen:false,materialId:'M1'}}, restoreMaterial:vi.fn(), archiveMaterial:vi.fn(), showToast:vi.fn() })
})
describe('stock forms', () => {
 it('keeps requested lot on first opening', async () => {
  const wrapper=mount(StockAdjust)
  state.store.modals.stockAdjust.isOpen=true
  await nextTick(); await nextTick()
  expect(wrapper.vm.selectedLotId).toBe('L2')
  expect(wrapper.vm.actualStock).toBe(500)
  wrapper.unmount()
 })
 it('keeps canonical quantity through repeated unit toggles', async () => {
  state.store.modals.stocktake.isOpen=true
  const wrapper=mount(Stocktake)
  for(let i=0;i<6;i++) wrapper.vm.toggleCountUnit('M1')
  expect(wrapper.vm.getActualBaseQty('M1')).toBe(540)
  expect(wrapper.vm.getVariance('M1')).toBe(0)
  wrapper.vm.counts.M1.value=1.25
  for(let i=0;i<6;i++) wrapper.vm.toggleCountUnit('M1')
  expect(wrapper.vm.getActualBaseQty('M1')).toBe(1.25)
  wrapper.unmount()
 })
 it('loads archive state so first action restores', async () => {
  state.store.materials[0].isDeleted=true
  const wrapper=mount(MaterialEdit)
  state.store.modals.materialEdit.isOpen=true
  await nextTick(); await nextTick()
  expect(wrapper.vm.form.isDeleted).toBe(true)
  wrapper.vm.handleArchiveToggle()
  expect(state.store.restoreMaterial).toHaveBeenCalledOnce()
  wrapper.unmount()
 })
})

describe('failed form transactions',()=>{
 it('keeps stocktake open when draft staging fails',()=>{
  state.store.modals.stocktake.isOpen=true
  state.store.batchStocktake=()=>({ok:false,message:'Failed'})
  const wrapper=mount(Stocktake)
  wrapper.vm.setCountValue('M1',500)
  wrapper.vm.submitStocktake()
  expect(state.store.modals.stocktake.isOpen).toBe(true)
  wrapper.unmount()
 })
 it('keeps material editor open when saving fails',async()=>{
  state.store.saveMaterial=()=>({ok:false,message:'Failed'})
  const wrapper=mount(MaterialEdit)
  state.store.modals.materialEdit.isOpen=true
  await nextTick();await nextTick()
  await wrapper.vm.submit()
  expect(state.store.modals.materialEdit.isOpen).toBe(true)
  wrapper.unmount()
 })
})

it('retains exact fractional stock in the pack display',async()=>{
 state.store.matMap.M1.lots[1].qty=1.25
 const wrapper=mount(StockAdjust)
 state.store.modals.stockAdjust.isOpen=true
 await nextTick();await nextTick()
 expect(wrapper.vm.actualPackStock).toBe(0.00125)
 wrapper.unmount()
})
