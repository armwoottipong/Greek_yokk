import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
const rows=[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]
it('highlights line points and bars on hover without changing data geometry',async()=>{
 const w=mount(DashboardTrend,{props:{rows}})
 await w.get('g[role="button"]').trigger('mouseenter')
 expect(w.findAll('.dashboard-point-halo')).toHaveLength(3)
 expect(w.get('.dashboard-chart-detail').text()).toContain('100')
 await w.get('[data-chart-mode="bar"]').trigger('click')
 const before=w.findAll('.dashboard-chart-bar').map(b=>b.attributes('height'))
 await w.get('g[role="button"]').trigger('mouseenter')
 expect(w.findAll('.dashboard-chart-bar.is-active')).toHaveLength(3)
 expect(w.findAll('.dashboard-chart-bar').map(b=>b.attributes('height'))).toEqual(before)
 await w.get('g[role="button"]').trigger('mouseleave');expect(w.findAll('.is-active')).toHaveLength(0);w.unmount()
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
