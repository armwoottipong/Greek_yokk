import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import AddonView from '../../src/views/AddonView.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'
import {createTestStore} from '../helpers/createStore'
it.each([{component:MenuEdit,modal:'menuEdit',rows:'menus',key:'menuId',save:'saveMenu'},{component:AddonEdit,modal:'addonEdit',rows:'addons',key:'addonId',save:'saveAddon'}])('waits for $save Firebase result with a spinner and no duplicate submissions',async({component,modal,rows,key,save})=>{
 const s=createTestStore();s.resetDemoData();s.cloud=true
 vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 let resolve;const send=vi.spyOn(s,save).mockImplementation(()=>new Promise(r=>{resolve=r}))
 const w=mount(component,{global:{stubs:{teleport:true}}});s.modals[modal]={isOpen:true,[key]:s[rows][0].id};await flushPromises()
 const button=()=>w.get('.menu-editor-footer .ui-button--primary')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');expect(s.modals[modal].isOpen).toBe(true)
 await button().trigger('click');expect(send).toHaveBeenCalledTimes(1)
 resolve({ok:false,message:'server rejected'});await flushPromises()
 expect(s.modals[modal].isOpen).toBe(true);expect(button().attributes('aria-busy')).toBeUndefined();w.unmount()
})


it('spins on the original Add-on delete control until the confirmed operation finishes',async()=>{
 const s=createTestStore();s.resetDemoData();s.cloud=true;vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 let resolve;const send=vi.spyOn(s,'deleteAddon').mockImplementation(()=>new Promise(r=>{resolve=r}))
 const w=mount(AddonView,{global:{stubs:{teleport:true}}});await flushPromises()
 const button=()=>w.get('[data-addon-delete]')
 await button().trigger('click');await flushPromises();expect(button().attributes('aria-busy')).toBe('true')
 await button().trigger('click');expect(send).toHaveBeenCalledTimes(1)
 resolve({ok:false});await flushPromises();expect(button().attributes('aria-busy')).toBeUndefined();w.unmount()
})
