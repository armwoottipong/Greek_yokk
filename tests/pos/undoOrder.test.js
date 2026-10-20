import {it, expect, vi} from 'vitest'
import {createTestStore, material} from '../helpers/createStore'
import {buildDashboard} from '../../src/domain/dashboard'

function setup(stock = 100) {
 const s = createTestStore({storage:{GY_MATERIALS:[material('X', stock), material('P', 10, {inventoryType:'packaging'})], GY_MENUS:[{id:'M', name:'Yogurt', isActive:true, prices:{PLAT01:100}, recipe:[{materialId:'X', qty:30}, {materialId:'P', qty:1}]}]}})
 s.executeAddToCart(s.menus[0])
 const order = s.checkout({allowShortage:true})
 return {s, order}
}
it('undoes a sale using its original lots, preserves later sales and excludes it from revenue', () => {
 const {s, order} = setup()
 s.executeAddToCart(s.menus[0]); const later = s.checkout()
 s.menus[0].recipe[0].qty = 90
 expect(s.undoOrder(order.orderId).ok).toBe(true)
 expect(s.materials.map(m => m.stock)).toEqual([70, 9])
 expect(s.orders.find(o => o.orderId === order.orderId).status).toBe('cancelled')
 expect(s.orders.find(o => o.orderId === later.orderId).status).not.toBe('cancelled')
 expect(buildDashboard(s.orders, {}).metrics.totalSales).toBe(100)
 s.dashboardPeriod = 'all'
 expect(s.dashboardMetrics.totalSales).toBe(100)
 expect(s.activityLogs.some(l => l.action === 'order_cancel' && l.targetId === order.orderId)).toBe(true)
 const snapshot = JSON.stringify(s.databaseSnapshot())
 expect(s.undoOrder(order.orderId).ok).toBe(false)
 expect(JSON.stringify(s.databaseSnapshot())).toBe(snapshot)
 const saved = JSON.parse(localStorage.getItem('GY_DATABASE_V3'))
 expect(saved.orders.find(o => o.orderId === order.orderId).status).toBe('cancelled')
})
it('restores only stock actually deducted and removes outstanding shortages for that order', () => {
 const {s, order} = setup(10)
 expect(s.stockShortages).toHaveLength(1)
 expect(s.undoOrder(order.orderId).ok).toBe(true)
 expect(s.materials[0].stock).toBe(10)
 expect(s.stockShortages).toHaveLength(0)
 expect(s.orders[0].stockShortages).toHaveLength(1)
})
it('fails atomically when original lots are missing or allocation records are absent', () => {
 const {s, order} = setup()
 s.materials[1].lots = []
 let before = JSON.stringify(s.databaseSnapshot())
 expect(s.undoOrder(order.orderId).ok).toBe(false)
 expect(JSON.stringify(s.databaseSnapshot())).toBe(before)
 delete s.orders[0].inventoryAllocations
 before = JSON.stringify(s.databaseSnapshot())
 expect(s.undoOrder(order.orderId).ok).toBe(false)
 expect(JSON.stringify(s.databaseSnapshot())).toBe(before)
})
it('leaves the order and inventory unchanged on storage failure', () => {
 const {s, order} = setup()
 const before = JSON.stringify(s.databaseSnapshot())
 vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('quota')})
 expect(s.undoOrder(order.orderId).ok).toBe(false)
 expect(JSON.stringify(s.databaseSnapshot())).toBe(before)
 vi.restoreAllMocks()
})
it('preserves stock drafts and makes the return survive draft discard', () => {
 const {s, order} = setup()
 s.stockIn('X', 20, 1, '', null, {receiveDate:'2026-10-13', expiryDate:'2099-01-01'}, true)
 expect(s.undoOrder(order.orderId).ok).toBe(true)
 expect(s.materials[0].stock).toBe(120)
 s.discardStockDrafts()
 expect(s.materials[0].stock).toBe(100)
})
