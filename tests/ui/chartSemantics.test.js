import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import Breakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
it('uses a native button for each ranking value and exposes pressed selection',async()=>{
 const w=mount(Breakdown,{props:{title:'ช่องทาง',rows:[{id:'A',label:'หน้าร้าน',value:100}]}})
 const button=w.get('[data-ranking-id="A"]');expect(button.element.tagName).toBe('BUTTON')
 await button.trigger('click');expect(button.attributes('aria-pressed')).toBe('true')
 await button.trigger('keydown',{key:'Escape'});expect(button.attributes('aria-pressed')).toBe('false');w.unmount()
})
