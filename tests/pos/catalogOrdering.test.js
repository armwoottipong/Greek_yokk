import {it,expect} from 'vitest'
import {createTestStore} from '../helpers/createStore.js'
import {loadDatabase} from '../../src/services/localDatabase.js'
import {reorderExact,applyDisplayOrder,withLatestMenuOrder} from '../../src/domain/catalogOrdering.js'
it('accepts the initial realtime order and never replaces a newer revision with a stale load',()=>{
 expect(withLatestMenuOrder(null,{menuOrder:[],menuOrderRevision:0})).toEqual({menuOrder:[],menuOrderRevision:0})
 expect(withLatestMenuOrder({menuOrder:['A'],menuOrderRevision:1},{menuOrder:['B'],menuOrderRevision:2}).menuOrder).toEqual(['B'])
 expect(withLatestMenuOrder({menuOrder:['B'],menuOrderRevision:2},{menuOrder:['A'],menuOrderRevision:1}).menuOrder).toEqual(['B'])
})
import {catalogMenus} from '../../src/cloud/core/catalogPresentation.js'
it('uses saved order in the cloud menu projection and appends newly added menus',()=>{
 const data={shop:{catalog:{menuIds:['A','B','NEW'],menus:{A:{pricesCents:{}},B:{pricesCents:{}},NEW:{pricesCents:{}}}}},display:{menuOrder:['B','A','DELETED']}}
 expect(catalogMenus(data).map(m=>m.id)).toEqual(['B','A','NEW'])
})
it('preserves object fields and rejects lost, duplicate and unknown IDs',()=>{
 const rows=[{id:'A',prices:{P:12}},{id:'B',recipe:[{materialId:'I',qty:2}]}]
 expect(reorderExact(rows,['B','A'])).toEqual([rows[1],rows[0]])
 for(const ids of [['A'],['A','A'],['A','UNKNOWN']])expect(()=>reorderExact(rows,ids)).toThrow('INVALID_CATALOG_ORDER')
 expect(rows[0].id).toBe('A')
 expect(applyDisplayOrder(rows,['UNKNOWN','B','B'])).toEqual([rows[1],rows[0]])
})
it('persists Local menu order and rejects stale dialogs without changing prices or recipes',()=>{
 const s=createTestStore();s.resetDemoData()
 const before=structuredClone(JSON.parse(JSON.stringify(s.menus))),ids=before.map(m=>m.id).reverse(),revision=s.databaseRevision
 expect(s.reorderMenus(ids,{expectedOrderRevision:revision}).ok).toBe(true)
 expect(loadDatabase(localStorage).value.menus).toEqual(before.reverse())
 expect(s.reorderMenus(ids.reverse(),{expectedOrderRevision:revision}).ok).toBe(false)
})
