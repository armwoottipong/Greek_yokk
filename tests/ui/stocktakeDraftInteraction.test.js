import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Stock from '../../src/views/StockView.vue'
it('reviews before and after quantities without committing or discarding on close',async()=>{
 const store=createTestStore();store.materials=[material('M',100)];store.initStockDraftSnapshot();store.stockAdjust('M',75,'test','',true)
 const commit=vi.spyOn(store,'commitStockDrafts'),discard=vi.spyOn(store,'discardStockDrafts')
 const w=mount(Stock,{attachTo:document.body})
 try{
  expect(w.get('.draft-bar').text()).toContain('1 รายการรอบันทึก')
  expect(w.get('.draft-bar').text()).not.toContain('100 → 75 g')
  expect(w.get('[data-review-stock-drafts]').attributes('aria-haspopup')).toBe('dialog')
  await w.get('[data-review-stock-drafts]').trigger('click');await flushPromises()
  expect(w.get('[data-review-stock-drafts]').attributes('aria-expanded')).toBe('true')
  expect(document.getElementById('stock-draft-review').textContent).toContain('100 → 75 g')
  expect(document.getElementById('stock-draft-review').textContent).toContain('กดบันทึกทั้งหมดที่แถบ')
  w.vm.showDraftDetails=false;await flushPromises()
  expect(commit).not.toHaveBeenCalled();expect(discard).not.toHaveBeenCalled();expect(store.hasStockDrafts).toBe(true)
 }finally{w.unmount()}
})
it('keeps review open when commit fails and requires confirmation before discarding',async()=>{
 const store=createTestStore();store.materials=[material('M',100)];store.initStockDraftSnapshot();store.stockAdjust('M',75,'test','',true)
 vi.spyOn(store,'commitStockDrafts').mockReturnValue({ok:false,message:'พื้นที่จัดเก็บเต็ม'})
 vi.spyOn(store,'confirmDialog').mockResolvedValue(false)
 const w=mount(Stock)
 w.vm.showDraftDetails=true;await w.vm.savePendingChanges();expect(w.vm.showDraftDetails).toBe(true)
 await w.vm.revertPendingChanges();expect(store.hasStockDrafts).toBe(true);w.unmount()
})
it('closes the review and restores the snapshot only after confirming discard',async()=>{
 const store=createTestStore();store.materials=[material('M',100)];store.initStockDraftSnapshot();store.stockAdjust('M',75,'test','',true)
 vi.spyOn(store,'confirmDialog').mockResolvedValue(true)
 const w=mount(Stock)
 try{
  w.vm.showDraftDetails=true
  await w.vm.revertPendingChanges();await flushPromises()
  expect(store.materials[0].stock).toBe(100)
  expect(store.hasStockDrafts).toBe(false)
  expect(w.vm.showDraftDetails).toBe(false)
 }finally{w.unmount()}
})
