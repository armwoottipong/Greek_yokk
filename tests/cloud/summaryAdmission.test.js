// @vitest-environment node
import { readFile } from 'node:fs/promises'
import { it,expect } from 'vitest'
import { serverTimestamp } from 'firebase/firestore'
import { admitBatches,indexedFields,ADMISSION_LIMITS,inventoryBatches,saleBatches,platformBatches } from '../firestore/summaryAdmission.js'
import { platformFixture } from '../firestore/summaryPlatformFixture.js'
import { summarySale } from '../firestore/summarySale.js'
import { preparedSale } from '../firestore/summaryPreparedSale.js'
import { inventoryBatchFixture } from '../firestore/summaryInventoryBatchFixture.js'

const config=JSON.parse(await readFile(new URL('../../firestore.indexes.json',import.meta.url),'utf8'))
it('exempts every candidate payload collection while preserving chronological pagination',()=>{
  for(const id of ['shops','generations','materials','orders','operations','preparedSales','lineProofs','preparedInventory','steps','proofs','preparedPlatforms','columnProofs','preparations']){
    const wildcard=config.fieldOverrides.find(f=>f.collectionGroup===id&&f.fieldPath==='*')
    expect(wildcard?.indexes).toEqual([])
  }
  for(const id of ['orders','operations','preparedInventory','preparedPlatforms','preparations'])expect(indexedFields(config,id)).toEqual(['createdAt'])
  for(const f of config.fieldOverrides.filter(f=>f.fieldPath!=='*')){
    expect(f.fieldPath).toBe('createdAt');expect(f.ttl).toBeUndefined()
    expect(f.indexes.map(i=>i.order).sort()).toEqual(['ASCENDING','DESCENDING'])
    expect(f.indexes.every(i=>i.queryScope==='COLLECTION')).toBe(true)
  }
  expect(config.indexes).toEqual([])
})
it('admits a small full workflow and never changes caller data',()=>{
  const {f}=inventoryBatchFixture(),batches=inventoryBatches(f),before=structuredClone(f.steps)
  expect(admitBatches(batches)).toMatchObject({ok:true,productionReady:false})
  expect(f.steps).toEqual(before)
  expect(batches).toHaveLength(2+2*(1+3)+1)
})
it('rejects a document within Firestore hard size but over the common headroom budget',()=>{
  const r=admitBatches([[{path:'shops/s',data:{payload:'x'.repeat(ADMISSION_LIMITS.documentBytes)}}]])
  expect(r.ok).toBe(false);expect(r.violations).toContain('ADMISSION_DOCUMENT')
})
it('checks each request as a whole, and does not combine independent preparation requests',()=>{
  const writes=Array.from({length:15},(_,i)=>({path:`shops/s/materials/m${i}`,data:{payload:'x'.repeat(600000)}}))
  expect(admitBatches([writes]).violations).toContain('ADMISSION_REQUEST')
  expect(admitBatches(writes.map(w=>[w])).ok).toBe(true)
})
it('rejects a later oversized step before allowing a caller to prepare the earlier steps',()=>{
  const {f}=inventoryBatchFixture();f.steps[1].after.S0.name='x'.repeat(900000)
  expect(admitBatches(inventoryBatches(f)).ok).toBe(false)
})
it('reports unsupported values explicitly without claiming admission',()=>{
  expect(admitBatches([[{path:'shops/s',data:{bad:NaN}}]])).toMatchObject({ok:false,violations:['UNSUPPORTED_AUDIT_VALUE']})
})
it('measures the dense 64-menu/addon/group,45-choice,4-channel profile with four working lots',()=>{
  const {base}=platformFixture({dense:true,platforms:4}),c=base.shop.catalog
  expect(c.menuIds).toHaveLength(64);expect(c.addonIds).toHaveLength(64);expect(c.groupIds).toHaveLength(64)
  const sale=preparedSale(summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:c.addonIds.slice(0,11),note:'ก'.repeat(1000)})),{platformId:'P3'}))
  const report=admitBatches(saleBatches(sale))
  expect(report.ok).toBe(true);expect(report.maxDocumentBytes).toBeLessThan(ADMISSION_LIMITS.documentBytes)
  expect(sale.order.lines).toHaveLength(6)
})
it('does not require map or lot array indexes to store server timestamps and payloads',()=>{
  expect(indexedFields(config,'materials')).toEqual([])
  expect(indexedFields(config,'lineProofs')).toEqual([])
  expect(admitBatches([[{path:'shops/s/generations/g/orders/o',data:{createdAt:serverTimestamp(),lines:[{note:'ก'}]}}]]).ok).toBe(true)
})
it('admits all dense platform preparation requests before the two-write final commit',()=>{
  const {f}=platformFixture({dense:true,platforms:3}),report=admitBatches(platformBatches(f))
  expect(report).toMatchObject({ok:true,requests:35,writes:36})
  expect(f.nextShop.catalog.platformIds).toHaveLength(4)
})
it('rejects the joint text/history envelope even when each material fits the document budget',()=>{
  const {base}=platformFixture({dense:true,platforms:4}),c=base.shop.catalog
  for(const m of base.materials){
    const lot=m.lots[m.lotIds[0]]
    while(m.lotIds.length<200){
      const id=`OLD-${m.lotIds.length}`
      m.lots[id]={...lot,id,qty:0,isInUse:false,note:'ก'.repeat(1000)};m.lotIds.push(id);m.lotQty[id]=0
    }
  }
  const sale=preparedSale(summarySale(base.shop,base.materials,Array.from({length:6},()=>({menuId:'SIMPLE',qty:1,optionIds:c.addonIds.slice(0,11),note:'ก'.repeat(1000)})),{platformId:'P3'}))
  const report=admitBatches(saleBatches(sale))
  expect(report.ok).toBe(false);expect(report.violations).toContain('ADMISSION_REQUEST')
  expect(report.maxDocumentBytes).toBeLessThan(ADMISSION_LIMITS.documentBytes)
  expect(sale.nextMaterials.every(m=>m.lotIds.length===200)).toBe(true)
})
it.each([
  {batches:[],violation:'EMPTY_WORKFLOW'},
  {batches:[[]],violation:'UNSUPPORTED_AUDIT_VALUE'},
  {batches:[[{path:'shops/s',data:{}},{path:'shops/s',data:{}}]],violation:'DUPLICATE_WRITE_PATH'},
])('rejects malformed workflow: $violation',({batches,violation})=>{
  const report=admitBatches(batches)
  expect(report.ok).toBe(false);expect(report.violations).toContain(violation)
})
