import { describe, it, expect } from 'vitest'
import { gasHarness } from '../helpers/gasHarness.js'

const conversion = {targetMaterialId:'MAT001',yieldQty:20,totalBatchCost:10,subUsages:[{materialId:'MAT002',qty:10},{materialId:'MAT002',qty:20}]}
const snapshot = () => ({schemaVersion:3,revision:4,materials:[{id:'M',stock:2,lots:[{id:'L',qty:2}]}],menus:[],addons:[],platforms:[],orders:[],activityLogs:[{id:'log',note:'x'.repeat(65000)}],categories:{materials:['test']},gasApiUrl:'',stockShortages:[]})
describe('GAS recoverable backend',()=>{
  it('setup retains business rows and seed references point to actual ingredients',()=>{
    const h=gasHarness(); h.rows('RawMaterials')[1][4]=123; h.context.setupDatabase()
    expect(h.rows('RawMaterials')[1][4]).toBe(123)
    expect(h.rows('Addons').find(r=>r[0]==='ADD01')[5]).toBe('MAT004')
    expect(h.rows('Addons').find(r=>r[0]==='ADD08')[5]).toBe('MAT009')
  })
  it('rejects missing production target before consuming ingredients',()=>{
    const h=gasHarness(); const before=JSON.stringify(h.rows('RawMaterials'))
    expect(h.post('stockConversion',{...conversion,targetMaterialId:'missing'}).status).toBe('error')
    expect(JSON.stringify(h.rows('RawMaterials'))).toBe(before)
    expect(h.rows('StockTransactions')).toHaveLength(1)
  })
  it('aggregates duplicate ingredients and replays one committed result',()=>{
    const h=gasHarness(); const first=h.post('stockConversion',conversion)
    expect(first.status).toBe('success'); expect(h.rows('RawMaterials')[2][4]).toBe(14970)
    expect(h.rows('StockTransactions').filter(r=>r[4]==='PREP_USE')).toHaveLength(1)
    expect(h.post('stockConversion',conversion)).toEqual(first)
    expect(h.rows('RawMaterials')[2][4]).toBe(14970)
  })
  it.each([0,-1,'NaN',null])('invalid yield %s has no business writes',yieldQty=>{
    const h=gasHarness(); const before=JSON.stringify(h.rows('RawMaterials'))
    expect(h.post('stockConversion',{...conversion,yieldQty}).status).toBe('error')
    expect(JSON.stringify(h.rows('RawMaterials'))).toBe(before)
  })
  it('requires request ids and rejects reuse for another payload',()=>{
    const h=gasHarness(); expect(h.post('stockIn',{materialId:'MAT001',quantity:1,unitCost:0},'').status).toBe('error')
    expect(h.post('stockIn',{materialId:'MAT001',quantity:1,unitCost:0}).status).toBe('success')
    expect(h.post('stockIn',{materialId:'MAT001',quantity:2,unitCost:0}).status).toBe('error')
  })
  it('getOrders filters Bangkok calendar dates',()=>{
    const h=gasHarness(); h.rows('Orders').push(['old','2026-10-09T15:00:00Z'],['new','2026-10-09T17:20:00Z'])
    const result=h.get({action:'getOrders',startDate:'2026-10-10',endDate:'2026-10-10'})
    expect(result.status).toBe('success'); expect(result.data.map(o=>o.OrderID)).toEqual(['new'])
  })
  it('preserves full chunked snapshot and exposes committed readback',()=>{
    const h=gasHarness(); const s=snapshot(); const result=h.post('syncAll',{snapshot:s},'backup-1')
    expect(result.data).toMatchObject({requestId:'backup-1',revision:4,status:'committed'})
    expect(h.get({action:'getSnapshot'}).data.snapshot).toEqual(s)
    expect(h.post('syncAll',{snapshot:s},'backup-1')).toEqual(result)
  })
  it.each(Array.from({length:12},(_,i)=>i+1))('recovers conversion failure at write boundary %s exactly once',boundary=>{
    const h=gasHarness(); h.failAfter(boundary); h.post('stockConversion',conversion); h.resume()
    expect(h.post('stockConversion',conversion).status).toBe('success')
    expect(h.rows('RawMaterials')[2][4]).toBe(14970)
    expect(h.rows('RawMaterials')[1][4]).toBe(3520)
    expect(h.rows('StockTransactions').filter(r=>r[4]==='PREP_USE')).toHaveLength(1)
  })
  it('zero purchase cost participates in the weighted average',()=>{
    const h=gasHarness(); h.post('stockIn',{materialId:'MAT001',quantity:3500,unitCost:0})
    expect(h.rows('RawMaterials')[1][6]).toBe(0.09)
  })
  it.each(['stockIn','stockAdjust','saveMaterial','saveMenu','saveAddon','savePlatforms'])('rejects invalid finite quantities for %s without changes',action=>{
    const data={stockIn:{materialId:'MAT001',quantity:-1},stockAdjust:{materialId:'MAT001',countedQty:-1},saveMaterial:{name:'invalid',stock:-1},saveMenu:{recipe:[{materialId:'MAT001',qty:-1}]},saveAddon:{materialId:'MAT001',amountUsed:-1},savePlatforms:[{id:'bad',gpPercent:101}]}[action]
    const h=gasHarness(); const before=JSON.stringify([...h.sheets].map(([name,s])=>[name,s.rows]))
    expect(h.post(action,data).status).toBe('error')
    expect(JSON.stringify([...h.sheets].filter(([name])=>!['Operations','OperationChunks','SnapshotChunks','SnapshotMetadata'].includes(name)).map(([name,s])=>[name,s.rows]))).toBe(before)
  })
  it.each(Array.from({length:12},(_,i)=>i+1))('recovers order at boundary %s without orphan items or repeated deduction',boundary=>{
    const h=gasHarness(); const data={items:[{menuId:'MENU01',menuName:'test',qty:1,unitPrice:10,totalPrice:10,recipe:[{materialId:'MAT001',qty:100}]}],subtotal:10,discount:0,gpPercent:0,platformId:'PLAT01',platformName:'store'}
    h.failAfter(boundary); h.post('createOrder',data); h.resume()
    const response=h.post('createOrder',data); expect(response.status).toBe('success')
    expect(h.rows('RawMaterials')[1][4]).toBe(3400)
    expect(h.rows('OrderItems').filter(r=>r[0] && r[0]!=='ItemID')).toHaveLength(1)
    expect(h.get({action:'getOrders'}).data.map(o=>o.OrderID)).toEqual([response.data.orderId])
    expect(h.post('createOrder',data)).toEqual(response)
  })
  it.each(['saveMaterial','saveMenu','saveAddon','deleteMaterial','restoreMaterial','savePlatforms','saveSettings','stockIn','stockAdjust'])('recovers and replays %s once',action=>{
    const data={saveMaterial:{name:'new',stock:1,unitCost:0},saveMenu:{name:'new',recipe:[],prices:{}},saveAddon:{name:'new',materialId:'MAT001',amountUsed:2,prices:{}},deleteMaterial:{materialId:'MAT001'},restoreMaterial:{materialId:'MAT001'},savePlatforms:[{id:'PLAT99',name:'test',gpPercent:0}],saveSettings:{ShopName:'changed'},stockIn:{materialId:'MAT001',quantity:10,unitCost:0},stockAdjust:{materialId:'MAT001',countedQty:10}}[action]
    for (let boundary=1;boundary<=12;boundary++) {
      const h=gasHarness(); h.failAfter(boundary); h.post(action,data); h.resume()
      const first=h.post(action,data); expect(first.status).toBe('success')
      const before=JSON.stringify([...h.sheets].map(([name,s])=>[name,s.rows]))
      expect(h.post(action,data)).toEqual(first)
      expect(JSON.stringify([...h.sheets].map(([name,s])=>[name,s.rows]))).toBe(before)
    }
  })
  it.each(Array.from({length:12},(_,i)=>i+1))('recovers full snapshot at boundary %s and retains previous backup',boundary=>{
    const h=gasHarness(); const old=snapshot(); h.post('syncAll',{snapshot:old},'old')
    const next={...snapshot(),revision:5}; h.failAfter(boundary); h.post('syncAll',{snapshot:next},'next'); h.resume()
    expect(h.post('syncAll',{snapshot:next},'next').status).toBe('success')
    expect(h.get({action:'getSnapshot'}).data.snapshot).toEqual(next)
    expect(h.get({action:'getSnapshot',requestId:'old'}).data.snapshot).toEqual(old)
  })
  it('GET recovers prepared order before returning and refuses corrupted recovery chunks',()=>{
    const h=gasHarness(); h.failAfter(7); h.post('stockConversion',conversion); h.resume()
    const prepared=h.rows('Operations').find(r=>r[2]==='PREPARED'); expect(prepared).toBeTruthy()
    const row=h.rows('OperationChunks').find(r=>r[0]===prepared[4]); const original=row[2]; row[2]='corrupt'
    expect(h.get({action:'getAllData'}).status).toBe('error')
    row[2]=original; expect(h.get({action:'getAllData'}).status).toBe('success')
    expect(h.rows('RawMaterials')[2][4]).toBe(14970)
    expect(prepared[2]).toBe('COMMITTED')
  })
  it('rejects snapshot material quantities that cannot round trip safely',()=>{
    const h=gasHarness(); const s=snapshot(); s.materials[0].stock=-1
    expect(h.post('syncAll',{snapshot:s}).status).toBe('error')
    expect(h.get({action:'getSnapshot'}).status).toBe('error')
  })
  it('rejects an older revision while preserving the current backup',()=>{
    const h=gasHarness(); h.post('syncAll',{snapshot:snapshot()},'current')
    expect(h.post('syncAll',{snapshot:{...snapshot(),revision:3}},'old').status).toBe('error')
    expect(h.get({action:'getSnapshot'}).data.revision).toBe(4)
  })
  it('round trips snapshot chunks whose text starts with a Sheets formula marker',()=>{
    const h=gasHarness(); const s=snapshot(); s.activityLogs[0].note='='.repeat(65000)
    expect(h.post('syncAll',{snapshot:s}).status).toBe('success')
    expect(h.get({action:'getSnapshot'}).data.snapshot).toEqual(s)
  })
  it('grows the sheet grid before committing an order beyond existing capacity',()=>{
    const h=gasHarness(); const header=h.rows('Orders')[0]
    for(let i=0;i<999;i++) h.rows('Orders').push(header.map((_,column)=>column===0?'legacy-'+i:column===1?'2026-10-09T01:00:00Z':''))
    const data={items:[{menuName:'test',qty:1,unitPrice:10,totalPrice:10,recipe:[]}],subtotal:10,discount:0,gpPercent:0,platformId:'PLAT01',platformName:'store'}
    expect(h.post('createOrder',data).status).toBe('success')
    expect(h.get({action:'getOrders'}).data).toHaveLength(1000)
  })
})
