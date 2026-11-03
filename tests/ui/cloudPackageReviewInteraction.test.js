import {it,expect} from 'vitest'
import {reactive} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'

it('keeps the cloud Package dialog interactive outside the inert app and closable when writes are locked',async()=>{
 const host=document.createElement('div');host.id='app';document.body.appendChild(host)
 const model=reactive({cloud:true,modals:{packageReview:{isOpen:true}},packageLocked:false,cartPackagePlan:{items:[],issues:[]},packageAdjustments:[],materials:[],resetPackageAdjustments(){},resetPackageAdjustment(){},savePackageAdjustment(){return {ok:true}}})
 const wrapper=mount(PackageReviewModal,{props:{model},attachTo:host})
 try{
  await flushPromises()
  const dialog=document.getElementById('PackageReviewModal')
  expect(host.hasAttribute('inert')).toBe(true)
  expect(host.contains(dialog)).toBe(false)
  model.packageLocked=true
  await flushPromises()
  const close=dialog.querySelector('button[aria-label="ปิดหน้าต่าง"]')
  expect(close.disabled).toBe(false)
  close.click();await flushPromises()
  expect(model.modals.packageReview.isOpen).toBe(false)
 }finally{wrapper.unmount();host.remove()}
})
