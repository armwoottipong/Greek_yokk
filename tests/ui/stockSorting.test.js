import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Stock from '../../src/views/StockView.vue'
import {createTestStore,material} from '../helpers/createStore'

it('sorts displayed numbers and dates without changing inventory or detaching lots',async()=>{
 const store=createTestStore()
 store.materials=[material('TEN',10,{name:'Ten',lastStockInDate:'2026-10-12',expiryDate:'2099-01-02'}),material('TWO',2,{name:'Two',lastStockInDate:'2026-10-01',expiryDate:'2099-01-01'}),material('NONE',20,{name:'None',lastStockInDate:null,expiryDate:null})]
 store.menus=[];store.addons=[]
 store.materials[0].lots.push({id:'RESERVE-TEN',qty:1,initialQty:1,unitCost:1,isInUse:false,receiveDate:'2026-10-02',expiryDate:'2099-01-02'})
 const wrapper=mount(Stock)
 const ids=()=>wrapper.findAll('.desktop-material-table [data-material-details]').map(e=>e.attributes('data-material-details'))
 const initial=JSON.stringify(store.materials)
 try{
  await wrapper.get('[data-lot-expand="TEN"]').trigger('click')
  await wrapper.get('[data-sort="stock"]').trigger('click')
  expect(ids()).toEqual(['TWO','TEN','NONE'])
  const expanded=wrapper.get('#stock-lots-TEN')
  expect(expanded.classes()).toContain('is-expanded')
  expect(expanded.element.closest('tr').previousElementSibling.querySelector('[data-material-details]').getAttribute('data-material-details')).toBe('TEN')
  expect(wrapper.get('[data-sort="stock"]').element.closest('th').getAttribute('aria-sort')).toBe('ascending')
  await wrapper.get('[data-sort="stock"]').trigger('click')
  expect(ids()).toEqual(['NONE','TEN','TWO'])
  await wrapper.get('[data-sort="receive"]').trigger('click')
  expect(ids()).toEqual(['TWO','TEN','NONE'])
  await wrapper.get('[data-sort="receive"]').trigger('click')
  expect(ids()).toEqual(['TEN','TWO','NONE'])
  await wrapper.get('[data-sort="receive"]').trigger('click')
  expect(ids()).toEqual(['TEN','TWO','NONE'])
  await wrapper.get('[data-sort="value"]').trigger('click')
  store.materials[0].stock=1
  await flushPromises()
  expect(ids()).toEqual(['TEN','TWO','NONE'])
  store.materials[0].stock=10
  expect(JSON.stringify(store.materials)).toBe(initial)
 }finally{wrapper.unmount()}
})

it('uses displayed pack cost, expiry and urgency for matching header sorts',async()=>{
 const store=createTestStore()
 store.materials=[material('LATE',10,{packCost:30,expiryDate:'2099-02-01'}),material('EARLY',3,{packCost:200,expiryDate:'2000-01-01'}),material('EMPTY',0,{packCost:2,expiryDate:null})]
 store.menus=[];store.addons=[]
 const wrapper=mount(Stock)
 const ids=()=>wrapper.findAll('.desktop-material-table [data-material-details]').map(e=>e.attributes('data-material-details'))
 try{
  await wrapper.get('[data-sort="cost"]').trigger('click')
  expect(ids()).toEqual(['EMPTY','LATE','EARLY'])
  await wrapper.get('[data-sort="expiry"]').trigger('click')
  expect(ids()).toEqual(['EARLY','LATE','EMPTY'])
  await wrapper.get('[data-sort="expiry"]').trigger('click')
  expect(ids()).toEqual(['LATE','EARLY','EMPTY'])
  await wrapper.get('[data-sort="status"]').trigger('click')
  expect(ids()).toEqual(['EARLY','EMPTY','LATE'])
  await wrapper.get('[aria-label="ค้นหาวัตถุดิบ"]').setValue('LATE')
  expect(ids()).toEqual(['LATE'])
 }finally{wrapper.unmount()}
})
