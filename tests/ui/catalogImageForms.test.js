import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import Crop from '../../src/components/images/ImageCropDialog.vue'
const jpg='data:image/jpeg;base64,/9j/2Q=='
it.each([{Component:MenuEdit,modal:'menuEdit',collection:'menus',action:'saveMenu',idKey:'menuId'},{Component:AddonEdit,modal:'addonEdit',collection:'addons',action:'saveAddon',idKey:'addonId'}])('saves only the picture for an unchanged existing $collection entry',async({Component,modal,collection,action,idKey})=>{
 const store=createTestStore();store.resetDemoData();store.cloud=true;store.catalogRevision=1
 store[collection]=[{id:'EXISTING',name:'Original',emoji:'🥣',description:'',prices:Object.fromEntries(store.platforms.map(p=>[p.id,69])),recipe:[],hasAddons:false,hasPackage:false,addonGroupIds:[]}]
 const save=vi.spyOn(store,action).mockResolvedValue({ok:true});vi.spyOn(store,'confirmDialog').mockResolvedValue(true)
 const service={watch:(_kind,_id,cb)=>{cb({dataURL:'',revision:0});return vi.fn()},save:vi.fn().mockResolvedValue({dataURL:jpg,revision:1})}
 const wrapper=mount(Component,{global:{provide:{'catalog-images':service,'cloud-inventory-model':store}}})
 store.modals[modal]={isOpen:true,[idKey]:'EXISTING'};await flushPromises()
 wrapper.findComponent(Crop).vm.$emit('apply',jpg);await flushPromises();await wrapper.vm.submit();await flushPromises()
 expect(save).not.toHaveBeenCalled();expect(service.save).toHaveBeenCalledWith(collection,'EXISTING',jpg,0)
 expect(store.modals[modal].isOpen).toBe(false);wrapper.unmount()
})
it('does not write stock or material metadata for a picture-only material edit',async()=>{
 const store=createTestStore();store.resetDemoData();store.cloud=true;store.materials=[material('EXISTING',10,{name:'Original'})]
 const save=vi.spyOn(store,'saveMaterial').mockResolvedValue({ok:true});vi.spyOn(store,'confirmDialog').mockResolvedValue(true)
 const service={watch:(_kind,_id,cb)=>{cb({dataURL:'',revision:0});return vi.fn()},save:vi.fn().mockResolvedValue({dataURL:jpg,revision:1})}
 const wrapper=mount(MaterialEdit,{global:{provide:{'catalog-images':service,'cloud-inventory-model':store}}})
 store.modals.materialEdit={isOpen:true,materialId:'EXISTING'};await flushPromises()
 wrapper.findComponent(Crop).vm.$emit('apply',jpg);await flushPromises();store.materials[0].stock=9
 await wrapper.vm.submit();await flushPromises()
 expect(save).not.toHaveBeenCalled();expect(service.save).toHaveBeenCalledWith('materials','EXISTING',jpg,0)
 expect(store.materials[0].stock).toBe(9);wrapper.unmount()
})
it.each([{Component:MenuEdit,modal:'menuEdit',collection:'menus',action:'saveMenu'},{Component:AddonEdit,modal:'addonEdit',collection:'addons',action:'saveAddon'},{Component:MaterialEdit,modal:'materialEdit',collection:'materials',action:'saveMaterial'}])('retains the newly created $collection ID after an image failure and retries without duplication',async({Component,modal,collection,action})=>{
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
