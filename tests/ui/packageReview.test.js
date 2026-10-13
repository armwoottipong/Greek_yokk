import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'
import AppSelect from '../../src/components/ui/AppSelect.vue'

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

it('steps packaging quantities without going below zero and saves only on confirmation',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();const qty=w.get('[aria-label="จำนวนถ้วยเล็ก"]')
  await w.get('[aria-label="เพิ่มจำนวนถ้วยเล็ก"]').trigger('click')
  expect(qty.element.value).toBe('3');expect(store.packageAdjustments).toEqual([])
  await w.get('[aria-label="ลดจำนวนถ้วยเล็ก"]').trigger('click')
  expect(qty.element.value).toBe('2')
  await qty.setValue('0')
  expect(w.get('[aria-label="ลดจำนวนถ้วยเล็ก"]').element.disabled).toBe(true)
  await w.get('[aria-label="ลดจำนวนถ้วยเล็ก"]').trigger('click')
  expect(qty.element.value).toBe('0')
  await qty.setValue('0.5');await w.get('[aria-label="เพิ่มจำนวนถ้วยเล็ก"]').trigger('click')
  expect(qty.element.value).toBe('1.5')
  const reason=w.findAllComponents(AppSelect)[1]
  await reason.get('select').setValue('separate_bag')
  await w.get('[data-save-package="BOWL"]').trigger('click')
  expect(store.packageAdjustments[0].deltaQty).toBe(-0.5)
 }finally{w.unmount()}
})

it('shows baseline, effective quantity, sources and only active package choices',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();expect(w.text()).toContain('จากสูตร 2');expect(w.text()).toContain('โยเกิร์ต')
  expect(w.findAllComponents(AppSelect)).toHaveLength(2)
  const select=w.findAllComponents(AppSelect)[0].get('select')
  expect(select.text()).toContain('ถุง');expect(select.text()).not.toContain('น้ำผึ้ง')
 }finally{w.unmount()}
})

it('requires reasons and an explanation for other, then supports row and all reset',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();const qty=w.get('[aria-label="จำนวนถ้วยเล็ก"]');await qty.setValue('3')
  await w.get('[data-save-package="BOWL"]').trigger('click');expect(w.text()).toContain('เลือกเหตุผล')
  const reason=w.findAllComponents(AppSelect)[1]
  await reason.get('button').trigger('keydown',{key:'ArrowDown'});await reason.get('button').trigger('keydown',{key:'End'});await reason.get('button').trigger('keydown',{key:'Enter'})
  await w.get('[data-save-package="BOWL"]').trigger('click');expect(w.text()).toContain('ระบุเหตุผลเพิ่มเติม')
  await w.get('[aria-label="หมายเหตุถ้วยเล็ก"]').setValue('ลูกค้าขอ');await w.get('[data-save-package="BOWL"]').trigger('click')
  expect(store.packageAdjustments).toHaveLength(1);await w.get('[data-reset-package="BOWL"]').trigger('click');expect(store.packageAdjustments).toEqual([])
  store.savePackageAdjustment({materialId:'BOWL',requestedQty:3,reason:'other',note:'ลูกค้าขอ'});await flushPromises()
  await w.get('[data-reset-all-packages]').trigger('click');expect(store.packageAdjustments).toEqual([])
 }finally{w.unmount()}
})

it('adds packaging through the shared selector without changing the charge',async()=>{
 const store=setup(),subtotal=store.cartSummary.subtotal,w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises();const selector=w.findAllComponents(AppSelect)[0]
  await selector.get('button').trigger('keydown',{key:'ArrowDown'});await selector.get('button').trigger('keydown',{key:'End'});await selector.get('button').trigger('keydown',{key:'Enter'})
  await w.findAll('button').find(button=>button.text()==='เพิ่ม').trigger('click');await flushPromises()
  expect(store.packageAdjustments.some(row=>row.materialId==='BAG')).toBe(true)
  expect(store.cartSummary.subtotal).toBe(subtotal)
 }finally{w.unmount()}
})
