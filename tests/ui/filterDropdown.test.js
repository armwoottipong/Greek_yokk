import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import FilterDropdown from '../../src/components/ui/FilterDropdown.vue'

it('supports caller-defined filter fields and emits changes only on Apply',async()=>{
 const anchor=document.createElement('button')
 vi.spyOn(anchor,'getBoundingClientRect').mockReturnValue({right:600,top:80,bottom:120})
 const values={status:'completed',start:'2026-10-01',end:'2026-10-10'}
 const wrapper=mount(FilterDropdown,{props:{id:'order-filter',open:true,anchor,values,fields:[{key:'status',label:'สถานะ',defaultValue:'any',options:[{id:'any',label:'ทั้งหมด'},{id:'completed',label:'เสร็จแล้ว'}]}]}})
 await wrapper.get('select').setValue('any')
 expect(wrapper.emitted('apply')).toBeUndefined()
 expect(values.status).toBe('completed')
 await wrapper.get('[data-apply-filters]').trigger('click')
 expect(wrapper.emitted('apply')[0][0]).toEqual({...values,status:'any'})
 expect(wrapper.emitted('close')).toHaveLength(1)
 wrapper.unmount()
})
it('uses the mobile drawer layout instead of anchor coordinates',async()=>{
 const width=window.innerWidth
 Object.defineProperty(window,'innerWidth',{configurable:true,value:390})
 const anchor=document.createElement('button')
 vi.spyOn(anchor,'getBoundingClientRect').mockReturnValue({right:600,top:80,bottom:120})
 const wrapper=mount(FilterDropdown,{props:{id:'mobile-filter',open:true,anchor,values:{status:'all'},includeDates:false}})
 try{
  expect(wrapper.get('.filter-shell').exists()).toBe(true)
  expect(wrapper.get('[data-filter-dropdown]').attributes('style')).toBeUndefined()
 }finally{wrapper.unmount();Object.defineProperty(window,'innerWidth',{configurable:true,value:width})}
})
