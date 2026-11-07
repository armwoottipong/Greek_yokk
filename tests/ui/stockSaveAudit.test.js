import {expect,it,vi} from 'vitest'
import {reactive} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'
import AppSelect from '../../src/components/ui/AppSelect.vue'
import {projectCloudPackages} from '../../src/cloud/core/packagePresentation.js'

it('retains all unsaved quantities and the shared reason after a rejected cloud save',async()=>{
 const materials=[
  {id:'BOWL',name:'ถ้วย',unit:'ใบ',inventoryType:'packaging',deleted:false,unitCost:1},
  {id:'BAG',name:'ถุง',unit:'ใบ',inventoryType:'packaging',deleted:false,unitCost:1}
 ]
 const data={materials,shop:{catalog:{menus:{M:{recipe:{BOWL:100,BAG:100}}},addons:{}}},display:{menus:{M:{name:'โยเกิร์ต'}}}}
 const lines=[{menuId:'M',qty:1,optionIds:[]}]
 const save=vi.fn().mockReturnValueOnce({ok:false,message:'ตรวจสต็อกอีกครั้ง'}).mockReturnValueOnce({ok:true})
 const model=reactive({cloud:true,modals:{packageReview:{isOpen:true}},materials,packageLocked:false,packageAdjustments:[],get cartPackagePlan(){return projectCloudPackages(data,lines,this.packageAdjustments)},savePackageAdjustments:save})
 const wrapper=mount(PackageReviewModal,{props:{model},attachTo:document.body,global:{stubs:{Teleport:true}}})
 try{
  await flushPromises()
  await wrapper.get('[aria-label="เพิ่มจำนวนถ้วย"]').trigger('click')
  await wrapper.get('[aria-label="ลดจำนวนถุง"]').trigger('click')
  const reason=wrapper.findAllComponents(AppSelect)[1].get('select')
  await reason.setValue('repacked')
  await wrapper.get('[data-save-packages]').trigger('click')
  expect(wrapper.get('[role="alert"]').text()).toBe('ตรวจสต็อกอีกครั้ง')
  expect(wrapper.findAll('output').map(el=>el.text())).toEqual(['2','0'])
  expect(reason.element.value).toBe('repacked')
  expect(model.modals.packageReview.isOpen).toBe(true)
  const command={changes:[{materialId:'BOWL',requestedQty:2},{materialId:'BAG',requestedQty:0}],reason:'repacked',note:''}
  expect(save).toHaveBeenNthCalledWith(1,command)
  await wrapper.get('[data-save-packages]').trigger('click')
  expect(save).toHaveBeenNthCalledWith(2,command)
  expect(model.modals.packageReview.isOpen).toBe(false)
 }finally{wrapper.unmount()}
})
