import {afterEach,it,expect,vi} from 'vitest'
import {reactive} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import Settings from '../../src/views/SettingsView.vue'
let wrapper
afterEach(()=>{wrapper?.unmount();vi.restoreAllMocks();vi.unstubAllGlobals()})
async function setup(){
 const model=reactive({cloud:true,connected:true,allowedEmails:{"test@example.com":true},account:"test@example.com",saveAllowedEmails:vi.fn(),settingsBlocked:false,platforms:[],materials:[],menus:[],addons:[],orders:[],exportCloudBackup:vi.fn()})
 const createObjectURL=vi.fn(()=> 'blob:backup'),revokeObjectURL=vi.fn();vi.stubGlobal('URL',Object.assign(URL,{createObjectURL,revokeObjectURL}));const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 wrapper=mount(Settings,{props:{model}});await wrapper.get('[aria-controls="settings-backup"]').trigger('click')
 return {model,createObjectURL,click,button:()=>wrapper.findAll('button').find(b=>b.text()==='ดาวน์โหลดไฟล์สำรอง')}
}
it('shows only a read-only Firebase export, waits for a verified file and blocks double clicks',async()=>{
 const h=await setup();let resolve;h.model.exportCloudBackup.mockImplementation(()=>new Promise(r=>resolve=r))
 expect(wrapper.text()).not.toContain('ล้างข้อมูลทั้งหมดออก');expect(wrapper.text()).toContain('ผ่านเครื่องเจ้าของร้าน')
 await h.button().trigger('click');await h.button().trigger('click');expect(h.model.exportCloudBackup).toHaveBeenCalledTimes(1)
 expect(h.button().attributes('aria-busy')).toBe('true');expect(h.click).not.toHaveBeenCalled()
 resolve({text:'verified file',filename:'backup.json',revision:7,counts:{orders:251}});await flushPromises()
 expect(h.click).toHaveBeenCalledTimes(1);expect(wrapper.text()).toContain('revision 7 สำเร็จ')
})
it('does not download partial data after failure or loss of readiness',async()=>{
 const h=await setup();h.model.exportCloudBackup.mockRejectedValue({code:'BACKUP_BUSY'});await h.button().trigger('click');await flushPromises()
 expect(h.click).not.toHaveBeenCalled();expect(wrapper.get('#settings-backup [role="alert"]').text()).toContain('ข้อมูลร้านเปลี่ยน')
 h.model.settingsBlocked=true;await flushPromises();await h.button().trigger('click');expect(h.model.exportCloudBackup).toHaveBeenCalledTimes(1)
})
