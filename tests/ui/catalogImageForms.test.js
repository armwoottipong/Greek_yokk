import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import Crop from '../../src/components/images/ImageCropDialog.vue'
const jpg='data:image/jpeg;base64,/9j/2Q=='
it.each([{Component:MenuEdit,modal:'menuEdit',collection:'menus',action:'saveMenu'},{Component:MaterialEdit,modal:'materialEdit',collection:'materials',action:'saveMaterial'}])('retains the newly created $collection ID after an image failure and retries without duplication',async({Component,modal,collection,action})=>{
 const store=createTestStore();store.resetDemoData();store.cloud=true;store.catalogRevision=1
 const businessSave=vi.spyOn(store,action).mockImplementation(async input=>{
  const id=input.id||'NEW-ENTITY';const index=store[collection].findIndex(row=>row.id===id)
  if(index<0)store[collection].push({...input,id});else store[collection][index]={...input,id}
  return {ok:true}
 })
 vi.spyOn(store,'confirmDialog').mockResolvedValue(true)
 const service={watch:(_kind,_id,cb)=>{cb({dataURL:'',revision:0});return vi.fn()},save:vi.fn().mockRejectedValue(new Error('offline'))}
 const wrapper=mount(Component,{global:{provide:{'catalog-images':service,'cloud-inventory-model':store}}})
 store.modals[modal]={isOpen:true};await flushPromises();wrapper.vm.form.name='รูปทดสอบ';wrapper.vm.form.stock=0
 wrapper.findComponent(Crop).vm.$emit('apply',jpg);await flushPromises()
 await wrapper.vm.submit();await flushPromises()
 expect(store.modals[modal].isOpen).toBe(true);expect(wrapper.vm.form.id).toBe('NEW-ENTITY')
 expect(wrapper.vm.form.image).toBe(jpg);expect(wrapper.text()).toContain('รูปยังไม่สำเร็จ')
 store[collection].find(row=>row.id==='NEW-ENTITY').stock=9
 service.save.mockResolvedValue({revision:1,dataURL:jpg})
 await wrapper.vm.submit();await flushPromises()
 expect(businessSave).toHaveBeenCalledTimes(1)
 expect(store[collection].find(row=>row.id==='NEW-ENTITY').stock).toBe(9)
 expect(store[collection].filter(row=>row.id==='NEW-ENTITY')).toHaveLength(1)
 expect(store.modals[modal].isOpen).toBe(false)
 wrapper.unmount()
})
