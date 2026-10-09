import { it,expect,vi } from 'vitest'
import { reactive,nextTick } from 'vue'
import { mount } from '@vue/test-utils'
const state=vi.hoisted(()=>({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store,formatThaiDate:x=>x}))
import Activity from '../../src/components/modals/ActivityLogModal.vue'
it('groups and filters activity by Bangkok business date',async()=>{
 state.store=reactive({modals:{activityLog:{isOpen:true}}, materials:[],matMap:{}, activityLogs:[{id:'1',timestamp:'2026-10-08T18:00:00Z',title:'Test',module:'stock',action:'stock_in'}]})
 const wrapper=mount(Activity)
 expect(wrapper.vm.groupedLogs[0].dateKey).toBe('2026-10-09')
 wrapper.vm.filterStartDate='2026-10-09';wrapper.vm.filterEndDate='2026-10-09'
 await nextTick()
 expect(wrapper.vm.filteredLogs).toHaveLength(1)
 wrapper.unmount()
})
it('keeps missing activity timestamps unknown',()=>{
 state.store=reactive({modals:{activityLog:{isOpen:true}},materials:[],matMap:{},activityLogs:[{id:'2',title:'Undated',module:'stock',action:'stock_in'}]})
 const wrapper=mount(Activity)
 expect(wrapper.vm.groupedLogs[0].dateKey).toBe('unknown')
 wrapper.unmount()
})
it('exports Thai CSV with BOM and escaped quoted notes',async()=>{
 let blob
 vi.stubGlobal('URL',{createObjectURL:value=>{blob=value;return 'blob:test'},revokeObjectURL:()=>{}})
 const click=vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{})
 state.store=reactive({modals:{activityLog:{isOpen:true}},materials:[],matMap:{},showToast:()=>{},activityLogs:[{id:'3',timestamp:'2026-10-08T18:00:00Z',title:'รับเข้า',targetName:'นม',note:'note "broken",\nnext',module:'stock',action:'stock_in'}]})
 const wrapper=mount(Activity)
 wrapper.vm.exportCsv()
 const buffer=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsArrayBuffer(blob)})
 const bytes=new Uint8Array(buffer)
 expect([...bytes.slice(0,3)]).toEqual([239,187,191])
 const text=new TextDecoder().decode(bytes)
 expect(text).toContain('รับเข้า')
 expect(text).toContain('"note ""broken"",\nnext"')
 wrapper.unmount();click.mockRestore();vi.unstubAllGlobals()
})
