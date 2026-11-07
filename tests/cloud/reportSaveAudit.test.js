import {it,expect} from 'vitest'
import {projectReportOrders,reportRangeBounds} from '../../src/cloud/core/reportProjection.js'
import {buildDashboard} from '../../src/domain/dashboard.js'
import {encodeLegacyId} from '../../src/cloud/paths.js'

const platform=encodeLegacyId('P'),menu=encodeLegacyId('M')
const data={shop:{catalog:{platforms:{[platform]:{}},menus:{[menu]:{}}}},display:{platforms:{[platform]:{name:'Store'}},menus:{[menu]:{name:'Current'}},addons:{}},materials:[]}
const old=(patch={})=>({orderId:'OLD-1',status:'committed',createdAt:'2026-11-06T17:00:00.000Z',platformId:'P',platformName:'Store',subtotal:100,gpAmount:10,netRevenue:90,ingredientCost:20,packagingCost:5,foodCost:25,grossProfit:65,items:[{menuId:'M',menuName:'Historical',qty:1,totalPrice:100}],...patch})
const migrated=(original,status='committed')=>({origin:'legacy',opId:'LEGACY-1',sourceLegacyId:original.orderId,sourceLegacyJson:JSON.stringify(original),status,createdAt:original.createdAt,platformId:platform,cancelledAt:'2026-11-10T00:00:00Z'})
const range={start:'2026-11-07',end:'2026-11-07'}

it('uses one migrated legacy receipt and removes its archive from totals before and after a later cancellation',()=>{
 const original=old()
 for(const status of ['committed','cancelled']){
  const projected=projectReportOrders({receipts:[migrated(original,status)],legacyOrders:[original]},data)
  expect(projected).toHaveLength(1)
  expect(projected[0]).toMatchObject({status,sourceLegacyId:'OLD-1',items:[{menuId:menu,menuName:'Historical'}]})
  expect(buildDashboard(projected,range).metrics).toMatchObject({orderCount:status==='committed'?1:0,totalSales:status==='committed'?100:0,grossProfit:status==='committed'?65:0})
 }
})

it('agrees between server range boundaries and projected archive days at Bangkok midnight',()=>{
 const bounds=reportRangeBounds(range)
 const times=[bounds.startMs-1,bounds.startMs,bounds.endMs-1,bounds.endMs]
 const legacyOrders=times.map((ms,i)=>old({orderId:`OLD-${i}`,createdAt:new Date(ms).toISOString()}))
 const report=buildDashboard(projectReportOrders({legacyOrders},data),range)
 expect(report.orders.map(o=>o.orderId).sort()).toEqual(['OLD-1','OLD-2'])
 expect(report.metrics.totalSales).toBe(200)
})

it.each([{}, {subtotal:200,netRevenue:190,grossProfit:165}])('fails closed instead of counting ambiguous duplicate archive IDs %j',patch=>{
 const original=old()
 // Owner import archives originals verbatim. A duplicate must not become a
 // second sale merely because each archive document has a different index.
 expect(()=>projectReportOrders({legacyOrders:[original,old(patch)]},data)).toThrow('REPORT_INVALID_DATA')
})

it('keeps distinct legacy IDs even when their time, items and financial snapshots match',()=>{
 const report=buildDashboard(projectReportOrders({legacyOrders:[old(),old({orderId:'OLD-2'})]},data),range)
 expect(report.metrics).toMatchObject({orderCount:2,totalSales:200})
})
