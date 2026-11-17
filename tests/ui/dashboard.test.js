import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardView from '../../src/views/DashboardView.vue'
import FilterDropdown from '../../src/components/ui/FilterDropdown.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
import {createTestStore,material} from '../helpers/createStore'
vi.mock('canvas-confetti',()=>({default:()=>{}}))
const sale=(id,date)=>({orderId:id,createdAt:date,platformId:'P',platformName:'หน้าร้าน',subtotal:100,gpAmount:0,netRevenue:100,foodCost:30,grossProfit:70,items:[{menuId:'M',menuName:'โยเกิร์ต',qty:1}]})
it('starts with every platform checked and filters the whole sales report',async()=>{
 const s=createTestStore(),day='2026-10-10T10:00:00Z'
 s.platforms=[{id:'P',name:'หน้าร้าน'},{id:'D',name:'Delivery'}]
 s.orders=[sale('SHOP',day),{...sale('DELIVERY',day),platformId:'D',platformName:'Delivery',gpAmount:75,netRevenue:25,grossProfit:-5,items:[{menuId:'D-MENU',menuName:'เมนูเดลิเวอรี',qty:1}]},
  {...sale('REFUND',day),platformId:'D',platformName:'Delivery',status:'cancelled'}]
 const w=mount(DashboardView)
 try{
  await w.get('[data-period="all"]').trigger('click')
  expect(w.get('[data-platform-profit="P"]').text()).toMatch(/หน้าร้าน\s*฿70/)
  expect(w.get('[data-platform-profit="D"]').text()).toMatch(/Delivery\s*−฿5/)
  const trend=w.getComponent(DashboardTrend)
  expect(trend.get('[data-mark="0-netRevenue"]').attributes('aria-label')).toContain('รายรับหลังหัก GP ฿125')
  await w.get('[data-dashboard-dates]').trigger('click')
  const dialog=document.querySelector('#dashboard-date-filter')
  const platforms=dialog.querySelector('.filter-presets + fieldset')
  expect(platforms.querySelector('legend').textContent).toBe('แพลตฟอร์ม')
  expect(platforms.querySelectorAll('input:checked')).toHaveLength(2)
  platforms.querySelector('input[value="P"]').click()
  await w.vm.$nextTick()
  dialog.querySelector('[data-apply-filters]').click();await w.vm.$nextTick()
  expect(trend.props('rows')[0]).toMatchObject({netRevenue:25,totalFoodCost:30,grossProfit:-5})
  expect(trend.get('[data-mark="0-netRevenue"]').attributes('aria-label')).toContain('รายรับหลังหัก GP ฿25')
  expect(w.get('[data-sales-total]').text()).toBe('฿100')
  expect(w.find('[data-platform-profit="P"]').exists()).toBe(false)
  expect(w.find('[data-receipt="SHOP"]').exists()).toBe(false)
  expect(w.find('[data-receipt="DELIVERY"]').exists()).toBe(true)
  await w.get('[data-view="menus"]').trigger('click')
  expect(w.text()).toContain('เมนูเดลิเวอรี')
  expect(w.text()).not.toContain('โยเกิร์ต')
  await w.get('[data-view="overview"]').trigger('click')
  expect(w.find('[data-trend-platforms]').exists()).toBe(false)
  await w.get('[data-dashboard-dates]').trigger('click')
  document.querySelector('#dashboard-date-filter .filter-reset').click()
  await w.vm.$nextTick()
  document.querySelector('#dashboard-date-filter [data-apply-filters]').click();await w.vm.$nextTick()
  expect(w.getComponent(DashboardTrend).props('rows')[0].grossProfit).toBe(65)
  await w.get('[data-dashboard-dates]').trigger('click')
  expect(document.querySelectorAll('#dashboard-date-filter .filter-checkbox-group input:checked')).toHaveLength(2)
 }finally{w.unmount()}
})
async function selectInventoryGrouping(wrapper,value){
 const group=wrapper.get('[role="radiogroup"][aria-label="แสดงมูลค่าคลังตาม"]')
 await group.get(`input[value="${value}"]`).setValue(true)
 expect(group.findAll('input').filter(input=>input.element.checked)).toHaveLength(1)
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
 expect(w.text()).toContain('รายรับและต้นทุนรายช่วง')
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
