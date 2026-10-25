import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryInventoryBatch } from '../firestore/summaryInventoryBatch.js'

const setup=()=>{
  const base=summaryFixture()
  base.shop.materialIds=base.materials.map(m=>m.id)
  base.materials[12].productionRecipe={inputIds:['S0','S1'],quantities:[200000,10000],yieldQ:120000}
  return base
}
const receive=(materialId,overrides={})=>({kind:'receive',materialId,input:{qtyQ:10000,unitCost:2,packCostCents:500,receiveDay:21000,expiryDay:22000,newLotId:'BATCH-LOT',note:'batch',lotCreatedAtISO:'2026-10-20T00:00:00.000Z',businessDay:21000,...overrides}})
const count=(base,materialId)=>({kind:'count',materialId,counts:base.materials.find(m=>m.id===materialId).lotIds.map(id=>({id,to:base.materials.find(m=>m.id===materialId).lotQty[id]})),reason:'verify'})

it('chains receive, production, and counts through staged snapshots with one final revision',()=>{
  const base=setup(),before=structuredClone(base)
  const actions=[receive('S0'),{kind:'produce',materialId:'S12',input:{qtyQ:10000,lotId:'BATCH-PRODUCT',receiveDay:21000,expiryDay:22000,note:'produced',lotCreatedAtISO:'2026-10-20T00:00:00.000Z'}},count(base,'S0'),count(base,'S12')]
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{opId:'MIXED',businessDay:21000})
  expect(base).toEqual(before)
  expect(f.proposal).toMatchObject({schemaVersion:2,kind:'inventory_batch',status:'prepared',opId:'MIXED',uid:'cashier',rootRevision:base.shop.revision,businessDay:21000,stepCount:4})
  expect(f.steps).toHaveLength(4)
  expect(f.steps.map(s=>s.command.status)).toEqual(Array(4).fill('planned'))
  expect(f.steps.every(s=>!Object.hasOwn(s.command,'createdAt'))).toBe(true)
  expect(f.steps.every(s=>s.command.opId==='MIXED'&&s.command.shopRevision===base.shop.revision+1)).toBe(true)
  expect(f.steps[0].after.S0.stock).toBeGreaterThan(f.steps[0].before.S0.stock)
  expect(f.steps[1].before.S0).toEqual(f.steps[0].after.S0)
  expect(f.steps[1].after.S0.stock).toBeLessThan(f.steps[1].before.S0.stock)
  expect(f.steps[2].before.S0).toEqual(f.steps[1].after.S0)
  expect(f.steps[3].before.S12).toEqual(f.steps[2].after.S12)
  expect(f.proposal.materialIds).toEqual(['S0','S1','S12'].sort((a,b)=>base.materials.find(x=>x.id===a).costRank-base.materials.find(x=>x.id===b).costRank))
  expect(f.nextMaterials.map(m=>m.id)).toEqual(f.proposal.materialIds)
  expect(f.nextMaterials.every((m,i)=>m.revision===base.materials.find(old=>old.id===m.id).revision+1&&m.lastOpId==='MIXED'&&m.lastOpKind==='inventory_batch'&&m.lastOpIndex===i)).toBe(true)
  expect(f.nextShop.revision).toBe(base.shop.revision+1)
  expect(f.nextShop.catalogRevision).toBe(base.shop.catalogRevision)
  expect(f.operation).toMatchObject({schemaVersion:2,kind:'inventory_batch',status:'committed',opId:'MIXED',beforeShopRevision:base.shop.revision,shopRevision:base.shop.revision+1,businessDay:21000,stepCount:4,materialIds:f.proposal.materialIds})
})

it('uses the newly weighted ingredient cost to value a produced lot',()=>{
  const base=setup(),actions=[receive('S0',{unitCost:7}),{kind:'produce',materialId:'S12',input:{qtyQ:10000,lotId:'NEW-PRODUCT',receiveDay:21000,expiryDay:22000}}]
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{businessDay:21000})
  const received=f.steps[0].after.S0,output=f.steps[1].after.S12
  expect(received.unitCost).not.toBe(base.materials.find(m=>m.id==='S0').unitCost)
  expect(output.lots['NEW-PRODUCT'].unitCost).toBeGreaterThan(0)
  expect(f.steps[1].before.S0).toEqual(received)
})

it('rejects a produced lot cost above the cap even when global weighted cost remains low',()=>{
  const base=setup(),input=base.materials.find(m=>m.id==='S0'),output=base.materials.find(m=>m.id==='S12')
  input.unitCost=100000
  output.stock=1000000;output.unitCost=0.2;output.productionRecipe={inputIds:['S0'],quantities:[100],yieldQ:1}
  expect(()=>summaryInventoryBatch(base.shop,base.materials,[{kind:'produce',materialId:'S12',input:{qtyQ:1,lotId:'TOO-COSTLY',receiveDay:21000,expiryDay:22000}}],{businessDay:21000})).toThrow()
})

it('routes packaging receipts through the package planner',()=>{
  const base=setup(),f=summaryInventoryBatch(base.shop,base.materials,[receive('S11',{qtyQ:100,unitCost:0.5,receiveDay:999999,expiryDay:999999})],{businessDay:21000})
  expect(f.steps[0].command.kind).toBe('package_stock_in')
  expect(f.steps[0].after.S11.stock).toBe(base.materials.find(m=>m.id==='S11').stock+100)
})

it('uses the batch business day instead of an action supplied day',()=>{
  const base=setup(),m=base.materials.find(row=>row.id==='S0')
  m.activeLotId='';m.zeroActiveIds=[];for(const id of m.lotIds)m.lots[id].isInUse=false
  const f=summaryInventoryBatch(base.shop,base.materials,[receive('S0',{businessDay:999999})],{businessDay:21000})
  expect(f.steps[0].after.S0.lastStockInDay).toBe(21000)
})

it('delegates empty packaging history to the ordinary stock-in planner',()=>{
  const base=setup(),m=base.materials.find(row=>row.inventoryType==='packaging')
  m.stock=0;m.lotIds=[];m.allocationIds=[];m.slotIds=['_','_','_','_'];m.activeLotId='';m.lotQty={_:0};m.zeroActiveIds=[]
  m.lots={_:{id:'_',qty:0,isInUse:false,expiryDay:999999,receiveDay:999999,ordinal:999999}}
  const f=summaryInventoryBatch(base.shop,base.materials,[receive(m.id,{qtyQ:100,unitCost:0.5,receiveDay:999999,expiryDay:999999,newLotId:'FIRST-PACK'})],{businessDay:21000})
  expect(f.steps[0].command.kind).toBe('stock_in')
  expect(f.steps[0].after[m.id].lotIds).toContain('FIRST-PACK')
})

it('can count or waste one specific lot and switch a selected lot',()=>{
  const base=setup(),m=base.materials[0],lot=m.lotIds[0],switchId='EXTRA-LOT'
  m.lotIds.push(switchId);m.lots[switchId]={...structuredClone(m.lots[lot]),id:switchId,qty:100,initialQtyQ:100,ordinal:m.lotIds.length-1,isInUse:false}
  m.lotQty[switchId]=100;m.stock+=100;m.allocationIds.push(switchId);m.slotIds=m.allocationIds.concat(Array(4-m.allocationIds.length).fill('_'))
  const actions=[
    {kind:'waste',materialId:m.id,lotId:lot,qtyQ:1,reason:'damaged'},
    {kind:'switch',materialId:m.id,lotId:switchId},
    {kind:'count',materialId:m.id,counts:m.lotIds.map(id=>({id,to:m.lotQty[id]})),note:'counted'},
  ]
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{businessDay:21000})
  expect(f.steps.map(s=>s.command.kind)).toEqual(['stock_count','switch_lot','stock_count'])
  expect(f.steps[0].after[m.id].stock).toBe(m.stock-1)
  expect(f.steps[1].after[m.id].activeLotId).toBe(switchId)
  expect(f.steps[2].before[m.id]).toEqual(f.steps[1].after[m.id])
})

it('keeps the action list and source materials unchanged on an error in a later step',()=>{
  const base=setup();base.materials[12].productionRecipe={inputIds:['S0','S1'],quantities:[999999999,999999999],yieldQ:1}
  const actions=[receive('S0'),{kind:'produce',materialId:'S12',input:{qtyQ:10000,lotId:'BATCH-LOT',receiveDay:21000,expiryDay:22000}}],before=structuredClone({base,actions})
  expect(()=>summaryInventoryBatch(base.shop,base.materials,actions)).toThrow()
  expect({base,actions}).toEqual(before)
})

it.each([
  ['empty actions',()=>[]],['too many actions',b=>Array.from({length:7},()=>receive('S0'))],
  ['too many unique materials',b=>b.materials.slice(0,7).map(m=>receive(m.id))],
  ['unknown material',()=>[receive('UNKNOWN')]],['unregistered material',b=>{b.shop.materialIds=b.shop.materialIds.filter(id=>id!=='S0');return[receive('S0')]}],
  ['deleted material',b=>{b.materials.find(m=>m.id==='S0').deleted=true;return[receive('S0')]}],
  ['unknown kind',()=>[{kind:'adjust',materialId:'S0'}]],['missing recipe',b=>{delete b.materials.find(m=>m.id==='S12').productionRecipe;return[{kind:'produce',materialId:'S12',input:{qtyQ:100,lotId:'X',receiveDay:1,expiryDay:2}}]}],
  ['missing receive quantity',()=>[{kind:'receive',materialId:'S0',input:{unitCost:1}}]],
  ['unsafe receive quantity',()=>[receive('S0',{qtyQ:Number.MAX_SAFE_INTEGER+1})]],
  ['long nested receive note',()=>[receive('S0',{note:'n'.repeat(1001)})]],
  ['missing production quantity',()=>[{kind:'produce',materialId:'S12',input:{lotId:'X',receiveDay:1,expiryDay:2}}]],
  ['unsafe production quantity',()=>[{kind:'produce',materialId:'S12',input:{qtyQ:Number.MAX_SAFE_INTEGER+1,lotId:'X',receiveDay:1,expiryDay:2}}]],
  ['long nested production note',()=>[{kind:'produce',materialId:'S12',input:{qtyQ:100,lotId:'X',receiveDay:1,expiryDay:2,note:'n'.repeat(1001)}}]],
  ['long count reason',b=>[{kind:'count',materialId:'S0',counts:[{id:b.materials[0].lotIds[0],to:b.materials[0].lotQty[b.materials[0].lotIds[0]]}],reason:'r'.repeat(201)}]],
  ['non-string waste note',b=>[{kind:'waste',materialId:'S0',lotId:b.materials[0].lotIds[0],qtyQ:1,note:2}]],
  ['unregistered recipe input',b=>{b.shop.materialIds=b.shop.materialIds.filter(id=>id!=='S0');return[{kind:'produce',materialId:'S12',input:{qtyQ:100,lotId:'X',receiveDay:1,expiryDay:2}}]}],
])('rejects invalid batch: %s',(_label,actionsFor)=>{
  const base=setup(),actions=actionsFor(base)
  expect(()=>summaryInventoryBatch(base.shop,base.materials,actions)).toThrow()
})

it('rejects a touched union larger than six even when there are six actions',()=>{
  const base=setup();base.materials[12].productionRecipe={inputIds:['S0','S1'],quantities:[1,1],yieldQ:1}
  const actions=[receive('S2'),receive('S3'),receive('S4'),receive('S5'),receive('S6'),{kind:'produce',materialId:'S12',input:{qtyQ:100,lotId:'X',receiveDay:1,expiryDay:2}}]
  expect(()=>summaryInventoryBatch(base.shop,base.materials,actions)).toThrow()
})

it('rejects staged snapshots above conservative byte limits',()=>{
  const base=setup();base.materials[0].plannerPayload='x'.repeat(401000)
  expect(()=>summaryInventoryBatch(base.shop,base.materials,[receive('S0')])).toThrow()
})

it('accepts six ordered actions on one material and freezes one final material revision',()=>{
  const base=setup(),m=base.materials[0],action=count(base,m.id),actions=Array.from({length:6},()=>action)
  const f=summaryInventoryBatch(base.shop,base.materials,actions,{businessDay:21000})
  expect(f.steps).toHaveLength(6)
  expect(f.steps[5].before[m.id]).toEqual(f.steps[4].after[m.id])
  expect(f.nextMaterials).toHaveLength(1)
  expect(f.nextMaterials[0].revision).toBe(m.revision+1)
})

it.each([
  ['stock above bound',m=>{m.stock=1000000001}],
  ['cost above bound',m=>{m.unitCost=100000.01}],
  ['lot history above bound',m=>{m.lotIds=Array.from({length:1001},(_,i)=>`L${i}`)}],
])('rejects an initial touched snapshot with %s',(_label,mutate)=>{
  const base=setup(),m=base.materials[0];mutate(m)
  expect(()=>summaryInventoryBatch(base.shop,base.materials,[{kind:'switch',materialId:m.id,lotId:m.lotIds[0]}])).toThrow()
})
