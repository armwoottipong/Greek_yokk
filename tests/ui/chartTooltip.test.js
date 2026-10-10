import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
import DashboardBreakdown from '../../src/components/dashboard/DashboardBreakdown.vue'
it('anchors donut tooltips at the middle of the selected arc',async()=>{
 const w=mount(DashboardBreakdown,{props:{title:'ช่องทาง',allowDonut:true,rows:[{id:'A',label:'A',value:50},{id:'B',label:'B',value:50}]}})
 try{
  await w.findAll('.dashboard-segments button')[1].trigger('click')
  w.get('svg').element.getBoundingClientRect=()=>({left:100,top:200,width:180,height:180})
  await w.get('[data-donut-id="A"]').trigger('click')
  expect(document.querySelector('[role="tooltip"]').style.left).toBe('145px')
  await w.get('[data-donut-id="B"]').trigger('keydown',{key:'Enter'})
  expect(document.querySelector('[role="tooltip"]').style.left).toBe('15px')
  await w.get('[data-donut-id="A"]').trigger('click',{clientX:236,clientY:244})
  const left=Number.parseFloat(document.querySelector('[role="tooltip"]').style.left)
  expect(left).toBeCloseTo(80+65/Math.sqrt(2),1)
 }finally{w.unmount()}
})
it('prevents scrolling while a tooltip is open and restores it after closing or unmount',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:70}]}})
 const previous=document.body.style.overflow
 try{
  await w.get('[data-mark="0-totalSales"]').trigger('click')
  expect(document.body.style.overflow).toBe('hidden')
  const wheel=new Event('wheel',{cancelable:true,bubbles:true});document.body.dispatchEvent(wheel);expect(wheel.defaultPrevented).toBe(true)
  await w.get('[data-mark="0-totalSales"]').trigger('click');expect(document.body.style.overflow).toBe(previous)
  await w.get('[data-mark="0-totalSales"]').trigger('click')
 }finally{w.unmount()}
 expect(document.body.style.overflow).toBe(previous)
})
it('shows only the hovered metric, supports focus/Escape and preserves loss values',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]}})
 try{
  await w.get('[data-chart-mode="bar"]').trigger('click')
  await w.get('[data-mark="0-totalFoodCost"]').trigger('mouseenter',{clientX:100,clientY:120})
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
  await w.get('[data-mark="0-totalFoodCost"]').trigger('click')
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('ต้นทุนขาย')
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('฿30')
  expect(document.querySelector('[role="tooltip"]').textContent).not.toContain('ยอดขาย')
  await w.get('[data-mark="0-grossProfit"]').trigger('keydown',{key:'Enter'})
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('฿-10')
  await w.get('[data-mark="0-grossProfit"]').trigger('keydown',{key:'Escape'})
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
it('shows the value and percentage for the exact donut segment and clears it when data changes',async()=>{
 const w=mount(DashboardBreakdown,{props:{title:'ช่องทาง',allowDonut:true,rows:[{id:'A',label:'หน้าร้าน',value:100},{id:'B',label:'Delivery',value:50}]}})
 try{
  await w.findAll('.dashboard-segments button')[1].trigger('click');await w.get('[data-donut-id="B"]').trigger('click')
  const tip=document.querySelector('[role="tooltip"]');expect(tip.textContent).toContain('Delivery');expect(tip.textContent).toContain('฿50');expect(tip.textContent).toContain('33.3%')
  await w.setProps({rows:[]});expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
it('opens three values only on cluster click, and blank plot clicks cannot open it',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}]}})
 try{
  await w.get('[data-date-hover="0"]').trigger('mouseenter',{clientX:100,clientY:200})
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
  await w.get('[data-date-hover="0"]').trigger('click')
  const tip=document.querySelector('[role="tooltip"]');expect(tip.textContent).toContain('ยอดขาย');expect(tip.textContent).toContain('ต้นทุนขาย');expect(tip.textContent).toContain('กำไรขั้นต้น')
  expect(tip.querySelector('.chart-tooltip-arrow')).not.toBeNull()
  await w.get('[data-mark="0-totalFoodCost"]').trigger('click')
  expect(document.querySelector('[role="tooltip"]').textContent).not.toContain('ยอดขาย')
  await w.get('svg[role="group"]').trigger('click')
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
  expect(w.get('[data-mark="0-totalFoodCost"]').attributes('role')).toBe('button')
 }finally{w.unmount()}
})
it('keeps sparse date hover areas inside the plot',()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-09',totalSales:100,totalFoodCost:30,grossProfit:70},{date:'2026-10-10',totalSales:200,totalFoodCost:60,grossProfit:140}]}})
 try{for(const rect of w.findAll('[data-date-hover] rect')){expect(Number(rect.attributes('x'))).toBeGreaterThanOrEqual(62);expect(Number(rect.attributes('x'))+Number(rect.attributes('width'))).toBeLessThanOrEqual(738);expect(Number(rect.attributes('width'))).toBeLessThanOrEqual(66)}}finally{w.unmount()}
})
it('contains every endpoint bar inside its click frame',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-09',totalSales:100,totalFoodCost:30,grossProfit:70},{date:'2026-10-10',totalSales:200,totalFoodCost:60,grossProfit:140}]}})
 try{await w.get('[data-chart-mode="bar"]').trigger('click');for(let i=0;i<2;i++){const frame=w.get(`[data-date-hover="${i}"] rect`),left=Number(frame.attributes('x')),right=left+Number(frame.attributes('width'));for(const key of ['totalSales','totalFoodCost','grossProfit']){const bar=w.get(`[data-mark="${i}-${key}"] rect`);expect(Number(bar.attributes('x'))).toBeGreaterThanOrEqual(left);expect(Number(bar.attributes('x'))+Number(bar.attributes('width'))).toBeLessThanOrEqual(right)}}}finally{w.unmount()}
})
it('toggles the same mark and dismisses on outside pointerdown without opening from outside',async()=>{
 const w=mount(DashboardTrend,{props:{rows:[{date:'2026-10-10',totalSales:100,totalFoodCost:30,grossProfit:70}]}})
 try{
  const mark=w.get('[data-mark="0-totalSales"]')
  await mark.trigger('click');expect(document.querySelector('[role="tooltip"]')).not.toBeNull()
  await mark.trigger('click');expect(document.querySelector('[role="tooltip"]')).toBeNull()
  await mark.trigger('click');document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await w.vm.$nextTick();expect(document.querySelector('[role="tooltip"]')).toBeNull()
  document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await w.vm.$nextTick();expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
