import {it,expect,vi} from 'vitest'
import {reactive,nextTick} from 'vue'
import {mount} from '@vue/test-utils'
const state=vi.hoisted(()=>({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store,formatThaiDate:x=>x}))
import Activity from '../../src/components/modals/ActivityLogModal.vue'
const log={id:'L',timestamp:'2026-10-10T00:00:00Z',module:'stock',action:'stock_in',title:'รับเข้าสต็อก',targetId:'M',targetName:'นมสด',delta:10,beforeStock:20,afterStock:30,unit:'ml',description:'รายละเอียดรับเข้า',note:'หมายเหตุยาวที่ต้องอ่านได้ครบ',reason:'ซื้อเพิ่ม',user:'ผู้ดูแล'}
function open(mode={}){
 state.store=reactive({modals:{activityLog:{isOpen:true,...mode}},materials:[{id:'M',name:'นมสด',stock:30,unit:'ml'}],matMap:{},activityLogs:[log],closeActivityLog:vi.fn()})
 return mount(Activity,{attachTo:document.body})
}
it.each([{}, {module:'stock'}, {targetMaterialId:'M'}])('uses compact expandable history rows in context %j',mode=>{
 const wrapper=open(mode)
 const row=wrapper.get('details[data-history-entry]')
 expect(row.attributes('open')).toBeUndefined()
 expect(row.get('summary').text()).toContain('รับเข้า')
 expect(row.get('summary').text()).not.toContain(log.note)
 expect(row.text()).toContain(log.note)
 expect(row.text()).toContain(log.user)
 wrapper.unmount()
})
it('shortens technical activity titles without losing the original record',async()=>{
 const wrapper=open()
 state.store.activityLogs[0].title='รับเข้าสต็อก (Stock In)'
 await nextTick()
  const row=wrapper.get('details[data-history-entry]')
  expect(row.get('summary').text()).not.toContain('(Stock In)')
  expect(row.text()).toContain('รับเข้าสต็อก (Stock In)')
  wrapper.unmount()
})
it('shows inline date filters with labels and keeps filtering/search/reset working',async()=>{
 const wrapper=open()
 await wrapper.get('button[aria-controls="history-filters"]').trigger('click')
 expect(wrapper.get('#history-filters').isVisible()).toBe(true)
 await wrapper.get('#history-date-from').setValue('2026-10-11')
 expect(wrapper.vm.filteredLogs).toHaveLength(0)
 await wrapper.get('[aria-label="ล้างตัวกรองทั้งหมด"]').trigger('click')
 await wrapper.get('[aria-label="ค้นหาประวัติ"]').setValue('หมายเหตุยาว')
 expect(wrapper.vm.filteredLogs).toHaveLength(1)
 await wrapper.get('[aria-label="ล้างข้อความค้นหา"]').trigger('click')
 expect(wrapper.vm.searchQuery).toBe('')
 wrapper.unmount()
})
