import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
const rows=[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]
it('highlights line points and bars on hover without changing data geometry',async()=>{
 const w=mount(DashboardTrend,{props:{rows}})
 await w.get('[data-mark="0-totalSales"]').trigger('mouseenter')
 expect(w.findAll('.dashboard-point-halo')).toHaveLength(1)
 expect(document.querySelector('[role="tooltip"]')).toBeNull()
 await w.get('[data-chart-mode="bar"]').trigger('click')
 const before=w.findAll('.dashboard-chart-bar').map(b=>b.attributes('height'))
 await w.get('[data-mark="0-totalSales"]').trigger('mouseenter')
 expect(w.findAll('.dashboard-chart-bar.is-active')).toHaveLength(1)
 expect(w.findAll('.dashboard-chart-bar').map(b=>b.attributes('height'))).toEqual(before)
 await w.get('[data-mark="0-totalSales"]').trigger('mouseleave');expect(w.findAll('.is-active')).toHaveLength(0);w.unmount()
})
it('links donut hover and keyboard focus to the ranking and clears stale selections',async()=>{
 const w=mount(DashboardBreakdown,{props:{title:'ช่องทาง',allowDonut:true,rows:[{id:'A',label:'หน้าร้าน',value:100},{id:'B',label:'Delivery',value:50}]}})
 await w.findAll('.dashboard-segments button')[1].trigger('click')
 await w.get('[data-donut-id="B"]').trigger('mouseenter')
 expect(w.get('[data-ranking-id="B"]').classes()).toContain('is-active')
 expect(w.get('.dashboard-breakdown-detail').text()).toContain('Delivery')
 await w.get('[data-ranking-id="A"]').trigger('focus');expect(w.get('[data-donut-id="A"]').classes()).toContain('is-active')
 await w.setProps({rows:[{id:'C',label:'ใหม่',value:10}]});expect(w.findAll('.is-active')).toHaveLength(0);w.unmount()
})
it('pins the highlight to the open tooltip and clears it on outside dismissal',async()=>{
 const w=mount(DashboardTrend,{props:{rows}})
 try{
  await w.get('[data-chart-mode="bar"]').trigger('click')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('click')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('mouseleave')
  await w.get('[data-mark="0-totalSales"]').trigger('mouseenter')
  expect(w.get('[data-mark="0-totalFoodCost"] .dashboard-chart-bar').classes()).toContain('is-active')
  expect(w.get('[data-mark="0-totalSales"] .dashboard-chart-bar').classes()).not.toContain('is-active')
  expect(w.get('svg[role="group"]').classes()).toContain('has-single-selection')
  await w.get('[data-date-hover="0"]').trigger('click')
  await w.get('[data-date-hover="0"]').trigger('mouseleave')
  expect(w.findAll('.dashboard-chart-bar.is-active')).toHaveLength(3)
  expect(w.get('svg[role="group"]').classes()).not.toContain('has-single-selection')
  document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await w.vm.$nextTick()
  expect(w.findAll('.dashboard-chart-bar.is-active')).toHaveLength(0)
 }finally{w.unmount()}
})
it('pins one donut segment and dims the other segments until popup closes',async()=>{
 const w=mount(DashboardBreakdown,{props:{title:'ช่องทาง',allowDonut:true,rows:[{id:'A',label:'หน้าร้าน',value:100},{id:'B',label:'Delivery',value:50}]}})
 try{
  await w.findAll('.dashboard-segments button')[1].trigger('click');await w.get('[data-donut-id="B"]').trigger('click');await w.get('[data-donut-id="B"]').trigger('mouseleave');await w.get('[data-ranking-id="A"]').trigger('mouseenter')
  expect(w.get('[data-donut-id="B"]').classes()).toContain('is-active');expect(w.get('[data-donut-id="A"]').classes()).not.toContain('is-active')
  expect(w.classes()).toContain('has-single-selection')
  await w.get('[data-donut-id="B"]').trigger('click');expect(w.classes()).not.toContain('has-single-selection')
 }finally{w.unmount()}
})
