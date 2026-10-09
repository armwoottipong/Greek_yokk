import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import ReceiptModal from '../../src/components/modals/ReceiptModal.vue'
import DashboardView from '../../src/views/DashboardView.vue'
import {createTestStore,material} from '../helpers/createStore'
vi.mock('canvas-confetti',()=>({default:()=>{}}))
it('receipt shows recorded outstanding material quantity',()=> {
 const s=createTestStore({storage:{GY_MATERIALS:[material()]}})
 s.modals.receipt={isOpen:true,order:{orderId:'O',createdAt:'2026-10-09T17:20:00Z',subtotal:10,items:[],stockShortages:[{materialId:'X',materialName:'โยเกิร์ต',unit:'g',qty:40}]}}
 const w=mount(ReceiptModal)
 expect(w.text()).toContain('วัตถุดิบขาดค้าง');expect(w.text()).toContain('โยเกิร์ต');expect(w.text()).toContain('40 g');w.unmount()
})
it('sales history flags orders with recorded shortages',()=> {
 const s=createTestStore();s.orders=[{orderId:'O',createdAt:new Date().toISOString(),subtotal:10,items:[],stockShortages:[{materialId:'X',qty:40}]}]
 const w=mount(DashboardView);expect(w.text()).toContain('วัตถุดิบขาดค้าง');w.unmount()
})
it('receipt retains original commission after platform rate changes',()=> {
 const s=createTestStore();s.platforms[0].gpPercent=50
 s.modals.receipt={isOpen:true,order:{orderId:'O',platformId:s.platforms[0].id,createdAt:new Date().toISOString(),subtotal:100,gpAmount:30,netRevenue:70,items:[]}}
 const w=mount(ReceiptModal);expect(w.text()).toContain('(30%)');w.unmount()
})
