import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
it('shows only the hovered metric, supports focus/Escape and preserves loss values',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]}})
 try{
  await w.get('[data-chart-mode="bar"]').trigger('click')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('mouseenter',{clientX:100,clientY:120})
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('ต้นทุนขาย')
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('฿30')
  expect(document.querySelector('[role="tooltip"]').textContent).not.toContain('ยอดขาย')
  await w.get('[data-mark="0-grossProfit"]').trigger('focus')
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('฿-10')
  await w.get('[data-mark="0-grossProfit"]').trigger('keydown',{key:'Escape'})
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
it('shows the value and percentage for the exact donut segment and clears it when data changes',async()=>{
 const w=mount(DashboardBreakdown,{props:{title:'ช่องทาง',allowDonut:true,rows:[{id:'A',label:'หน้าร้าน',value:100},{id:'B',label:'Delivery',value:50}]}})
 try{
  await w.findAll('.dashboard-segments button')[1].trigger('click');await w.get('[data-donut-id="B"]').trigger('mouseenter',{clientX:30,clientY:30})
  const tip=document.querySelector('[role="tooltip"]');expect(tip.textContent).toContain('Delivery');expect(tip.textContent).toContain('฿50');expect(tip.textContent).toContain('33.3%')
  await w.setProps({rows:[]});expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
it('shows all three values over a date band and switches to a single mark without click activation',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]}})
 try{
  await w.get('[data-date-hover="0"]').trigger('mouseenter',{clientX:100,clientY:200})
  const tip=document.querySelector('[role="tooltip"]');expect(tip.textContent).toContain('ยอดขาย');expect(tip.textContent).toContain('ต้นทุนขาย');expect(tip.textContent).toContain('กำไรขั้นต้น')
  expect(tip.querySelector('.chart-tooltip-arrow')).not.toBeNull()
  await w.get('[data-mark="0-totalFoodCost"]').trigger('mouseenter',{clientX:100,clientY:120})
  expect(document.querySelector('[role="tooltip"]').textContent).not.toContain('ยอดขาย')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('mouseleave')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('click')
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
  expect(w.get('[data-mark="0-totalFoodCost"]').attributes('role')).not.toBe('button')
 }finally{w.unmount()}
})
it('keeps sparse date hover areas inside the plot',()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-09',totalSales:100,totalFoodCost:30,grossProfit:70},{date:'2026-10-10',totalSales:200,totalFoodCost:60,grossProfit:140}]}})
 try{for(const rect of w.findAll('[data-date-hover] rect')){expect(Number(rect.attributes('x'))).toBeGreaterThanOrEqual(62);expect(Number(rect.attributes('x'))+Number(rect.attributes('width'))).toBeLessThanOrEqual(738)}}finally{w.unmount()}
})
