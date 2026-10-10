import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardView from '../../src/views/DashboardView.vue'
import FilterDropdown from '../../src/components/ui/FilterDropdown.vue'
import {createTestStore} from '../helpers/createStore'
vi.mock('canvas-confetti',()=>({default:()=>{}}))
const sale=(id,date)=>({orderId:id,createdAt:date,platformId:'P',platformName:'หน้าร้าน',subtotal:100,gpAmount:0,netRevenue:100,foodCost:30,grossProfit:70,items:[{menuId:'M',menuName:'โยเกิร์ต',qty:1}]})
it('applies date picker ranges to metrics, charts and receipts while preserving all reporting views',async()=>{
 const s=createTestStore();s.orders=[sale('OLD','2026-10-01T10:00:00Z'),sale('NEW','2026-10-10T10:00:00Z')]
 const w=mount(DashboardView)
 await w.get('[data-dashboard-dates]').trigger('click')
 w.findComponent(FilterDropdown).vm.$emit('apply',{start:'2026-10-10',end:'2026-10-10'})
 await w.vm.$nextTick()
 expect(w.get('[data-sales-total]').text()).toContain('100')
 expect(w.text()).not.toContain('OLD')
 expect(w.text()).toContain('NEW')
 await w.get('[data-chart-mode="table"]').trigger('click')
 expect(w.text()).toContain('ยอดขายรายช่วง')
 await w.get('[data-view="channels"]').trigger('click');expect(w.text()).toContain('หน้าร้าน')
 await w.get('[data-view="menus"]').trigger('click');expect(w.text()).toContain('โยเกิร์ต')
 await w.get('[data-view="inventory"]').trigger('click');expect(w.text()).toContain('ยอดปัจจุบัน')
 await w.get('[data-view="overview"]').trigger('click')
 await w.get('[data-receipt="NEW"]').trigger('click');expect(s.modals.receipt.order.orderId).toBe('NEW')
 w.unmount()
})
it('shows a useful empty state and allows returning to all dates',async()=>{
 const s=createTestStore();s.orders=[];const w=mount(DashboardView)
 expect(w.text()).toContain('ยังไม่มีคำสั่งซื้อในช่วงนี้')
 await w.get('[data-period="all"]').trigger('click')
 expect(w.get('[data-period="all"]').attributes('aria-pressed')).toBe('true')
 expect(w.text()).not.toContain('NaN');w.unmount()
})
it('keeps the date dialog outside the inert application shell',async()=>{
 createTestStore();const app=document.createElement('div');app.id='app';document.body.append(app)
 const w=mount(DashboardView,{attachTo:app})
 try{await w.get('[data-dashboard-dates]').trigger('click');await w.vm.$nextTick();expect(document.querySelector('[data-filter-dropdown]').closest('[inert]')).toBeNull()}
 finally{w.unmount();app.remove()}
})
it('refreshes relative presets after Bangkok midnight while keeping custom dates',async()=>{
 vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-10T16:59:50Z'))
 const s=createTestStore();s.orders=[sale('YESTERDAY','2026-10-10T10:00:00Z'),sale('TODAY','2026-10-10T17:00:01Z')]
 const w=mount(DashboardView)
 try{
  expect(w.text()).toContain('YESTERDAY');expect(w.text()).not.toContain('TODAY')
  await vi.advanceTimersByTimeAsync(30000)
  expect(w.text()).toContain('TODAY');expect(w.text()).not.toContain('YESTERDAY')
  w.findComponent(FilterDropdown).vm.$emit('apply',{start:'2026-10-10',end:'2026-10-10'});await w.vm.$nextTick()
  await vi.advanceTimersByTimeAsync(86400000)
  expect(w.text()).toContain('YESTERDAY');expect(w.text()).not.toContain('TODAY')
 }finally{w.unmount();vi.useRealTimers()}
})
