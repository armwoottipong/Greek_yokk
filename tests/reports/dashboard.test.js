import {describe,it,expect} from 'vitest'
import {dashboardRange,buildDashboard} from '../../src/domain/dashboard'

const order=(createdAt,extra={})=>({orderId:createdAt,createdAt,platformId:'A',platformName:'หน้าร้าน',subtotal:100,gpAmount:10,netRevenue:90,foodCost:30,grossProfit:60,items:[{menuId:'M',menuName:'โยเกิร์ต',qty:2}],...extra})
describe('dashboard reporting',()=>{
 it('uses inclusive Bangkok days and normalizes custom ranges',()=>{
  expect(dashboardRange('week','2026-10-10')).toEqual({start:'2026-10-04',end:'2026-10-10'})
  const report=buildDashboard([order('2026-10-03T16:59:59Z'),order('2026-10-03T17:00:00Z'),order('2026-10-10T16:59:59Z'),order('2026-10-10T17:00:00Z')],{start:'2026-10-10',end:'2026-10-04'})
  expect(report.orders).toHaveLength(2)
  expect(report.metrics.totalSales).toBe(200)
  expect(report.trend).toHaveLength(7)
  expect(report.trend[1].totalSales).toBe(0)
 })
 it('uses recorded financial snapshots, groups channels and ranks quantities without inventing item revenue',()=>{
  const r=buildDashboard([order('2026-10-09T10:00:00Z'),order('2026-10-10T10:00:00Z',{platformId:'B',platformName:'Delivery',subtotal:200,gpAmount:60,netRevenue:140,foodCost:50,grossProfit:90,items:[{menuId:'N',menuName:'ผลไม้',qty:3}]})],{start:null,end:null})
  expect(r.metrics).toMatchObject({totalSales:300,totalGp:70,totalFoodCost:80,grossProfit:150,orderCount:2,avgOrderValue:150})
  expect(r.channels.map(x=>x.totalSales)).toEqual([200,100])
  expect(r.menus.map(x=>x.qty)).toEqual([3,2])
  expect(r.orders[0].platformName).toBe('Delivery')
 })
 it('handles empty reports, losses, invalid timestamps and long histories with bounded monthly buckets',()=>{
  expect(buildDashboard([],{start:null,end:null}).metrics.orderCount).toBe(0)
  const r=buildDashboard([order('invalid'),order(undefined),order('2020-01-01T10:00:00Z',{grossProfit:-20}),order('2026-10-10T10:00:00Z')],{start:null,end:null})
  expect(r.orders).toHaveLength(2)
  expect(r.bucket).toBe('month')
  expect(r.trend.length).toBeLessThan(100)
  expect(r.trend[0].grossProfit).toBe(-20)
 })
})
