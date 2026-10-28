// @vitest-environment node
import {it,expect} from 'vitest'
import {Timestamp} from 'firebase/firestore'
import {projectReportOrders} from '../../src/cloud/core/reportProjection.js'
it('counts migrated legacy history once and observes its current cancellation status',()=>{
 const original={orderId:'OLD',status:'committed',createdAt:'2026-10-20T00:00:00Z',subtotal:69,gpAmount:0,netRevenue:69,foodCost:20,grossProfit:49,platformName:'Historic',items:[{menuName:'Historic menu',qty:1}]}
 const data={display:{menus:{},platforms:{}},shop:{catalog:{menus:{},platforms:{}}}}
 const result=projectReportOrders({receipts:[{origin:'legacy',opId:'LEGACY-ID',sourceLegacyId:'OLD',sourceLegacyJson:JSON.stringify(original),createdAt:Timestamp.fromDate(new Date(original.createdAt)),status:'cancelled'}],legacyOrders:[original]},data)
 expect(result).toHaveLength(1);expect(result[0].status).toBe('cancelled');expect(result[0].items[0].menuName).toBe('Historic menu')
})
