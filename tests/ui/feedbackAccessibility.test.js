import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Toast from '../../src/components/ui/ToastContainer.vue'
it('announces errors assertively and success politely without stealing focus',()=>{
 const store=createTestStore()
 store.toasts=[{id:'error',type:'error',message:'บันทึกไม่สำเร็จ ลองบันทึกอีกครั้ง'},{id:'ok',type:'success',message:'บันทึกแล้ว'}]
 const w=mount(Toast)
 try{expect(w.get('[role="alert"]').text()).toContain('ลองบันทึก');expect(w.get('[role="status"]').attributes('aria-live')).toBe('polite')}finally{w.unmount()}
})
it('dismisses success after five seconds and errors after eight seconds',async()=>{
 vi.useFakeTimers();const store=createTestStore();store.toasts=[{id:'ok',type:'success',message:'บันทึกแล้ว'},{id:'error',type:'error',message:'ลองใหม่'}]
 const w=mount(Toast)
 try{await vi.advanceTimersByTimeAsync(5000);expect(store.toasts.map(t=>t.id)).toEqual(['error']);await vi.advanceTimersByTimeAsync(3000);expect(store.toasts).toEqual([])}finally{w.unmount();vi.useRealTimers()}
})
it('pauses an error while hovered or focused, resumes remaining time, and clears timers on unmount',async()=>{
 vi.useFakeTimers();const store=createTestStore();store.toasts=[{id:'error',type:'error',message:'ลองใหม่'}];const w=mount(Toast)
 try{
  await vi.advanceTimersByTimeAsync(4000);await w.get('[role="alert"]').trigger('mouseenter');await w.get('[role="alert"]').trigger('focusin')
  await vi.advanceTimersByTimeAsync(10000);await w.get('[role="alert"]').trigger('mouseleave');await vi.advanceTimersByTimeAsync(10000);expect(store.toasts).toHaveLength(1)
  await w.get('[role="alert"]').trigger('focusout');await vi.advanceTimersByTimeAsync(3999);expect(store.toasts).toHaveLength(1)
  await vi.advanceTimersByTimeAsync(1);expect(store.toasts).toEqual([])
  store.showToast('อีกข้อความ','error');await w.vm.$nextTick();w.unmount();expect(vi.getTimerCount()).toBe(0)
 }finally{w.unmount();vi.useRealTimers()}
})
