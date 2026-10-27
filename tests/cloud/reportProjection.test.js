import {it,expect} from 'vitest'
import {projectReportOrders,reportRangeBounds} from '../../src/cloud/core/reportProjection.js'
import {buildDashboard} from '../../src/domain/dashboard.js'
import {encodeLegacyId} from '../../src/cloud/paths.js'
const platform=encodeLegacyId('P'),menu=encodeLegacyId('M')
const data={shop:{catalog:{menus:{[menu]:{}},platforms:{[platform]:{}}}},display:{menus:{[menu]:{name:'Renamed'}},addons:{A:{name:'Extra'}},platforms:{[platform]:{name:'Store'}}},materials:[]}
const native=(patch={})=>({opId:'N',status:'committed',createdAt:{seconds:Date.parse('2026-10-26T17:00:00Z')/1000,nanoseconds:0},platformId:platform,subtotalCents:10000,gpCents:3000,netCents:7000,ingredientCostCents:2000,packagingCostCents:500,grossProfitCents:4500,lines:[{menuId:menu,qty:1,totalCents:10000,catalog:{name:'Original',priceMode:'addon'},optionIds:['A'],optionQuantities:{A:1}}],inventory:[],...patch})
const old=(patch={})=>({orderId:'N',createdAt:'2026-10-27T08:00:00+07:00',platformId:'P',platformName:'Store',subtotal:50,gpAmount:0,netRevenue:50,foodCost:10,grossProfit:40,items:[{menuId:'M',menuName:'Original',qty:2}],...patch})
it('maps recorded cents and historical names, never today prices, while retaining separate source identities',()=>{
 const rows=projectReportOrders({receipts:[native()],legacyOrders:[old()]},data)
 expect(rows).toHaveLength(2);expect(new Set(rows.map(o=>o.reportKey)).size).toBe(2)
 expect(rows[0]).toMatchObject({subtotal:100,gpAmount:30,netRevenue:70,ingredientCost:20,packagingCost:5,foodCost:25,grossProfit:45,platformId:platform})
 expect(rows[0].items[0]).toMatchObject({menuId:menu,menuName:'Original',selectedAddons:[{name:'Extra',price:null}]})
 expect(rows[1].platformId).toBe(platform);expect(rows[1].items[0].menuId).toBe(menu)
 const report=buildDashboard(rows,{start:'2026-10-27',end:'2026-10-27'})
 expect(report.metrics).toMatchObject({totalSales:150,totalGp:30,netRevenue:120,totalFoodCost:35,grossProfit:85,orderCount:2})
 expect(report.channels).toHaveLength(1);expect(report.menus[0].qty).toBe(3)
})
it('excludes returned bills from sales, costs, rankings and receipt lists on their original sale day',()=>{
 const report=buildDashboard(projectReportOrders({receipts:[native({status:'cancelled'})],legacyOrders:[old({status:'cancelled'})]},data),{start:null,end:null})
 expect(report.orders).toEqual([]);expect(report.metrics.totalSales).toBe(0);expect(report.metrics.totalFoodCost).toBe(0);expect(report.channels).toEqual([])
})
it('does not guess missing shortage costs or historic addon prices',()=>{
 const row=projectReportOrders({receipts:[native({inventory:[{materialId:'X',shortage:100}]})],legacyOrders:[]},data)[0]
 expect(row.shortageCostRecorded).toBe(false);expect(row.items[0].selectedAddons[0].price).toBeNull()
})
it.each([{subtotalCents:1.2},{netCents:999},{createdAt:'bad'}])('fails closed for malformed native financial data %j',patch=>{
 expect(()=>projectReportOrders({receipts:[native(patch)],legacyOrders:[]},data)).toThrow('REPORT_INVALID_DATA')
})
it('uses Bangkok midnight with an exclusive next-day boundary and normalizes reversed dates',()=>{
 const r=reportRangeBounds({start:'2026-10-28',end:'2026-10-27'})
 expect(new Date(r.startMs).toISOString()).toBe('2026-10-26T17:00:00.000Z')
 expect(new Date(r.endMs).toISOString()).toBe('2026-10-28T17:00:00.000Z')
 expect(reportRangeBounds({start:null,end:null})).toEqual({start:null,end:null,startMs:null,endMs:null})
})
it.each(['2026-02-30','garbage'])('rejects invalid date %s',start=>expect(()=>reportRangeBounds({start,end:start})).toThrow('REPORT_INVALID_RANGE'))

it('labels missing imported-menu snapshot names as current labels rather than claiming historical names',()=>{
 const row=projectReportOrders({receipts:[native({lines:[{menuId:menu,qty:1,totalCents:10000,catalog:{},optionIds:[]}]})]},data)[0]
 expect(row.items[0].menuName).toBe('Renamed (ชื่อปัจจุบัน)')
})
