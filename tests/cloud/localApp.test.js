import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import LocalApp from '../../src/LocalApp.vue'
vi.mock('../../src/App.vue',()=>({default:{template:'<div data-local-pos>existing POS</div>'}}))
it('keeps the existing POS available with a clear local-data label and a link back to Firebase',()=>{
 const w=mount(LocalApp)
 expect(w.find('[data-local-pos]').exists()).toBe(true)
 expect(w.text()).toContain('ข้อมูลเฉพาะเครื่อง')
 expect(w.get('a').attributes('href')).toBe('/Greek_yokk/')
 w.unmount()
})
