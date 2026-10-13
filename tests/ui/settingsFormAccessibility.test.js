import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Settings from '../../src/views/SettingsView.vue'
it('names the remaining settings destinations and omits category actions',async()=>{
 const store=createTestStore();const before=JSON.stringify(store.categories)
 const w=mount(Settings)
 expect(w.find('button[aria-controls="settings-categories"]').exists()).toBe(false)
 await w.get('button[aria-controls="settings-platforms"]').trigger('click')
 expect(w.get('[data-settings="platforms"]').isVisible()).toBe(true)
 expect(JSON.stringify(store.categories)).toBe(before);w.unmount()
})
it('does not report saving a URL as successful sync and makes retry explicit',async()=>{
 const store=createTestStore();const w=mount(Settings)
 w.vm.gasUrlInput='https://script.google.com/macros/s/test/exec';w.vm.saveGasUrl();await flushPromises()
 expect(w.get('[data-sync-status]').text()).toContain('ยังไม่ซิงค์')
 store.syncStatus='error';store.syncError='เชื่อมต่อไม่สำเร็จ';await flushPromises()
 expect(w.text()).toContain('ลองสำรองอีกครั้ง');w.unmount()
})
it('cancels JSON replacement through app confirmation and permits the same file again',async()=>{
 const store=createTestStore();store.resetDemoData();vi.spyOn(store,'confirmDialog').mockResolvedValue(false);const replace=vi.spyOn(store,'replaceDatabase')
 vi.stubGlobal('FileReader',class{readAsText(){this.onload({target:{result:JSON.stringify(store.exportDatabase())}})}})
 const w=mount(Settings),input={files:[{name:'backup.json'}],value:'backup.json'}
 try{w.vm.handleImportFile({target:input});await flushPromises();expect(replace).not.toHaveBeenCalled();expect(input.value).toBe('')}
 finally{w.unmount();vi.unstubAllGlobals()}
})
