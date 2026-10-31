import {it,expect,vi} from 'vitest'
import {createTestStore,material} from '../helpers/createStore'
it('reports a local storage failure instead of closing a menu or material image form',()=>{
 const store=createTestStore();store.resetDemoData();store.materials=[material('M',0)]
 const failure={ok:false,message:'พื้นที่จัดเก็บเต็ม'}
 vi.spyOn(store,'persistLocal').mockReturnValue(failure)
 const toast=vi.spyOn(store,'showToast')
 expect(store.saveMenu({name:'test',prices:{},recipe:[]})).toMatchObject(failure)
 expect(store.saveMaterial({...store.materials[0],name:'test'})).toMatchObject(failure)
 expect(toast.mock.calls.some(([,tone])=>tone==='success')).toBe(false)
})
