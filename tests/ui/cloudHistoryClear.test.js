import {it,expect,vi} from 'vitest'
import {reactive} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import ActivityLog from '../../src/components/modals/ActivityLogModal.vue'
it('uses the original clear control with shared-view wording, spinner and same-tick protection',async()=>{
 let resolve
 const model=reactive({cloud:true,materials:[],matMap:{},orders:[],historyLoading:false,modals:{activityLog:{isOpen:true,module:'stock'}},activityLogs:[{id:'OLD',module:'stock',action:'adjust',timestamp:'2026-10-27T01:00:00Z',title:'Old'}],confirmDialog:vi.fn().mockResolvedValue(true),clearActivityLogs:vi.fn(()=>new Promise(r=>{resolve=r})),closeActivityLog:vi.fn()})
 const w=mount(ActivityLog,{global:{provide:{'cloud-inventory-model':model},stubs:{teleport:true}}});await flushPromises()
 await w.get('[aria-controls="history-more-actions"]').trigger('click');await flushPromises()
 const first=w.vm.confirmClearLogs();w.vm.confirmClearLogs();await flushPromises()
 const button=()=>w.findAll('button').find(b=>b.text().includes('ล้างประวัติทั้งหมด'))
 expect(model.confirmDialog).toHaveBeenCalledTimes(1);expect(model.clearActivityLogs).toHaveBeenCalledTimes(1)
 expect(model.confirmDialog.mock.calls[0][0].message).toContain('เก็บหลักฐานระบบ')
 expect(button().attributes('aria-busy')).toBe('true');expect(button().attributes('disabled')).toBeDefined()
 w.vm.close();expect(model.closeActivityLog).not.toHaveBeenCalled()
 resolve({ok:false});await first;await flushPromises()
 expect(button().attributes('aria-busy')).toBeUndefined();expect(model.activityLogs).toHaveLength(1);w.unmount()
})
