import { describe, it, expect } from 'vitest'
import { validateLotDates } from '../../src/domain/lotDates'
import { material, createTestStore } from '../helpers/createStore'

describe('lot origin and optional expiry', () => {
  it.each(['switchActiveLot', 'switchActiveLotSilently'])('%s clears dates absent from the selected lot', (action) => {
    const s=createTestStore()
    s.materials=[material('M',20,{lastStockInDate:'2026-10-01',expiryDate:'2026-10-20',lots:[
      {id:'DATED',qty:10,isInUse:true,receiveDate:'2026-10-01',expiryDate:'2026-10-20'},
      {id:'UNKNOWN',qty:10,isInUse:false,receiveDate:null,expiryDate:null}
    ]})]
    s[action]('M','UNKNOWN',true)
    expect(s.materials[0].lastStockInDate).toBeNull()
    expect(s.materials[0].expiryDate).toBeNull()
    expect(s.materials[0].lots[1].isInUse).toBe(true)
  })
  it('previews a new lot for a different origin even when expiry matches', () => {
    const s=createTestStore()
    const m=material('M',10,{lots:[{id:'OLD',qty:10,receiveDate:'2026-10-01',expiryDate:'2026-10-20'}]})
    expect(s.getLotActionPreview(m,'2026-10-13','2026-10-20').action).toBe('new_lot')
    expect(s.getLotActionPreview(m,'2026-10-01','2026-10-20').action).toBe('merge')
    m.lots[0].receiveDate=null
    expect(s.getLotActionPreview(m,'2026-10-13','2026-10-20').action).toBe('new_lot')
  })
  it('requires ingredient origin but permits no expiry', () => {
    expect(validateLotDates(material(), {}, 'receive')).toMatchObject({ok:false,code:'ORIGIN_DATE_REQUIRED'})
    expect(validateLotDates(material(), {expiryDate:'2026-10-15'}, 'produce').ok).toBe(false)
    expect(validateLotDates(material(), {receiveDate:'2026-10-13'}, 'receive')).toEqual({ok:true,dates:{receiveDate:'2026-10-13',expiryDate:null}})
  })
  it('validates calendar dates and chronological order', () => {
    expect(validateLotDates(material(), {receiveDate:'2026-02-30'}, 'receive')).toMatchObject({ok:false,code:'INVALID_DATE'})
    expect(validateLotDates(material(), {receiveDate:'2026-10-13',expiryDate:'2026-10-12'}, 'receive')).toMatchObject({ok:false,code:'EXPIRY_BEFORE_ORIGIN'})
    expect(validateLotDates(material(), {receiveDate:'2026-10-13',expiryDate:'bad'}, 'receive')).toMatchObject({ok:false,field:'expiryDate'})
  })
  it('does not require packaging dates and ignores category tracking', () => {
    expect(validateLotDates(material('P',0,{inventoryType:'packaging'}),{},'receive')).toEqual({ok:true,dates:{receiveDate:null,expiryDate:null}})
    const s=createTestStore()
    expect(s.getMaterialTrackingMode(material('M',0,{category:'Packaging'}))).toBe('expiry_and_receive')
  })
  it('rejects invalid receipt before drafts, lots, logs and persistence change', () => {
    const s=createTestStore(); s.materials=[material()]
    const before=JSON.stringify(s.materials), revision=s.databaseRevision
    expect(s.stockIn('X',10,1,'',null,{expiryDate:'2026-10-15'},true).ok).toBe(false)
    expect(JSON.stringify(s.materials)).toBe(before)
    expect(s.stockDraftSnapshot).toBeNull()
    expect(s.databaseRevision).toBe(revision)
  })
  it('rejects invalid stock increases before metadata is edited', () => {
    const s=createTestStore(); s.materials=[material()]
    const before=JSON.stringify(s.materials)
    expect(s.saveMaterial({...s.materials[0],name:'changed',stock:110,lastStockInDate:null,expiryDate:'2026-10-15'}).ok).toBe(false)
    expect(JSON.stringify(s.materials)).toBe(before)
  })
  it('receives optional expiry and preserves old undated lots', () => {
    const s=createTestStore(); s.materials=[material('M',5,{category:'Toppings',lots:[{id:'OLD',qty:5,initialQty:5,unitCost:1,isInUse:true,receiveDate:null,expiryDate:null}]})]
    expect(s.stockIn('M',10,1,'',null,{receiveDate:'2026-10-13'}).ok).toBe(true)
    expect(s.materials[0].lots[0].receiveDate).toBeNull()
    expect(s.materials[0].lots[1].expiryDate).toBeNull()
  })
  it('uses explicit production origin without silently inferring expiry', () => {
    const s=createTestStore();s.materials=[material('RAW'),material('OUT',0,{hasSubRecipe:true,shelfLifeDays:7,subRecipe:[{materialId:'RAW',qty:10}]})]
    expect(s.batchProduce('OUT',20,[{materialId:'RAW',qty:10}],'',{},true).ok).toBe(false)
    expect(s.materials.map(m=>m.stock)).toEqual([100,0])
    expect(s.batchProduce('OUT',20,[{materialId:'RAW',qty:10}],'',{receiveDate:'2026-10-13'},true).ok).toBe(true)
    expect(s.materials[1].lots.at(-1)).toMatchObject({receiveDate:'2026-10-13',expiryDate:null})
  })
  it('keeps active-lot dates accurate when a receipt has a different expiry', () => {
    const s=createTestStore();s.materials=[material('M',5,{lots:[{id:'OLD',qty:5,initialQty:5,unitCost:1,isInUse:true,receiveDate:'2026-10-01',expiryDate:null}]})]
    expect(s.stockIn('M',10,1,'',null,{receiveDate:'2026-10-13',expiryDate:'2026-10-20'}).ok).toBe(true)
    expect(s.materials[0].expiryDate).toBeNull()
    expect(s.materials[0].lots.at(-1).expiryDate).toBe('2026-10-20')
  })
})
