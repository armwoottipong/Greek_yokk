import {afterEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {reactive} from 'vue'
import Settings from '../../src/views/SettingsView.vue'
let wrapper
afterEach(()=>wrapper?.unmount())
async function setup(){const model=reactive({cloud:true,connected:true,allowedEmails:{"test@example.com":true},account:"test@example.com",saveAllowedEmails:vi.fn(),revision:6,settingsBlocked:false,projectId:'demo-test',shopId:'test-shop',platforms:[{id:'p1',name:'Grab',gpPercent:30}],materials:[],menus:[],addons:[],orders:[],savePlatformGpRates:vi.fn(async()=>({ok:true}))});wrapper=mount(Settings,{props:{model}});await wrapper.get('[aria-controls="settings-platforms"]').trigger('click');return model}
it('uses the original GP form and exposes only Firebase connection and channels',async()=>{
 await setup();expect(wrapper.find('[data-gp-settings]').exists()).toBe(true)
 expect(wrapper.find('[data-settings="backup"]').exists()).toBe(false);expect(wrapper.find('[data-settings="sheets"]').exists()).toBe(false)
 await wrapper.get('[aria-controls="settings-firebase"]').trigger('click')
 expect(wrapper.get('#settings-firebase').text()).toContain('demo-test')
})
it('holds one save in flight, shows the spinner and awaits confirmation',async()=>{
 const m=await setup();let resolve;m.savePlatformGpRates.mockImplementation(()=>new Promise(r=>resolve=r))
 await wrapper.get('[aria-label="GP Grab"]').setValue('25.5');await wrapper.get('[data-gp-settings]').trigger('submit');await wrapper.get('[data-gp-settings]').trigger('submit')
 expect(m.savePlatformGpRates).toHaveBeenCalledTimes(1);expect(m.savePlatformGpRates).toHaveBeenCalledWith({p1:25.5},6)
 expect(wrapper.get('[data-gp-settings] button[type="submit"]').attributes('aria-busy')).toBe('true');expect(wrapper.get('[data-gp-settings] input').element.disabled).toBe(true)
 m.platforms[0].gpPercent=25.5;m.revision=7;resolve({ok:true});await flushPromises()
 expect(wrapper.text()).toContain('บันทึก GP สำเร็จ');expect(wrapper.get('[data-gp-settings] button[type="submit"]').element.disabled).toBe(true)
})
it('preserves a dirty draft on remote change and requires explicit reload',async()=>{
 const m=await setup();await wrapper.get('[data-gp-settings] input').setValue('20');m.platforms[0].gpPercent=35;m.revision=7;await flushPromises()
 expect(wrapper.get('[data-gp-settings] input').element.value).toBe('20');expect(wrapper.text()).toContain('ข้อมูลร้านเปลี่ยนแล้ว')
 await wrapper.get('[data-gp-settings]').trigger('submit');expect(m.savePlatformGpRates).not.toHaveBeenCalled()
 await wrapper.findAll('button').find(b=>b.text()==='โหลดค่าปัจจุบัน').trigger('click');expect(wrapper.get('[data-gp-settings] input').element.value).toBe('35')
})
it('retains failed drafts, never announces success, and blocks offline requests',async()=>{
 const m=await setup();m.savePlatformGpRates.mockResolvedValue({ok:false});await wrapper.get('[data-gp-settings] input').setValue('20');await wrapper.get('[data-gp-settings]').trigger('submit');await flushPromises()
 expect(wrapper.get('[data-gp-settings] input').element.value).toBe('20');expect(wrapper.text()).not.toContain('บันทึก GP สำเร็จ')
 m.settingsBlocked=true;await flushPromises();await wrapper.get('[data-gp-settings]').trigger('submit');expect(m.savePlatformGpRates).toHaveBeenCalledTimes(1)
})
