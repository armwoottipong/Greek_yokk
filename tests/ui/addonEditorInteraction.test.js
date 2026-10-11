import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Addon from '../../src/components/modals/AddonEditModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'
it('uses a shared frame and preserves zero quantity through save',async()=>{
 const store=createTestStore();store.resetDemoData();vi.spyOn(store,'confirmDialog').mockResolvedValue(true);const save=vi.spyOn(store,'saveAddon').mockReturnValue({ok:true})
 const w=mount(Addon);store.modals.addonEdit={isOpen:true,addonId:store.addons[0].id};await flushPromises()
 expect(w.findComponent(Frame).exists()).toBe(true)
 w.vm.form.amountUsed=0;w.vm.form.prices[store.platforms[0].id]=0;await w.vm.submit()
 expect(save).toHaveBeenCalledWith(expect.objectContaining({amountUsed:0,prices:expect.objectContaining({[store.platforms[0].id]:0})}));w.unmount()
})
it('makes broken linkage visible and names the recovery error',async()=>{
 const store=createTestStore();store.resetDemoData();store.addons[0].materialId='MISSING'
 const w=mount(Addon);store.modals.addonEdit={isOpen:true,addonId:store.addons[0].id};await flushPromises()
 expect(w.text()).toContain('ไม่พบวัตถุดิบที่ผูกไว้');expect(w.vm.selectedMaterialUnit).toBe('ไม่ระบุหน่วย')
 w.vm.form.name='';await w.vm.submit();await flushPromises();expect(w.get('#addon-name').attributes('aria-invalid')).toBe('true');w.unmount()
})
