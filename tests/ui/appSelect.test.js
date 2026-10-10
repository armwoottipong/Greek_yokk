import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {h,nextTick} from 'vue'
import AppSelect from '../../src/components/ui/AppSelect.vue'

function open(props={}){
 return mount(AppSelect,{attachTo:document.body,props:{modelValue:2,...props},attrs:{'aria-label':'หมวดหมู่'},slots:{default:()=>[h('optgroup',{label:'กลุ่ม A'},[h('option',{value:1,disabled:true},'ปิดใช้งาน'),h('option',{value:2},'โยเกิร์ต'),h('option',{value:3},'ผลไม้')])]}})
}
it('renders styled grouped options and emits the original typed value',async()=>{
 const wrapper=open(); await nextTick()
 const trigger=wrapper.get('[role=combobox]')
 expect(trigger.text()).toContain('โยเกิร์ต')
 await trigger.trigger('click')
 expect(document.querySelector('[role=listbox]').textContent).toContain('กลุ่ม A')
 document.querySelectorAll('[role=option]')[2].click(); await nextTick()
 expect(wrapper.emitted('update:modelValue')[0]).toEqual([3])
 expect(document.querySelector('[role=listbox]')).toBe(null)
 wrapper.unmount()
})
it('supports arrows, skips disabled options, selects with Enter and cancels with Escape',async()=>{
 const wrapper=open();await nextTick()
 const trigger=wrapper.get('[role=combobox]')
 await trigger.trigger('keydown',{key:'ArrowDown'})
 await trigger.trigger('keydown',{key:'Home'})
 await trigger.trigger('keydown',{key:'Enter'})
 expect(wrapper.emitted('update:modelValue')[0]).toEqual([2])
 await trigger.trigger('click');await trigger.trigger('keydown',{key:'Escape'})
 expect(trigger.attributes('aria-expanded')).toBe('false')
 expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
 wrapper.unmount()
})
it('reflects dynamic option labels and closes on outside interaction without committing',async()=>{
 const label=vi.fn(()=> 'โยเกิร์ต')
 const wrapper=mount(AppSelect,{attachTo:document.body,props:{modelValue:'A'},slots:{default:()=>h('option',{value:'A'},label())}})
 await nextTick();await wrapper.get('[role=combobox]').trigger('click')
 document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await nextTick()
 expect(wrapper.get('[role=combobox]').attributes('aria-expanded')).toBe('false')
 expect(wrapper.emitted('update:modelValue')).toBeUndefined()
 label.mockReturnValue('นมสด');await wrapper.setProps({modelValue:'B'})
 await wrapper.setProps({modelValue:'A'});await nextTick()
 expect(wrapper.get('[role=combobox]').text()).toContain('นมสด')
 wrapper.unmount()
})
it('supports typeahead and Tab cancellation and updates forwarded accessibility labels',async()=>{
 const wrapper=open();await nextTick()
 const trigger=wrapper.get('[role=combobox]')
 await trigger.trigger('keydown',{key:'ผ'})
 await trigger.trigger('keydown',{key:'Enter'})
 expect(wrapper.emitted('update:modelValue')[0]).toEqual([3])
 await trigger.trigger('click');await trigger.trigger('keydown',{key:'Tab'})
 expect(trigger.attributes('aria-expanded')).toBe('false')
 expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
 await wrapper.setProps({'aria-label':'เลือกหมวดหมู่ใหม่'})
 expect(trigger.attributes('aria-label')).toBe('เลือกหมวดหมู่ใหม่')
 await wrapper.setProps({disabled:true})
 expect(trigger.attributes('disabled')).toBeDefined()
 wrapper.unmount()
})
