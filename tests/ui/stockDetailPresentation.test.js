import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Stock from '../../src/views/StockView.vue'
import LotList from '../../src/components/inventory/StockLotList.vue'
it('distinguishes expiry, receive-only and untracked lots without hiding zero quantity',()=>{
 const lot={id:'LOT-X',qty:0,isInUse:true,receiveDate:'2026-10-01',expiryDate:'2000-01-01'}
 const w=mount(LotList,{props:{lots:[lot],unit:'ml',trackingMode:'expiry_and_receive'}})
 expect(w.text()).toContain('0 ml');expect(w.text()).toContain('หมดอายุแล้ว');w.unmount()
 const receive=mount(LotList,{props:{lots:[{...lot,expiryDate:null}],unit:'ml',trackingMode:'receive_only'}})
 expect(receive.text()).toContain('รับเข้า');expect(receive.text()).not.toContain('หมดอายุ');receive.unmount()
 const none=mount(LotList,{props:{lots:[lot],unit:'pcs',trackingMode:'none',archived:true}})
 expect(none.text()).toContain('ไม่ติดตามวันที่');expect(none.find('button').exists()).toBe(false);none.unmount()
})
it('opens contextual detail without changing lots and routes lot actions by ID',async()=>{
 const store=createTestStore();store.materials=[material('DECIMAL',12.5)]
 const switchLot=vi.spyOn(store,'switchActiveLot')
 const w=mount(Stock,{attachTo:document.body})
 try{
  await w.get('[data-material-details="DECIMAL"]').trigger('click');await flushPromises()
  expect(document.getElementById('material-details').textContent).toContain('12.5')
  expect(document.getElementById('material-details').textContent).toContain('ถุง')
  expect(switchLot).not.toHaveBeenCalled()
  document.querySelector('[data-lot-adjust="LOT-DECIMAL"]').click();await flushPromises()
  expect(store.modals.stockAdjust.materialId).toBe('DECIMAL');expect(store.modals.stockAdjust.lotId).toBe('LOT-DECIMAL')
 }finally{w.unmount()}
})
it('shows zero and archived recovery, and handles removed material while detail is open',async()=>{
 const store=createTestStore();store.materials=[material('ZERO',0,{isDeleted:true})]
 const w=mount(Stock,{attachTo:document.body})
 try{
  w.vm.showDeleted=true;await flushPromises()
  await w.get('[data-material-details="ZERO"]').trigger('click');await flushPromises()
  expect(document.getElementById('material-details').textContent).toContain('จัดเก็บแล้ว')
  expect(document.querySelector('[data-detail-receive]')).toBeNull()
  expect(document.querySelector('[data-detail-restore]')).not.toBeNull()
  store.materials=[];await flushPromises()
  expect(document.getElementById('material-details').textContent).toContain('ไม่พบวัตถุดิบ')
 }finally{w.unmount()}
})
