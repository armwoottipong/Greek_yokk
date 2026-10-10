import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {h,ref,nextTick} from 'vue'
import AppCheckbox from '../../src/components/ui/AppCheckbox.vue'

it('updates boolean models from native interaction and forwards change once',async()=>{
 const checked=ref(false),change=vi.fn()
 const wrapper=mount({render:()=>h(AppCheckbox,{modelValue:checked.value,label:'เฉพาะยอดต่าง','onUpdate:modelValue':value=>{checked.value=value},onChange:change})},{attachTo:document.body})
 try{
  await wrapper.get('input').setValue(true)
  expect(checked.value).toBe(true)
  expect(change).toHaveBeenCalledOnce()
  expect(wrapper.get('input').attributes('aria-label')).toBe('เฉพาะยอดต่าง')
  checked.value=false;await nextTick()
  expect(wrapper.get('input').element.checked).toBe(false)
  wrapper.get('label').element.click();await nextTick()
  expect(checked.value).toBe(true)
 }finally{wrapper.unmount()}
})
it('preserves numeric values in checkbox groups',async()=>{
 const wrapper=mount(AppCheckbox,{props:{modelValue:[2],label:'เลือกวัตถุดิบ'},attrs:{value:3}})
 await wrapper.get('input').setValue(true)
 expect(wrapper.emitted('update:modelValue')[0]).toEqual([[2,3]])
 wrapper.unmount()
})
it('keeps switch semantics, updates labels and blocks disabled label interaction',async()=>{
 const wrapper=mount(AppCheckbox,{props:{modelValue:false,label:'ผลิตจากวัตถุดิบอื่น',variant:'switch',disabled:true},attachTo:document.body})
 try{
  expect(wrapper.get('input').attributes('role')).toBe('switch')
  wrapper.get('label').element.click();await nextTick()
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.get('input').element.disabled).toBe(true)
  await wrapper.setProps({label:'ผลิตเอง',disabled:false})
  expect(wrapper.get('input').attributes('aria-label')).toBe('ผลิตเอง')
  await wrapper.get('input').setValue(true)
  expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
 }finally{wrapper.unmount()}
})
