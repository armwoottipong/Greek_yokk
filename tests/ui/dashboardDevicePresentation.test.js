import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Dashboard from '../../src/views/DashboardView.vue'
it('keeps mobile receipt summaries on the same financial snapshot as the full report',async()=>{
 const store=createTestStore();store.orders=[{orderId:'LOSS',createdAt:'2026-10-10T10:00:00Z',platformId:'P',platformName:'ร้าน',subtotal:100,gpAmount:0,netRevenue:100,foodCost:120,grossProfit:-20,items:[{menuId:'M',menuName:'เมนู',qty:1}]}]
 const w=mount(Dashboard);await w.get('[data-period="all"]').trigger('click')
 expect(w.get('[data-mobile-order="LOSS"]').text()).toContain('100')
 expect(w.get('[data-mobile-order="LOSS"]').text()).toContain('-20')
 await w.get('[data-receipt-mobile="LOSS"]').trigger('click');expect(store.modals.receipt.order.grossProfit).toBe(-20)
 await w.get('[data-view="channels"]').trigger('click');expect(w.find('[data-channel-details]').exists()).toBe(true);w.unmount()
})
