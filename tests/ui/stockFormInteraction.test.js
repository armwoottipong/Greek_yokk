import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Frame from '../../src/components/ui/DialogFrame.vue'
import StockIn from '../../src/components/modals/StockInModal.vue'
import Adjust from '../../src/components/modals/StockAdjustModal.vue'
import Waste from '../../src/components/modals/WasteModal.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
for(const [Component,key] of [[StockIn,'stockIn'],[Adjust,'stockAdjust'],[Waste,'waste'],[MaterialEdit,'materialEdit']]){
 it(`${key} uses the shared adaptive form frame`,async()=>{
  const store=createTestStore();store.materials=[material('M',500)]
  const w=mount(Component);store.modals[key]={...store.modals[key],isOpen:true,materialId:'M'};await flushPromises()
  expect(w.findComponent(Frame).exists()).toBe(true);w.unmount()
 })
}
it('links invalid receive quantity to an inline recovery message and retains conversion',async()=>{
 const store=createTestStore();store.materials=[material('M',500)]
 const w=mount(StockIn);store.modals.stockIn={isOpen:true,materialId:'M'};await flushPromises()
 w.vm.inputPackQty=1.25;w.vm.syncFromPackQty();expect(w.vm.inputBaseQty).toBe(1250)
 w.vm.inputPackQty=0;w.vm.syncFromPackQty();await w.vm.submit();await flushPromises()
 expect(w.get('input[aria-label="จำนวนแพ็คที่รับเข้า"]').attributes('aria-invalid')).toBe('true')
 expect(w.get('#StockInModal-error').text()).toContain('จำนวน');expect(store.modals.stockIn.isOpen).toBe(true);w.unmount()
})
it('protects a waste draft on cancel and keeps its lot context',async()=>{
 const store=createTestStore();store.materials=[material('M',500)]
 const confirm=vi.spyOn(store,'confirmDialog').mockResolvedValue(false)
 const w=mount(Waste);store.modals.waste={isOpen:true,materialId:'M',lotId:'LOT-M'};await flushPromises()
 w.vm.wasteQty=25;await w.vm.requestWasteClose()
 expect(confirm).toHaveBeenCalledOnce();expect(store.modals.waste.isOpen).toBe(true);expect(w.vm.currentLot.id).toBe('LOT-M');expect(w.vm.estimatedLossValue).toBe(25);w.unmount()
})
