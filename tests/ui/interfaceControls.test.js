import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import Button from '../../src/components/ui/Button.vue'
import IconButton from '../../src/components/ui/IconButton.vue'
import StatusBadge from '../../src/components/ui/StatusBadge.vue'
it('prevents clicks while busy and preserves its action label',async()=>{
 const w=mount(Button,{props:{loading:true},slots:{default:'บันทึก'}})
 await w.get('button').trigger('click');expect(w.emitted('click')).toBeUndefined()
 expect(w.get('button').attributes('aria-busy')).toBe('true')
 await w.setProps({loading:false});await w.get('button').trigger('click')
 expect(w.emitted('click')).toHaveLength(1);expect(w.text()).toContain('บันทึก');w.unmount()
})
it('names icon actions and expresses status with text',()=>{
 const icon=mount(IconButton,{props:{label:'ปิดรายละเอียด'},slots:{default:'<svg aria-hidden="true"/>'}})
 expect(icon.get('button').attributes('aria-label')).toBe('ปิดรายละเอียด')
 const status=mount(StatusBadge,{props:{tone:'warning',label:'ยังไม่บันทึก'}})
 expect(status.text()).toContain('ยังไม่บันทึก');icon.unmount();status.unmount()
})
