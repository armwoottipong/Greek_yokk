import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'

function setup(){
 const store=createTestStore();store.materials=[
  material('BOWL',10,{name:'ถ้วยเล็ก',inventoryType:'packaging',unit:'ใบ'}),
  material('BAG',10,{name:'ถุง',inventoryType:'packaging',unit:'ใบ'}),
  material('FOOD',10,{name:'น้ำผึ้ง'})
 ]
 store.cart=[{menu:{id:'M',name:'โยเกิร์ต',recipe:[{materialId:'BOWL',qty:1}],prices:{PLAT01:80}},selectedAddons:[],qty:2}]
 store.modals.packageReview.isOpen=true
 return store
}

it('shows baseline, effective quantity, sources and only active package choices',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();expect(w.text()).toContain('จากสูตร 2');expect(w.text()).toContain('โยเกิร์ต')
  const select=w.get('[aria-label="เพิ่มบรรจุภัณฑ์"]')
  expect(select.text()).toContain('ถุง');expect(select.text()).not.toContain('น้ำผึ้ง')
 }finally{w.unmount()}
})

it('requires reasons and an explanation for other, then supports row and all reset',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();const qty=w.get('[aria-label="จำนวนถ้วยเล็ก"]');await qty.setValue('3')
  await w.get('[data-save-package="BOWL"]').trigger('click');expect(w.text()).toContain('เลือกเหตุผล')
  await w.get('[aria-label="เหตุผลถ้วยเล็ก"]').setValue('other');await w.get('[data-save-package="BOWL"]').trigger('click');expect(w.text()).toContain('ระบุเหตุผลเพิ่มเติม')
  await w.get('[aria-label="หมายเหตุถ้วยเล็ก"]').setValue('ลูกค้าขอ');await w.get('[data-save-package="BOWL"]').trigger('click')
  expect(store.packageAdjustments).toHaveLength(1);await w.get('[data-reset-package="BOWL"]').trigger('click');expect(store.packageAdjustments).toEqual([])
  store.savePackageAdjustment({materialId:'BOWL',requestedQty:3,reason:'other',note:'ลูกค้าขอ'});await flushPromises()
  await w.get('[data-reset-all-packages]').trigger('click');expect(store.packageAdjustments).toEqual([])
 }finally{w.unmount()}
})
