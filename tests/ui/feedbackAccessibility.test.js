import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Toast from '../../src/components/ui/ToastContainer.vue'
it('announces errors assertively and success politely without stealing focus',()=>{
 const store=createTestStore()
 store.toasts=[{id:'error',type:'error',message:'บันทึกไม่สำเร็จ ลองบันทึกอีกครั้ง'},{id:'ok',type:'success',message:'บันทึกแล้ว'}]
 const w=mount(Toast)
 try{expect(w.get('[role="alert"]').text()).toContain('ลองบันทึก');expect(w.get('[role="status"]').attributes('aria-live')).toBe('polite')}finally{w.unmount()}
})
