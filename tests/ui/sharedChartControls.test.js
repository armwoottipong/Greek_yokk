import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {h} from 'vue'
import SegmentedControl from '../../src/components/ui/SegmentedControl.vue'
import ChartMark from '../../src/components/charts/ChartMark.vue'
it('names the control and emits only a changed value while preserving option attributes',async()=>{
 const w=mount(SegmentedControl,{props:{modelValue:'line',label:'รูปแบบกราฟ',options:[{value:'line',label:'เส้น'},{value:'bar',label:'แท่ง'}],buttonAttrs:o=>({'data-mode':o.value})}})
 expect(w.attributes('role')).toBe('group')
 expect(w.attributes('aria-label')).toBe('รูปแบบกราฟ')
 await w.get('[data-mode=line]').trigger('click')
 expect(w.emitted('update:modelValue')).toBeUndefined()
 await w.get('[data-mode=bar]').trigger('click')
 expect(w.emitted('update:modelValue')).toEqual([['bar']])
 await w.setProps({modelValue:'bar'})
 expect(w.get('[data-mode=bar]').attributes('aria-pressed')).toBe('true')
 w.unmount()
})
it('renders an SVG mark in the SVG namespace and shares keyboard and hover behavior',async()=>{
 const w=mount({render:()=>h('svg',[h(ChartMark,{as:'circle',label:'ต้นทุน 20 บาท',cx:10,cy:20,r:4})])})
 const mark=w.get('circle')
 expect(mark.element.namespaceURI).toBe('http://www.w3.org/2000/svg')
 expect(mark.attributes('tabindex')).toBe('0')
 await mark.trigger('mouseenter');await mark.trigger('mouseleave');await mark.trigger('keydown',{key:'Enter'});await mark.trigger('keydown',{key:' '})
 const c=w.getComponent(ChartMark)
 expect(c.emitted('highlight')).toHaveLength(1);expect(c.emitted('clear')).toHaveLength(1);expect(c.emitted('activate')).toHaveLength(2)
 w.unmount()
})
it('prevents native button key defaults so activation is emitted once',async()=>{
 const w=mount(ChartMark,{props:{as:'button',label:'ต้นทุน'}})
 const event=new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})
 w.element.dispatchEvent(event)
 expect(event.defaultPrevented).toBe(true)
 expect(w.emitted('activate')).toHaveLength(1)
 w.unmount()
})
