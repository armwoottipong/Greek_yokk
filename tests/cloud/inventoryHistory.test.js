import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, path) => ({ db, path })),
  getDocsFromServer: vi.fn(),
  limit: vi.fn(value => ({ type: 'limit', value })),
  orderBy: vi.fn((field, direction) => ({ type: 'orderBy', field, direction })),
  query: vi.fn((source, ...constraints) => ({ source, constraints })),
}))

import { collection, getDocsFromServer, limit, orderBy, query } from 'firebase/firestore'
import { loadInventoryHistory, projectInventoryHistory } from '../../src/cloud/core/inventoryHistory.js'

const materials = [
  { id: 'MILK', name: 'นมสด', emoji: '🥛', unit: 'ml' },
  { id: 'YOGURT', name: 'โยเกิร์ต', emoji: '🥣', unit: 'g' },
]

describe('projectInventoryHistory', () => {
  it('projects stock, production, count, lot, material, sale, and return records without inventing stock balances', () => {
    const logs = projectInventoryHistory({
      materials,
      operations: [
        { opId: 'IN', kind: 'stock_in', createdAt: '2026-10-20T10:00:00Z', materialId: 'MILK', qtyQ: 500, unitCost: 0.2, note: 'supplier' },
        { opId: 'PROD', kind: 'produce', createdAt: '2026-10-20T11:00:00Z', outputId: 'YOGURT', qtyQ: 250, rawCostBaht: 12, note: 'morning batch', inputs: [{ materialId: 'MILK', take: 1000, ingredientCostBaht: 2 }] },
        { opId: 'COUNT', kind: 'stock_count', createdAt: '2026-10-20T12:00:00Z', rows: [
          { materialId: 'MILK', mode: 'count', counts: [{ from: 1200, to: 1000 }], reason: 'นับจริง' },
          { materialId: 'MILK', mode: 'waste', counts: [{ from: 1000, to: 900 }], reason: 'ของเสีย/หมดอายุ', note: 'เสียหาย', lossCents: 340 },
        ] },
        { opId: 'SWITCH', kind: 'switch_lot', createdAt: '2026-10-20T13:00:00Z', materialId: 'MILK', lotId: 'LOT-2' },
        { opId: 'CREATE', kind: 'material_create', createdAt: '2026-10-20T14:00:00Z', materialSnapshot: { id: 'NEW', name: 'ใหม่', emoji: '🧃' } },
        { opId: 'ARCHIVE', kind: 'material_archive', createdAt: '2026-10-20T15:00:00Z', materialId: 'MILK', deleted: true },
        { opId: 'META', kind: 'material_metadata', createdAt: '2026-10-20T16:00:00Z', materialId: 'MILK', metadata: { name: 'นมใหม่' } },
        { opId: 'MEASURE', kind: 'material_measure', createdAt: '2026-10-20T17:00:00Z', materialId: 'MILK', measure: { unit: 'ml', packSize: 1 } },
        { opId: 'DETAILS', kind: 'material_details', createdAt: '2026-10-20T18:00:00Z', materialId: 'MILK', details: { category: 'Dairy' } },
        { opId: 'TYPE', kind: 'material_type', createdAt: '2026-10-20T19:00:00Z', targetId: 'MILK', previousType: 'ingredient', inventoryType: 'packaging' },
        { opId: 'RECIPE', kind: 'production_recipe', createdAt: '2026-10-20T20:00:00Z', materialId: 'YOGURT', recipe: { inputIds: ['MILK'] } },
        { opId: 'CANCEL', kind: 'cancel', createdAt: '2026-10-21T10:00:00Z', orderId: 'ORDER' },
      ],
      orders: [{ opId: 'ORDER', kind: 'sale_set', status: 'cancelled', createdAt: '2026-10-21T09:00:00Z', inventory: [{ materialId: 'MILK', take: 300 }] }],
      legacyLogs: [{ id: 'activityLogs_0', json: JSON.stringify([
        { id: 'LEGACY', timestamp: '2026-10-19T09:00:00Z', module: 'stock', action: 'adjust', targetId: 'MILK', delta: -2, title: 'รายการเดิม' },
      ]) }, { id: 'orders_0', json: '[]' }],
      display: { legacyOrderCount: 1 },
    })
    const byId = Object.fromEntries(logs.map(log => [log.id, log]))

    expect(byId['IN:stock_in']).toMatchObject({ action: 'stock_in', delta: 5, cost: 0.2, note: 'supplier', targetName: 'นมสด' })
    expect(byId['PROD:produce:YOGURT']).toMatchObject({ action: 'produce', delta: 2.5, cost: 12 })
    expect(byId['PROD:produce-input:MILK']).toMatchObject({ action: 'produce_deduct', delta: -10 })
    expect(byId['COUNT:count:MILK:0']).toMatchObject({ action: 'adjust', delta: -2 })
    expect(byId['COUNT:count:MILK:1']).toMatchObject({ action: 'waste', delta: -1, cost: 3.4, lossCents: 340, reason: 'ของเสีย/หมดอายุ' })
    expect(byId['SWITCH:switch_lot']).toMatchObject({ action: 'switch_lot', targetId: 'MILK' })
    expect(byId['CREATE:material_create']).toMatchObject({ action: 'create', targetId: 'NEW', targetName: 'ใหม่' })
    expect(byId['ARCHIVE:material_archive'].action).toBe('delete')
    expect(byId['META:material_metadata'].action).toBe('edit')
    expect(byId['MEASURE:material_measure'].action).toBe('edit')
    expect(byId['DETAILS:material_details'].action).toBe('edit')
    expect(byId['TYPE:material_type'].action).toBe('edit')
    expect(byId['RECIPE:production_recipe'].action).toBe('edit')
    expect(byId['ORDER:sale:MILK']).toMatchObject({ action: 'sale_deduct', delta: -3 })
    expect(byId['CANCEL:return:MILK']).toMatchObject({ action: 'order_cancel', delta: 3 })
    expect(byId.LEGACY).toMatchObject({ module: 'stock', action: 'adjust', targetName: 'นมสด' })
    expect(byId['IN:stock_in']).not.toHaveProperty('beforeStock')
    expect(logs.some(log => log.id === 'orders_0')).toBe(false)
    expect(logs.every(log => log.module === 'stock')).toBe(true)
  })

  it('deduplicates archived entries that overlap a current operation', () => {
    const current = { opId: 'same', kind: 'stock_in', createdAt: '2026-10-20T10:00:00Z', materialId: 'MILK', qtyQ: 100 }
    const logs = projectInventoryHistory({
      operations: [current], materials,
      legacyLogs: [{ id: 'old-id', timestamp: current.createdAt, action: 'stock_in', targetId: 'MILK', delta: 1, title: 'รับเข้าสต็อก' }],
    })
    expect(logs).toHaveLength(1)
    expect(logs[0].id).toBe('same:stock_in')
  })
})

describe('loadInventoryHistory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('uses server reads, loads 500 newest current records, and scans only archived activity log documents', async () => {
    const operation = { opId: 'IN', kind: 'stock_in', createdAt: { toDate: () => new Date('2026-10-20T10:00:00Z') }, materialId: 'MILK', qtyQ: 100 }
    const snapshots = [
      { size: 500, docs: [{ data: () => operation }] },
      { size: 1, docs: [{ data: () => ({ opId: 'ORDER', kind: 'sale_set', createdAt: '2026-10-20T11:00:00Z', inventory: [] }) }] },
      { size: 2, docs: [
        { id: 'activityLogs_1', data: () => ({ json: JSON.stringify([{ id: 'ARCHIVE', timestamp: '2026-10-19T08:00:00Z', module: 'stock', action: 'waste', targetId: 'MILK' }]) }) },
        { id: 'orders_0', data: () => ({ json: '[]' }) },
      ] },
    ]
    getDocsFromServer.mockImplementation(async () => snapshots.shift())

    const result = await loadInventoryHistory({ db: { name: 'db' }, shopId: 'shop', generation: 'gen', materials, display: { legacyOrderCount: 0 } })

    expect(getDocsFromServer).toHaveBeenCalledTimes(3)
    expect(collection).toHaveBeenCalledWith(expect.any(Object), 'shops/shop/generations/gen/operations')
    expect(collection).toHaveBeenCalledWith(expect.any(Object), 'shops/shop/generations/gen/orders')
    expect(collection).toHaveBeenCalledWith(expect.any(Object), 'shops/shop/generations/gen/legacyRecords')
    expect(orderBy).toHaveBeenCalledTimes(2)
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc')
    expect(limit).toHaveBeenCalledTimes(2)
    expect(limit).toHaveBeenCalledWith(500)
    expect(query).toHaveBeenCalledTimes(2)
    expect(result.truncated).toBe(true)
    expect(result.logs.map(log => log.id)).toEqual(['IN:stock_in', 'ARCHIVE'])
    expect(result.logs[0].timestamp).toBe('2026-10-20T10:00:00.000Z')
  })

  it('rejects incomplete scope before reading', async () => {
    await expect(loadInventoryHistory({ db: {}, shopId: 'shop' })).rejects.toThrow('INVALID_HISTORY_SCOPE')
    expect(getDocsFromServer).not.toHaveBeenCalled()
  })
})

it('reads the actual per-record archive JSON and links legacy material IDs to the live stock filter',()=>{
 const legacy={id:'OLD-LOG',module:'stock',timestamp:'2026-10-20T10:00:00Z',action:'adjust',targetId:'MAT002',beforeStock:10,afterStock:9,delta:-1,title:'ตรวจนับเดิม'}
 const rows=projectInventoryHistory({legacyLogs:[{id:'activityLogs_0',json:JSON.stringify(legacy)}],materials:[{id:'l_TUFUMDAy',legacyId:'MAT002',name:'นม'}]})
 expect(rows).toHaveLength(1)
 expect(rows[0]).toMatchObject({id:'OLD-LOG',targetId:'l_TUFUMDAy',beforeStock:10,afterStock:9,delta:-1})
 expect(legacy.targetId).toBe('MAT002')
})
