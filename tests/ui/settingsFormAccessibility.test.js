import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Settings from '../../src/views/SettingsView.vue'
it('names category actions with context and confirms deletion in the app',async()=>{
 const store=createTestStore();store.resetDemoData();store.categories.menu.push({id:'UNUSED',name:'Unused'})
 const confirm=vi.spyOn(store,'confirmDialog').mockResolvedValue(false),remove=vi.spyOn(store,'deleteCategory')
 const w=mount(Settings);await w.get('button[aria-controls="settings-categories"]').trigger('click')
 expect(w.find('button[aria-label="แก้ไขหมวดหมู่ Unused"]').exists()).toBe(true)
 await w.vm.handleDeleteCategory('menu',{id:'UNUSED',name:'Unused'});expect(confirm).toHaveBeenCalledOnce();expect(remove).not.toHaveBeenCalled();w.unmount()
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
