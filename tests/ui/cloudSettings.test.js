import {afterEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {reactive} from 'vue'
import Settings from '../../src/views/SettingsView.vue'
let wrapper
afterEach(()=>wrapper?.unmount())
async function setup(overrides={}){const model=reactive({cloud:true,connected:true,allowedEmails:{"test@example.com":true},account:"test@example.com",saveAllowedEmails:vi.fn(),revision:6,settingsBlocked:false,projectId:'demo-test',shopId:'test-shop',platforms:[{id:'p1',name:'Grab',gpPercent:30}],materials:[],menus:[],addons:[],orders:[],savePlatformGpRates:vi.fn(async()=>({ok:true})),...overrides});wrapper=mount(Settings,{props:{model},global:{stubs:{teleport:true}}});await wrapper.get('[aria-controls="settings-platforms"]').trigger('click');return model}
it('uses the original GP form and exposes only Firebase connection and channels',async()=>{
 await setup();expect(wrapper.find('[data-gp-settings]').exists()).toBe(true)
 expect(wrapper.find('[data-settings="backup"]').exists()).toBe(false);expect(wrapper.find('[data-settings="sheets"]').exists()).toBe(false)
 await wrapper.get('[aria-controls="settings-firebase"]').trigger('click')
 expect(wrapper.get('#settings-firebase').text()).toContain('demo-test')
})
it('saves the POS switch and restores the confirmed state if the change fails',async()=>{
 const savePosEnabled=vi.fn().mockResolvedValueOnce({ok:false,message:'ลองใหม่'}).mockResolvedValueOnce({ok:true})
 const m=await setup({posEnabled:true,savePosEnabled})
 const toggle=wrapper.get('[aria-label="เปิดใช้หน้าขาย POS"]')
 await toggle.setValue(false);await flushPromises()
 expect(savePosEnabled).toHaveBeenCalledWith(false,true)
 expect(toggle.element.checked).toBe(true)
 expect(wrapper.get('[data-pos-setting] [role="alert"]').text()).toBe('ลองใหม่')
 await toggle.setValue(false);m.posEnabled=false;await flushPromises()
 expect(toggle.element.checked).toBe(false)
 m.settingsBlocked=true;await flushPromises()
 expect(toggle.element.disabled).toBe(true)
})
it('holds one save in flight, shows the spinner and awaits confirmation',async()=>{
 const m=await setup();let resolve;m.savePlatformGpRates.mockImplementation(()=>new Promise(r=>resolve=r))
 await wrapper.get('[aria-label="GP Grab"]').setValue('25.5');await wrapper.get('[data-gp-settings]').trigger('submit');await wrapper.get('[data-gp-settings]').trigger('submit')
 expect(m.savePlatformGpRates).toHaveBeenCalledTimes(1);expect(m.savePlatformGpRates).toHaveBeenCalledWith({p1:25.5},6)
 expect(wrapper.get('[data-gp-settings] button[type="submit"]').attributes('aria-busy')).toBe('true');expect(wrapper.get('[data-gp-settings] input').element.disabled).toBe(true)
 m.platforms[0].gpPercent=25.5;m.revision=7;resolve({ok:true});await flushPromises()
 expect(wrapper.get('[data-gp-settings] button[type="submit"]').element.disabled).toBe(true)
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
it('lets the admin pause one channel while keeping the last channel available',async()=>{
 const m=await setup();m.platforms.push({id:'p2',name:'หน้าร้าน',gpPercent:0,isActive:true});await flushPromises()
 await wrapper.get('[aria-label="เปิดขายผ่าน Grab"]').setValue(false)
 expect(wrapper.text()).toContain('เปิดขาย 1 จาก 4 ช่องทาง')
 expect(wrapper.get('[aria-label="เปิดขายผ่าน หน้าร้าน"]').element.disabled).toBe(true)
 await wrapper.get('[data-gp-settings]').trigger('submit');await flushPromises()
 expect(m.savePlatformGpRates).toHaveBeenCalledWith({p1:30,p2:0},6,{p1:false,p2:true})
})

it('adds a named channel with a price source and keeps a failed draft for retry',async()=>{
 const changeChannel=vi.fn().mockResolvedValueOnce({ok:false,message:'ลองใหม่'}).mockResolvedValueOnce({ok:true})
 await setup({changeChannel})
 await wrapper.findAll('button').find(button=>button.text()==='เพิ่มช่องทาง').trigger('click')
 await wrapper.get('#channel-name').setValue('จัดส่งตรง')
 await wrapper.get('#channel-gp').setValue('12.75')
 await wrapper.get('#channel-editor-form').trigger('submit');await flushPromises()
 expect(changeChannel).toHaveBeenCalledWith({id:expect.stringMatching(/^CHANNEL-/),name:'จัดส่งตรง',gpBasisPoints:1275,sourceId:'p1'},6)
 expect(wrapper.get('#channel-editor [role="alert"]').text()).toContain('ลองใหม่')
 expect(wrapper.get('#channel-name').element.value).toBe('จัดส่งตรง')
 await wrapper.get('#channel-editor-form').trigger('submit');await flushPromises()
 expect(wrapper.find('#channel-editor-form').exists()).toBe(false)
})

it('confirms removal of only the selected channel and protects the last active channel',async()=>{
 const changeChannel=vi.fn(async()=>({ok:true}))
 await setup({changeChannel,platforms:[{id:'p1',name:'Grab',gpPercent:30,isActive:true},{id:'p2',name:'VIP',gpPercent:0,isActive:false}]})
 expect(wrapper.get('[aria-label="นำ Grab ออก"]').element.disabled).toBe(true)
 await wrapper.get('[aria-label="นำ VIP ออก"]').trigger('click');await flushPromises()
 expect(changeChannel).not.toHaveBeenCalled()
 await wrapper.findAll('#channel-remove button').find(button=>button.text()==='นำช่องทางออก').trigger('click');await flushPromises()
 expect(changeChannel).toHaveBeenCalledWith({id:'p2'},6)
})

it('saves a selected row without changing another GP and rejects a stale form',async()=>{
 const model=await setup({changeChannel:vi.fn(),platforms:[{id:'p1',name:'Grab',gpPercent:30},{id:'p2',name:'VIP',gpPercent:5}]})
 await wrapper.get('[aria-label="แก้ไข Grab"]').trigger('click');await wrapper.get('#channel-gp').setValue('25.5')
 await wrapper.get('#channel-editor-form').trigger('submit');await flushPromises()
 expect(model.savePlatformGpRates).toHaveBeenCalledWith({p1:25.5,p2:5},6,{p1:true,p2:true})
 await wrapper.get('[aria-label="แก้ไข Grab"]').trigger('click');model.revision=7;await flushPromises()
 await wrapper.get('#channel-editor-form').trigger('submit');await flushPromises()
 expect(model.savePlatformGpRates).toHaveBeenCalledTimes(1)
})
