import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import PackageReviewModal from '../../src/components/modals/PackageReviewModal.vue'
import AppSelect from '../../src/components/ui/AppSelect.vue'

function setup(){
 const store=createTestStore()
 store.materials=[
  material('BOWL',10,{name:'ถ้วยเล็ก',inventoryType:'packaging',unit:'ใบ',image:'/bowl.jpg'}),
  material('BAG',10,{name:'ถุง',inventoryType:'packaging',unit:'ใบ'}),
  material('FOOD',10,{name:'น้ำผึ้ง'})
 ]
 store.cart=[{menu:{id:'M',name:'โยเกิร์ต',recipe:[{materialId:'BOWL',qty:1}],prices:{PLAT01:80}},selectedAddons:[],qty:2}]
 store.modals.packageReview.isOpen=true
 return store
}

it('shows pictures and directly adjusts quantities without dropping below zero',async()=>{
 const store=setup(),w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises()
  const row=w.get('article')
  expect(row.get('img').attributes('src')).toBe('/bowl.jpg')
  expect(row.find('button[aria-expanded]').exists()).toBe(false)
  expect(row.text()).toContain('จากสูตร 2')
  const minus=row.get('[aria-label="ลดจำนวนถ้วยเล็ก"]')
  await minus.trigger('click');await minus.trigger('click')
  expect(minus.element.disabled).toBe(true)
  expect(row.get('output').text()).toBe('0')
  await row.get('[aria-label="เพิ่มจำนวนถ้วยเล็ก"]').trigger('click')
  expect(row.get('output').text()).toBe('1')
  expect(store.packageAdjustments).toEqual([])
 }finally{w.unmount()}
})

it('saves a new package and a changed quantity with one shared reason and note',async()=>{
 const store=setup(),subtotal=store.cartSummary.subtotal
 const w=mount(PackageReviewModal,{attachTo:document.body})
 try{
  await flushPromises()
  const [add,reason]=w.findAllComponents(AppSelect)
  expect(add.get('select').text()).not.toContain('น้ำผึ้ง')
  await w.get('[aria-label="เพิ่มจำนวนถ้วยเล็ก"]').trigger('click')
  await add.get('select').setValue('BAG')
  await w.get('[data-add-package]').trigger('click')
  await w.get('[data-save-packages]').trigger('click')
  expect(w.get('[role="alert"]').text()).toContain('เลือกเหตุผล')
  await reason.get('select').setValue('other')
  await w.get('[data-save-packages]').trigger('click')
  expect(w.get('[role="alert"]').text()).toContain('ระบุเหตุผลเพิ่มเติม')
  await w.get('#package-note').setValue('ลูกค้าขอถ้วยและถุงเพิ่ม')
  await w.get('[data-save-packages]').trigger('click')
  expect(store.packageAdjustments).toEqual([
   {materialId:'BOWL',deltaQty:1,reason:'other',note:'ลูกค้าขอถ้วยและถุงเพิ่ม'},
   {materialId:'BAG',deltaQty:1,reason:'other',note:'ลูกค้าขอถ้วยและถุงเพิ่ม'}
  ])
  expect(store.modals.packageReview.isOpen).toBe(false)
  expect(store.cartSummary.subtotal).toBe(subtotal)
 }finally{w.unmount()}
})
