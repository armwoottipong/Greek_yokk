import {it,expect,vi} from 'vitest'
import {nextTick} from 'vue'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import AddonView from '../../src/views/AddonView.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'
import Toast from '../../src/components/ui/ToastContainer.vue'
import App from '../../src/App.vue'
it('distinguishes intentionally unlinked addons from broken references without consumption text',async()=>{
 const store=createTestStore();store.resetDemoData();store.addons[0].recipe=[]
 const w=mount(AddonView,{attachTo:document.body})
 try{w.vm.detailAddonId=store.addons[0].id;await flushPromises();const text=document.getElementById('addon-details').textContent;expect(text).toContain('ไม่ตัดวัตถุดิบ');expect(text).not.toContain('ไม่พบวัตถุดิบ');expect(text).not.toContain('99')}finally{w.unmount()}
})
for(const [Component,modal,id] of [[MenuEdit,'menuEdit','menu-name'],[AddonEdit,'addonEdit','addon-name']])it(`focuses the missing required field in ${modal}`,async()=>{
 const store=createTestStore();const w=mount(Component,{attachTo:document.body})
 try{store.modals[modal]={isOpen:true};await flushPromises();await w.vm.submit();await flushPromises();expect(document.activeElement.id).toBe(id)}finally{w.unmount()}
})
it('keeps error toasts until explicit dismissal and provides an existing polite region',async()=>{
 vi.useFakeTimers();const store=createTestStore();const w=mount(Toast)
 try{expect(w.get('[data-toast-announcer]').text()).toBe('');store.showToast('ลองบันทึกอีกครั้ง','error');await flushPromises();vi.advanceTimersByTime(60000);await flushPromises();expect(store.toasts).toHaveLength(1);await w.get('button[aria-label="ปิดข้อความแจ้งเตือน"]').trigger('click');expect(store.toasts).toHaveLength(0)}finally{w.unmount();vi.useRealTimers()}
})
it('updates route context and gives keyboard users a skip path into main',async()=>{
 const store=createTestStore();const w=mount(App,{attachTo:document.body})
 try{await flushPromises();const skip=w.get('a[data-skip-content]');await skip.trigger('click');expect(document.activeElement.tagName).toBe('MAIN');store.switchTab('stock');await flushPromises();expect(document.title).toContain('คลังวัตถุดิบ');expect(document.activeElement.tagName).toBe('MAIN')}finally{w.unmount()}
})

it('pauses low-stakes toast expiry while keyboard focus is inside',async()=>{
 vi.useFakeTimers();const store=createTestStore();const w=mount(Toast)
 try{store.showToast('บันทึกแล้ว','success');await nextTick();vi.advanceTimersByTime(2000);await w.get('.ui-toasts [aria-atomic="true"]:not(.sr-only)').trigger('focusin');vi.advanceTimersByTime(10000);expect(store.toasts).toHaveLength(1);await w.get('.ui-toasts [aria-atomic="true"]:not(.sr-only)').trigger('focusout');vi.advanceTimersByTime(2999);expect(store.toasts).toHaveLength(1);vi.advanceTimersByTime(1);expect(store.toasts).toHaveLength(0)}finally{w.unmount();vi.useRealTimers()}
})

it.each([['mouseenter','focusin','mouseleave','focusout'],['focusin','mouseenter','focusout','mouseleave']])('waits for both hover and focus to end: %s,%s,%s,%s',async(first,second,leaveOne,leaveLast)=>{
 vi.useFakeTimers();const store=createTestStore();const w=mount(Toast)
 try{store.showToast('บันทึกแล้ว','success');await nextTick();const row=w.get('.ui-toasts [aria-atomic="true"]:not(.sr-only)');await row.trigger(first);await row.trigger(second);await row.trigger(leaveOne);vi.advanceTimersByTime(10000);expect(store.toasts).toHaveLength(1);await row.trigger(leaveLast);vi.advanceTimersByTime(4999);expect(store.toasts).toHaveLength(1);vi.advanceTimersByTime(1);expect(store.toasts).toHaveLength(0)}finally{w.unmount();vi.useRealTimers()}
})

it('announces only newly added polite messages and never republishes on dismissal',async()=>{
 const store=createTestStore();const w=mount(Toast)
 try{store.showToast('First','success');await flushPromises();expect(w.get('[data-toast-announcer]').text()).toBe('First');store.showToast('Second','success');await flushPromises();expect(w.get('[data-toast-announcer]').text()).toBe('Second');store.dismissToast(store.toasts[0].id);await flushPromises();expect(w.get('[data-toast-announcer]').text()).toBe('Second')}finally{w.unmount()}
})
it('focuses main after route navigation waits for a closing overlay to release inert',async()=>{
 const store=createTestStore();const w=mount(App,{attrs:{id:'app'},attachTo:document.body,global:{stubs:{transition:false}}})
 try{await flushPromises();const trigger=w.get('[data-header-more]');trigger.element.focus();await trigger.trigger('click');await flushPromises();expect(document.getElementById('app').hasAttribute('inert')).toBe(true);const action=[...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent==='เปิดหน้าตั้งค่าและสำรองไฟล์');expect(action).toBeDefined();action.click();await flushPromises();expect(store.currentTab).toBe('settings');await new Promise(resolve=>setTimeout(resolve,100));await flushPromises();expect(document.activeElement.id).toBe('main-content')}finally{w.unmount()}
})
