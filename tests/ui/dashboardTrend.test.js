import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import DashboardTrend from '../../src/components/dashboard/DashboardTrend.vue'
it('keeps dense bar charts renderable at mobile widths, including losses',async()=>{
 vi.stubGlobal('ResizeObserver',class{constructor(callback){this.callback=callback}observe(){this.callback([{contentRect:{width:280}}])}disconnect(){}})
 const rows=Array.from({length:60},(_,i)=>({date:new Date(Date.UTC(2026,0,i+1)).toISOString().slice(0,10),totalSales:100,totalFoodCost:30,grossProfit:-10,orderCount:1}))
 const w=mount(DashboardTrend,{props:{rows}})
 try{await w.get('[data-chart-mode="bar"]').trigger('click');const bars=w.findAll('rect').filter(r=>r.attributes('fill')!=='transparent');expect(bars).toHaveLength(180);expect(bars.every(r=>Number(r.attributes('width'))>0)).toBe(true);expect(bars.every(r=>Number.isFinite(Number(r.attributes('y'))))).toBe(true)}
 finally{w.unmount();vi.unstubAllGlobals()}
})
