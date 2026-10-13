import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardView from '../../src/views/DashboardView.vue'
import FilterDropdown from '../../src/components/ui/FilterDropdown.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
import {createTestStore,material} from '../helpers/createStore'
vi.mock('canvas-confetti',()=>({default:()=>{}}))
const sale=(id,date)=>({orderId:id,createdAt:date,platformId:'P',platformName:'หน้าร้าน',subtotal:100,gpAmount:0,netRevenue:100,foodCost:30,grossProfit:70,items:[{menuId:'M',menuName:'โยเกิร์ต',qty:1}]})
async function selectInventoryGrouping(wrapper,value){
 const control=wrapper.get('[role="combobox"][aria-label="แสดงมูลค่าคลังตาม"]')
 await control.trigger('keydown',{key:'ArrowDown'})
 await control.trigger('keydown',{key:value==='material'?'End':'Home'})
 await control.trigger('keydown',{key:'Enter'})
 expect(control.attributes('aria-expanded')).toBe('false')
}
it('switches inventory valuation between categories and individual materials without changing the total or chart mode',async()=>{
 const s=createTestStore();s.materials=[material('A',10,{name:'นม',unitCost:2}),material('B',30,{name:'นม',unitCost:3}),material('C',5,{name:'ถ้วย',inventoryType:'packaging',unitCost:1}),material('D',0,{name:'น้ำผึ้ง'}),material('OLD',500,{isDeleted:true})]
 const w=mount(DashboardView)
 try{
  await w.get('[data-view="inventory"]').trigger('click')
  const chart=w.findComponent(DashboardBreakdown)
  const sum=()=>chart.props('rows').reduce((total,row)=>total+row.value,0)
  expect(chart.props('title')).toBe('มูลค่าคลังตามหมวดหมู่')
  expect(sum()).toBe(115)
  await chart.findAll('button').find(button=>button.text()==='วงแหวน').trigger('click')
  await selectInventoryGrouping(w,'material')
  expect(chart.props('title')).toBe('มูลค่าคลังตามรายชื่อวัตถุดิบ')
  expect(chart.props('rows').map(row=>row.id)).toEqual(['B','A','C','D'])
  expect(chart.props('rows').map(row=>row.label)).toEqual(['นม','นม','ถ้วย','น้ำผึ้ง'])
  expect(sum()).toBe(115)
  expect(chart.findAll('[data-donut-id]')).toHaveLength(4)
  await w.get('[data-period="week"]').trigger('click')
  expect(sum()).toBe(115)
  await selectInventoryGrouping(w,'category')
  expect(chart.props('rows')).toHaveLength(2)
  expect(chart.findAll('[data-donut-id]')).toHaveLength(2)
 }finally{w.unmount()}
})
it('uses the same pending draft valuation in both inventory views and updates when stock changes',async()=>{
 const s=createTestStore();s.stockDraftSnapshot=[material('A',10)];s.materials=[material('A',25,{name:'โยเกิร์ต',hasSubRecipe:true})]
 const w=mount(DashboardView)
 try{
  await w.get('[data-view="inventory"]').trigger('click')
  const chart=w.findComponent(DashboardBreakdown)
  expect(chart.props('rows')[0].value).toBe(25)
  await selectInventoryGrouping(w,'material')
  expect(chart.props('subtitle')).toContain('แบบร่าง')
  expect(chart.props('rows')[0].value).toBe(25)
  s.materials[0].stock=40;await w.vm.$nextTick()
  expect(chart.props('rows')[0].value).toBe(40)
  s.materials=[];await w.vm.$nextTick()
  expect(chart.props('rows')).toEqual([])
  expect(w.text()).not.toContain('NaN')
 }finally{w.unmount()}
})
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
it('shows package cost adjustment and shortage reporting in the selected period',()=>{
 const s=createTestStore();s.orders=[{...sale('PKG',new Date().toISOString()),ingredientCost:20,packagingCost:3,expectedPackagingShortageCost:2,foodCost:23,packagePlan:[{materialId:'CUP',materialName:'ถ้วย',adjustmentQty:1,reason:'separate_bag'}],stockShortages:[{materialId:'CUP',materialName:'ถ้วย',inventoryType:'packaging',qty:1}]}]
 const w=mount(DashboardView);expect(w.text()).toContain('ต้นทุนวัตถุดิบ');expect(w.text()).toContain('ต้นทุนบรรจุภัณฑ์ที่ใช้จริง');expect(w.text()).toContain('ต้นทุน Package ที่ขาด');expect(w.text()).toContain('ถ้วย');expect(w.text()).toContain('แยกถุง');w.unmount()
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
