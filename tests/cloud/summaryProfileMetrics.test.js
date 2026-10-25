// @vitest-environment node
import { expect,it } from 'vitest'
import { serverTimestamp } from 'firebase/firestore'
import { documentMetrics,commitMetrics,inventoryBudget,saleBudget,auditMaterialProfile } from '../firestore/summaryProfileMetrics.js'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryInventoryBatch } from '../firestore/summaryInventoryBatch.js'
import { materialRegistryShop } from '../firestore/summaryMaterialAuthor.js'
import { auditPreparedProfile } from '../firestore/summaryProfileAudit.js'
import { readFile } from 'node:fs/promises'

it('matches the official 147-byte storage example, including document path',()=>{
  expect(documentMetrics('users/jeff/tasks/my_task_id',{type:'Personal',done:false,priority:1,description:'Learn Cloud Firestore'}).storageBytes).toBe(147)
})
it('counts Thai UTF-8, map overhead, numbers, null and timestamps independently of JSON',()=>{
  const plain=documentMetrics('c/d',{}).storageBytes
  expect(documentMetrics('c/d',{ก:'ข'}).storageBytes-plain).toBe(8)
  expect(documentMetrics('c/d',{m:{a:0}}).storageBytes-plain).toBe(44)
  expect(documentMetrics('c/d',{t:serverTimestamp(),n:null}).storageBytes-plain).toBe(13)
  expect(documentMetrics('c/d',{a:[1,2,3]}).storageBytes-plain).toBe(26)
})
it('measures full-set Commit protobuf including update transforms, not JSON length',()=>{
  // database field (3), writes envelope (2), update envelope (2), name field (17).
  expect(commitMetrics('d',[{path:'c/d',data:{}}]).wireBytes).toBe(24)
  expect(commitMetrics('d',[{path:'c/d',data:{t:serverTimestamp()}}]).wireBytes).toBe(31)
  expect(commitMetrics('d',[{path:'c/d',data:{m:{a:1}}}]).wireBytes).toBe(42)
  expect(commitMetrics('d',[{path:'c/d',data:{a:[1,'x',null]}}]).wireBytes).toBe(47)
  expect(commitMetrics('d',[{path:'c/d',data:{n:-1}}]).wireBytes).toBeGreaterThan(commitMetrics('d',[{path:'c/d',data:{n:1}}]).wireBytes)
  expect(commitMetrics('d',[{path:'c/d',data:{n:-0}}]).wireBytes-commitMetrics('d',[{path:'c/d',data:{n:0}}]).wireBytes).toBe(7)
})
it.each([undefined,NaN,Infinity,9007199254740992,()=>0])('fails closed on unsupported values %s',value=>{
  expect(()=>documentMetrics('c/d',{value})).toThrow()
})
it('rejects nested arrays and unsupported object types instead of guessing',()=>{
  expect(()=>documentMetrics('c/d',{a:[[1]]})).toThrow()
  expect(()=>documentMetrics('c/d',{m:new Map()})).toThrow()
  expect(()=>commitMetrics('d',[{path:'c/d',data:{m:{t:serverTimestamp()}}}])).toThrow()
})
it('detects depth, field length and document storage violations',()=>{
  let deep=0;for(let i=0;i<22;i++)deep={a:deep}
  expect(documentMetrics('c/d',deep).violations).toContain('DEPTH')
  expect(documentMetrics('c/d',{['ก'.repeat(501)]:0}).violations).toContain('FIELD_NAME')
  expect(documentMetrics('c/d',{a:'x'.repeat(1048576)}).violations).toContain('DOCUMENT_SIZE')
})
it('distinguishes valid individual documents from an oversized whole request',()=>{
  const data={payload:'x'.repeat(600000)}
  expect(documentMetrics('c/d',data).violations).toEqual([])
  expect(commitMetrics('projects/demo-greek-yogg/databases/(default)',Array.from({length:18},(_,i)=>({path:`c/d${i}`,data}))).violations).toContain('REQUEST_SIZE')
})
it('checks escaped composite field paths, not only each individual field name',()=>{
  const data={['a'.repeat(750)]:{['b'.repeat(750)]:0}}
  expect(documentMetrics('c/d',data).violations).toContain('FIELD_PATH')
  expect(documentMetrics('c/d',{['ก'.repeat(500)]:0}).violations).toContain('FIELD_PATH')
  expect(documentMetrics('c/d',{'a.b':{'x`y':0}}).violations).toEqual([])
})
it('budgets bounded workflows without claiming billable reads measured',()=>{
  expect(inventoryBudget(6,6)).toMatchObject({preparationWrites:116,finalWrites:8,writes:124,preparationDocuments:116})
  expect(inventoryBudget(1,1).writes).toBe(9)
  expect(saleBudget(6)).toMatchObject({preparationWrites:7,finalWrites:17,writes:24})
  expect(saleBudget(1).writes).toBe(19)
})
it.each([[0,1],[7,1],[1,7],[1,0],[1.5,1]])('rejects invalid workload bounds %s/%s',(steps,materials)=>{
  expect(()=>inventoryBudget(steps,materials)).toThrow()
})
it('audits all lot quantities and historical costs, never just working slots',()=>{
  const f=summaryFixture(),m=f.materials[0]
  expect(auditMaterialProfile(f.shop,f.materials).violations).toEqual([])
  m.lotQty[m.lotIds[0]]++
  expect(auditMaterialProfile(f.shop,f.materials).violations).toContain('STOCK_TOTAL')
  m.lots[m.lotIds[0]].unitCost=Infinity
  expect(auditMaterialProfile(f.shop,f.materials).violations).toContain('LOT_COST')
})
it('reports duplicate ids, missing protected members, out-of-profile history and working lots',()=>{
  const f=summaryFixture(),m=f.materials[0]
  f.shop.catalog.summaryMaterials[0]='MISSING';m.lotIds.push(m.lotIds[0]);m.allocationIds=Array(5).fill(m.lotIds[0])
  const report=auditMaterialProfile(f.shop,f.materials)
  expect(report.violations).toEqual(expect.arrayContaining(['PROTECTED_MEMBERS','LOT_KEYS','WORKING_LOTS']))
})
it.each(['rank','slots','active','hidden-positive','sentinel','registry'])('blocks an invalid induction precondition: %s',kind=>{
  const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)
  const m=f.materials[0]
  const code={rank:'COST_RANK',slots:'SLOT_INDEX',active:'ACTIVE_LOT','hidden-positive':'WORKING_LOTS',sentinel:'SENTINEL',registry:'REGISTRY'}[kind]
  if(kind==='rank')f.materials[1].costRank=m.costRank
  if(kind==='slots')m.slotIds=['_','_','_','_']
  if(kind==='active')m.activeLotId='MISSING'
  if(kind==='hidden-positive')m.allocationIds=[]
  if(kind==='sentinel')m.lots._.expiryDay=0
  if(kind==='registry')f.shop.materialIds.pop()
  expect(auditMaterialProfile(f.shop,f.materials).violations).toContain(code)
})
it('does not infer mixed-draft support from the 1000-lot count alone',()=>{
  const f=summaryFixture(),m=f.materials[0],first=m.lots[m.lotIds[0]]
  while(m.lotIds.length<1000){
    const id=`OLD-${m.lotIds.length}`
    m.lots[id]={...first,id,qty:0,isInUse:false,note:'n'.repeat(300)};m.lotIds.push(id);m.lotQty[id]=0
  }
  f.shop=materialRegistryShop(f.shop,f.materials)
  expect(auditMaterialProfile(f.shop,f.materials).violations).toEqual([])
  expect(documentMetrics('c/d',m).violations).toEqual([])
  expect(()=>summaryInventoryBatch(f.shop,f.materials,[{kind:'count',materialId:m.id,counts:[{id:m.lotIds[0],to:m.lotQty[m.lotIds[0]]-1}]}])).toThrow('size bound')
  m.lots[m.lotIds[0]].note='x'.repeat(1048576)
  expect(documentMetrics('c/d',m).violations).toContain('DOCUMENT_SIZE')
})
it.skipIf(!process.env.GY_SOURCE_BACKUP)('reports only aggregate private source measurements without mutating or importing history',async()=>{
  const raw=JSON.parse(await readFile(process.env.GY_SOURCE_BACKUP,'utf8')),before=structuredClone(raw),report=auditPreparedProfile(raw)
  expect(report).toMatchObject({sampleFits:true,inspectionOnly:true,productionReady:false,profile:{materials:18,protectedMaterials:15,maxHistoricalLots:1}})
  expect(report.historicalRecordsExcluded).toEqual({orders:4,activityLogs:29})
  expect(report.scenarios.every(s=>s.violations.length===0)).toBe(true)
  expect(report.scenarios.find(s=>s.name==='six-line-eleven-addon-sale').documents).toBe(17)
  const text=JSON.stringify(report)
  for(const id of raw.materials.map(m=>m.id))expect(text).not.toContain(id)
  expect(raw).toEqual(before)
})
