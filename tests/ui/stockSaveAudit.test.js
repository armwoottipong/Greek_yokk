import {expect,it,vi} from 'vitest'
import {reactive} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'
import AppSelect from '../../src/components/ui/AppSelect.vue'
import {projectCloudPackages} from '../../src/cloud/core/packagePresentation.js'

it('preserves another unsaved Package row while saving one row in the cloud dialog',async()=>{
 const materials=[
  {id:'BOWL',name:'ถ้วย',unit:'ใบ',inventoryType:'packaging',deleted:false,unitCost:1},
  {id:'BAG',name:'ถุง',unit:'ใบ',inventoryType:'packaging',deleted:false,unitCost:1},
 ]
 const data={materials,shop:{catalog:{menus:{M:{recipe:{BOWL:100,BAG:100}}},addons:{}}},display:{menus:{M:{name:'โยเกิร์ต'}}}}
 const lines=[{menuId:'M',qty:1,optionIds:[]}]
 let model
 const save=vi.fn(input=>{
  const baseline=projectCloudPackages(data,lines).items.find(row=>row.materialId===input.materialId).baselineQty
  model.packageAdjustments=model.packageAdjustments.filter(row=>row.materialId!==input.materialId).concat({materialId:input.materialId,deltaQty:input.requestedQty-baseline,reason:input.reason,note:input.note})
  return {ok:true}
 })
 model=reactive({cloud:true,modals:{packageReview:{isOpen:true}},materials,packageLocked:false,packageAdjustments:[],get cartPackagePlan(){return projectCloudPackages(data,lines,this.packageAdjustments)},savePackageAdjustment:save})
 const wrapper=mount(PackageReviewModal,{props:{model},attachTo:document.body,global:{stubs:{Teleport:true}}})
 try{
  await flushPromises()
  await wrapper.get('[aria-label="จำนวนถ้วย"]').setValue('3')
  await wrapper.get('[aria-label="จำนวนถุง"]').setValue('4')
  await wrapper.findAllComponents(AppSelect)[1].get('select').setValue('separate_bag')
  await wrapper.findAllComponents(AppSelect)[2].get('select').setValue('repacked')
  expect(wrapper.get('[aria-label="จำนวนถุง"]').element.value).toBe('4')
  await wrapper.get('[data-save-package="BOWL"]').trigger('click')
  await flushPromises()
  expect(save).toHaveBeenCalledOnce()
  expect(model.packageAdjustments).toEqual([{materialId:'BOWL',deltaQty:2,reason:'separate_bag',note:''}])
  expect.soft(wrapper.get('[aria-label="จำนวนถุง"]').element.value).toBe('4')
  expect.soft(wrapper.findAllComponents(AppSelect)[2].get('select').element.value).toBe('repacked')
 }finally{wrapper.unmount()}
})
