import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {createTestStore} from '../helpers/createStore'
const motion=vi.hoisted(()=>vi.fn())
vi.mock('canvas-confetti',()=>({default:motion}))
import Receipt from '../../src/components/modals/ReceiptModal.vue'
import DialogFrame from '../../src/components/ui/DialogFrame.vue'
it('names the saved receipt dialog and retains its print action',async()=>{
 const store=createTestStore();store.resetDemoData()
 const print=vi.spyOn(window,'print').mockImplementation(()=>{})
 const w=mount(Receipt)
 try{
  store.modals.receipt={isOpen:true,order:store.orders[0]};await nextTick()
  expect(w.findComponent(DialogFrame).exists()).toBe(true)
  expect(w.getComponent(DialogFrame).props('title')).toBe('ใบเสร็จรับเงิน')
  w.vm.printReceipt();expect(print).toHaveBeenCalledTimes(1)
 }finally{w.unmount();print.mockRestore()}
})
for(const reduce of [true,false])it('does not launch canvas celebration when opening saved receipts, reduced='+reduce,async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:reduce}))
 const store=createTestStore();store.resetDemoData();motion.mockClear()
 const w=mount(Receipt)
 try{store.modals.receipt={isOpen:true,order:store.orders[0]};await nextTick();expect(motion).not.toHaveBeenCalled()}finally{w.unmount();vi.unstubAllGlobals()}
})
