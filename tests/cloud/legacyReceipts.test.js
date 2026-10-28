// @vitest-environment node
import {it,expect} from 'vitest'
import {planLegacyReceipts} from '../../scripts/legacy-receipts.js'
import {encodeLegacyId as key} from '../../src/cloud/paths.js'
import {summaryCancel} from '../../src/cloud/core/model/cancel.js'
const fixture=()=>{
 const materials=Array.from({length:16},(_,i)=>({id:key(`M${i}`),legacyId:`M${i}`,inventoryType:i===1?'packaging':'ingredient',costRank:i,revision:4,stock:100,lotIds:[key(`L${i}`)],lotQty:{_:0,[key(`L${i}`)]:100},lots:{[key(`L${i}`)]:{id:key(`L${i}`),qty:100,ordinal:0,sortKey:1,receiveDay:20000,expiryDay:21000}},allocationIds:[key(`L${i}`)],slotIds:[key(`L${i}`),'_','_','_'],activeLotId:key(`L${i}`),zeroActiveIds:[]}))
 const shop={revision:7,materialIds:materials.map(m=>m.id),catalog:{summaryMaterials:materials.map(m=>m.id)}}
 const order={orderId:'ORD-old',createdAt:'2026-10-20T00:00:00.000Z',platformId:'P',platformName:'Old shop',subtotal:69,discount:0,gpAmount:7,netRevenue:62,ingredientCost:3.01,packagingCost:2,foodCost:5.01,grossProfit:56.99,expectedPackagingShortageCost:0,items:[{menuId:'MENU-old',menuName:'Old name',qty:1,unitPrice:69,totalPrice:69,recipe:[{materialId:'M0',qty:2},{materialId:'M1',qty:1}],selectedAddons:[]}],packagePlan:[{materialId:'M1',requestedQty:1,fulfilledQty:1,shortageQty:0,fulfilledCost:2,expectedShortageCost:0}],inventoryAllocations:[{materialId:'M0',lotId:'L0',qty:2,inventoryType:'ingredient'},{materialId:'M1',lotId:'L1',qty:1,inventoryType:'packaging'}],stockShortages:[]}
 const archive=o=>({id:'orders_0',data:{kind:'orders',index:0,json:JSON.stringify(o)}})
 return {shop,materials,order,archive}
}
const plan=(f,order=f.order,extra={})=>planLegacyReceipts({...f,legacyRecords:[f.archive(order)],...extra})
it('preserves exact historical evidence, pads 16 cancel rows and never changes stock',()=>{
 const f=fixture(),before=structuredClone({shop:f.shop,materials:f.materials}),p=plan(f)
 expect(p.blocked).toEqual([]);expect(p.orders).toHaveLength(1)
 const r=p.orders[0].data
 expect(r.sourceLegacyId).toBe('ORD-old');expect(r.sourceLegacyRecordId).toBe('orders_0');expect(r.sourceLegacyJson).toBe(JSON.stringify(f.order));expect(r.sourceSha256).toMatch(/^[a-f0-9]{64}$/)
 expect(r.lines[0].catalog.name).toBe('Old name');expect(r.lines[0].sourceItem).toEqual(f.order.items[0]);expect(r.ingredientCostCents).toBe(301);expect(r.grossProfitCents).toBe(5699)
 expect(r.inventory).toHaveLength(16);expect(r.inventory[0]).toMatchObject({take:200,lotIds:[key('L0')],lotTakes:[200,0,0,0]});expect(r.inventory[2]).toMatchObject({take:0,lotIds:[],lotTakes:[0,0,0,0]})
 expect(p.rootPatch.returnMaterials).toEqual(Object.fromEntries(r.materialIds.map(id=>[id,true])))
 expect(f.shop).toEqual(before.shop);expect(f.materials).toEqual(before.materials)
 const cancelled=summaryCancel(f.shop,f.materials,r)
 expect(cancelled.nextMaterials[0].stock).toBe(300);expect(cancelled.nextMaterials[1].stock).toBe(200)
})
it('retains cancelled history and refuses a second cancellation',()=>{
 const f=fixture(),p=plan(f,{...f.order,status:'cancelled',cancelledAt:'2026-10-21T00:00:00.000Z'}),r=p.orders[0].data
 expect(r.status).toBe('cancelled');expect(r.cancelledAt.toDate().toISOString()).toBe('2026-10-21T00:00:00.000Z');expect(()=>summaryCancel(f.shop,f.materials,r)).toThrow('already cancelled')
})
it('has stable ids, reruns idempotently, and blocks existing conflicting history',()=>{
 const f=fixture(),first=plan(f),same=plan(f,f.order,{existingOrders:first.orders})
 expect(same.orders).toEqual([]);expect(same.blocked).toEqual([]);expect(same.skipped).toEqual([first.orders[0].id])
 const changed={...f.order,note:'source changed'}
 expect(plan(f,changed,{existingOrders:first.orders}).blocked[0].code).toBe('LEGACY_RECEIPT_COLLISION')
})
it('does not trust source hashes when existing canonical allocations were changed',()=>{
 const f=fixture(),existing=plan(f).orders
 existing[0].data.inventory[0].take++
 expect(plan(f,f.order,{existingOrders:existing}).blocked[0].code).toBe('LEGACY_RECEIPT_COLLISION')
})
it('preserves a later native cancellation when rerun against the unchanged archive',()=>{
 const f=fixture(),existing=plan(f).orders
 existing[0].data.status='cancelled';existing[0].data.cancelOpId='later';existing[0].data.cancelledAt=existing[0].data.createdAt
 const result=plan(f,f.order,{existingOrders:existing})
 expect(result.blocked).toEqual([]);expect(result.orders).toEqual([]);expect(result.skipped).toHaveLength(1)
})
it('rejects every duplicate receipt rather than selecting the first archive',()=>{
 const f=fixture(),archive=f.archive(f.order),other={id:'orders_1',data:{...archive.data,index:1}}
 const p=planLegacyReceipts({...f,legacyRecords:[archive,other]})
 expect(p.orders).toEqual([]);expect(p.blocked).toHaveLength(2)
})
it('accepts explicit confirmed shortages but returns only actual deductions',()=>{
 const f=fixture();f.order.inventoryAllocations[0].qty=1;f.order.stockShortages=[{materialId:'M0',inventoryType:'ingredient',qty:1}]
 const p=plan(f);expect(p.blocked).toEqual([])
 expect(p.orders[0].data.inventory[0]).toMatchObject({needed:200,take:100,shortage:100,lotTakes:[100,0,0,0]})
})
it('supports the original 15-row cancellation guard profile',()=>{
 const f=fixture();f.materials.pop();f.shop.materialIds.pop();f.shop.catalog.summaryMaterials.pop()
 const p=plan(f);expect(p.blocked).toEqual([]);expect(p.orders[0].data.inventory).toHaveLength(15)
})
it('preserves four exact original lots and blocks an unsupported fifth returned lot',()=>{
 const f=fixture(),m=f.materials[0],base=structuredClone(m.lots[key('L0')])
 for(let i=1;i<5;i++){const id=key(`L0-${i}`);m.lotIds.push(id);m.lotQty[id]=0;m.lots[id]={...base,id,ordinal:i}}
 f.order.inventoryAllocations=[...Array.from({length:4},(_,i)=>({materialId:'M0',lotId:i?`L0-${i}`:'L0',qty:0.5,inventoryType:'ingredient'})),f.order.inventoryAllocations[1]]
 const p=plan(f);expect(p.blocked).toEqual([]);expect(p.orders[0].data.inventory[0].lotTakes).toEqual([50,50,50,50])
 f.order.inventoryAllocations[0].qty=0.4;f.order.inventoryAllocations.push({materialId:'M0',lotId:'L0-4',qty:0.1,inventoryType:'ingredient'})
 expect(plan(f).blocked[0].code).toBe('LEGACY_LOT_LIMIT')
})
it.each([
 ['missing original lot',f=>{delete f.materials[0].lotQty[key('L0')]},'LEGACY_LOT_MISSING'],
 ['mismatched material provenance',f=>{f.materials[0].legacyId='other'},'LEGACY_MATERIAL_MISSING'],
 ['invented allocation',f=>{f.order.inventoryAllocations[0].qty=3},'LEGACY_ALLOCATION_MISMATCH'],
 ['missing allocation',f=>{delete f.order.inventoryAllocations},'LEGACY_ALLOCATION_REQUIRED'],
 ['unknown stock material',f=>{f.order.inventoryAllocations[0].materialId='absent'},'LEGACY_MATERIAL_MISSING'],
 ['negative allocation',f=>{f.order.inventoryAllocations[0].qty=-1},'LEGACY_INVALID_NUMBER'],
 ['precision loss',f=>{f.order.inventoryAllocations[0].qty=2.001},'LEGACY_INVALID_NUMBER'],
 ['missing historical recipe',f=>{delete f.order.items[0].recipe},'LEGACY_RECIPE_REQUIRED'],
 ['changed historical prices',f=>{f.order.items[0].unitPrice=68},'LEGACY_FINANCIAL_MISMATCH'],
 ['changed financial totals',f=>{f.order.grossProfit=90},'LEGACY_FINANCIAL_MISMATCH'],
 ['ambiguous package evidence',f=>{f.order.packagePlan[0].fulfilledQty=0},'LEGACY_PACKAGE_MISMATCH'],
 ['unknown status',f=>{f.order.status='pending'},'LEGACY_STATUS_INVALID'],
])('blocks %s without partial rows',(_label,alter,code)=>{const f=fixture();alter(f);const p=plan(f);expect(p.orders).toEqual([]);expect(p.blocked[0]).toMatchObject({sourceLegacyRecordId:'orders_0',code})})
