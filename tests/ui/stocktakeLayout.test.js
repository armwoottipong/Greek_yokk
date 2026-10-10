import {it,expect,vi,beforeEach} from 'vitest'
import {reactive,nextTick} from 'vue'
import {mount} from '@vue/test-utils'
const state=vi.hoisted(()=>({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store}))
import Stocktake from '../../src/components/modals/StocktakeModal.vue'
beforeEach(()=>{
 const materials=[{id:'M1',name:'Milk',stock:500,unit:'ml',packUnit:'bottle',packSize:1000,category:'Dairy',unitCost:0.05},{id:'M2',name:'Oats',stock:100,unit:'g',category:'Toppings',unitCost:0.1}]
 state.store=reactive({materials,matMap:Object.fromEntries(materials.map(m=>[m.id,m])),modals:{stocktake:{isOpen:true}},batchStocktake:vi.fn(()=>({ok:true})),showToast:vi.fn()})
})
it('filters differing rows while retaining counts and stages all changed items',async()=>{
 const wrapper=mount(Stocktake,{attachTo:document.body})
 try{
  await wrapper.get('input[aria-label="ยอดนับจริง Milk"]').setValue('450')
  await wrapper.get('input[aria-label="เฉพาะยอดต่าง"]').setValue(true)
  expect(wrapper.findAll('[data-count-input]')).toHaveLength(1)
  await wrapper.get('input[aria-label="เฉพาะยอดต่าง"]').setValue(false)
  expect(wrapper.get('input[aria-label="ยอดนับจริง Milk"]').element.value).toBe('450')
  await wrapper.get('input[aria-label="ยอดนับจริง Oats"]').setValue('90')
  await wrapper.get('input[aria-label="เฉพาะยอดต่าง"]').setValue(true)
  await wrapper.get('input[aria-label="ค้นหาวัตถุดิบ"]').setValue('Milk')
  await wrapper.get('[data-stage-stocktake]').trigger('click')
  expect(state.store.batchStocktake).toHaveBeenCalledWith([{materialId:'M1',newStock:450,diff:-50},{materialId:'M2',newStock:90,diff:-10}],true)
  expect(state.store.modals.stocktake.isOpen).toBe(false)
 }finally{wrapper.unmount()}
})
it('lets Enter move to the next visible count input and explicit units preserve quantity',async()=>{
 const wrapper=mount(Stocktake,{attachTo:document.body})
 try{
  await nextTick()
  const milk=wrapper.get('input[aria-label="ยอดนับจริง Milk"]')
  milk.element.focus();await milk.trigger('keydown',{key:'Enter'})
  expect(document.activeElement).toBe(wrapper.get('input[aria-label="ยอดนับจริง Oats"]').element)
  await milk.setValue('450')
  const pack=wrapper.get('button[aria-label="นับ Milk เป็น bottle"]')
  await pack.trigger('click');await pack.trigger('click')
  expect(milk.element.value).toBe('0.45')
  expect(wrapper.vm.getActualBaseQty('M1')).toBe(450)
  await wrapper.get('button[aria-label="นับ Milk เป็น ml"]').trigger('click')
  expect(milk.element.value).toBe('450')
 }finally{wrapper.unmount()}
})
it('keeps a differing row mounted while typing through the system quantity',async()=>{
 const wrapper=mount(Stocktake,{attachTo:document.body})
 try{
  await nextTick()
  const selector='input[aria-label="ยอดนับจริง Milk"]'
  await wrapper.get(selector).setValue('400')
  await wrapper.get('input[aria-label="เฉพาะยอดต่าง"]').setValue(true)
  wrapper.get(selector).element.focus();await nextTick()
  await wrapper.get(selector).setValue('500')
  expect(wrapper.find(selector).exists()).toBe(true)
  await wrapper.get(selector).setValue('5000')
  expect(wrapper.vm.getActualBaseQty('M1')).toBe(5000)
  await wrapper.get(selector).setValue('500')
  await wrapper.get(selector).trigger('blur')
  expect(wrapper.find(selector).exists()).toBe(false)
 }finally{wrapper.unmount()}
})
