// Trusted, offline owner migration only. This does not connect to Firebase or
// change stock. Preserve the archive; native history must deduplicate this copy.
import {createHash} from 'node:crypto'
import {isDeepStrictEqual} from 'node:util'
import {Timestamp} from 'firebase/firestore'
import {encodeLegacyId as key} from '../src/cloud/paths.js'
import {toScaledExact} from '../src/cloud/conversion.js'
import {summaryCancel} from '../src/cloud/core/model/cancel.js'
const fail=(code,path,detail)=>{throw Object.assign(new Error(code),{code,path,...(detail?{detail}:{})})}
const hash=text=>createHash('sha256').update(text,'utf8').digest('hex')
const map=v=>v&&Object.getPrototypeOf(v)===Object.prototype
const q=(v,path,{signed=false}={})=>{const n=toScaledExact(v,100);if(!n.ok||!signed&&n.value<0||Math.abs(n.value)>1e9)fail('LEGACY_INVALID_NUMBER',path);return n.value}
const count=(v,path)=>{if(!Number.isSafeInteger(v)||v<1||v>1000000)fail('LEGACY_INVALID_NUMBER',path);return v}
const text=(v,path)=>{if(typeof v!=='string'||!v)fail('LEGACY_INVALID_DATA',path);return v}
const timestamp=(v,path)=>{if(typeof v!=='string'||!Number.isFinite(Date.parse(v)))fail('LEGACY_INVALID_DATE',path);return Timestamp.fromDate(new Date(v))}
const rows=(v,path,code='LEGACY_INVALID_DATA')=>{if(!Array.isArray(v))fail(code,path);return v}

function convert(record,{shop,materials}){
 const archive=record.data??record
 if(archive.kind!=='orders'||!/^orders_(0|[1-9]\d*)$/.test(record.id)||archive.index!==Number(record.id.slice(7))||typeof archive.json!=='string')fail('LEGACY_ARCHIVE_INVALID','archive')
 let o;try{o=JSON.parse(archive.json)}catch{fail('LEGACY_ARCHIVE_INVALID','json')}
 if(!map(o))fail('LEGACY_ARCHIVE_INVALID','json')
 const sourceLegacyId=text(o.orderId,'orderId'),opId=`LEGACY-${hash(sourceLegacyId)}`
 const byId=new Map(materials.map(m=>[m.id,m]))
 const material=(legacyId,path)=>{
  const id=key(text(legacyId,path)),m=byId.get(id)
  if(!m||m.legacyId!==legacyId||!shop.materialIds.includes(id))fail('LEGACY_MATERIAL_MISSING',path,legacyId)
  return m
 }
 const status=o.status??'committed'
 if(!['committed','cancelled'].includes(status))fail('LEGACY_STATUS_INVALID','status')
 const need=new Map(),take=new Map(),lots=new Map(),short=new Map(),packages=new Map()
 const add=(target,id,n)=>{const sum=(target.get(id)||0)+n;if(!Number.isSafeInteger(sum)||sum>1e9)fail('LEGACY_INVALID_NUMBER',id);target.set(id,sum)}
 const items=rows(o.items,'items')
 if(!items.length)fail('LEGACY_INVALID_DATA','items')
 const lines=items.map((item,i)=>{
  const at=`items[${i}]`,qty=count(item.qty,`${at}.qty`),totalCents=q(item.totalPrice,`${at}.totalPrice`)
  if(q(item.unitPrice,`${at}.unitPrice`)*qty!==totalCents)fail('LEGACY_FINANCIAL_MISMATCH',at)
  const addons=rows(item.selectedAddons,`${at}.selectedAddons`)
  const expand=(source,mult,path)=>{
   for(const [j,r] of rows(source.recipe,`${path}.recipe`,'LEGACY_RECIPE_REQUIRED').entries()){
    const m=material(r.materialId,`${path}.recipe[${j}].materialId`),amount=q(r.qty,`${path}.recipe[${j}].qty`)*mult
    // Packaging requests/adjustments are recorded by the immutable packagePlan.
    if(m.inventoryType==='ingredient')add(need,m.id,amount)
   }
  }
  expand(item,qty,at)
  const optionIds=[],optionQuantities={_:0}
  for(const [j,a] of addons.entries()){
   const n=count(a.selectionQty??1,`${at}.selectedAddons[${j}].selectionQty`),id=key(text(a.id,`${at}.selectedAddons[${j}].id`))
   if(optionIds.includes(id))fail('LEGACY_INVALID_DATA',`${at}.selectedAddons`, 'Duplicate historical addon')
   optionIds.push(id);optionQuantities[id]=n;expand(a,qty*n,`${at}.selectedAddons[${j}]`)
  }
  return {menuId:key(text(item.menuId,`${at}.menuId`)),qty,totalCents,note:item.note||'',optionIds,optionQuantities,catalog:{name:text(item.menuName,`${at}.menuName`)},sourceItem:structuredClone(item)}
 })
 for(const [i,p] of rows(o.packagePlan,'packagePlan').entries()){
  const at=`packagePlan[${i}]`,m=material(p.materialId,`${at}.materialId`)
  if(m.inventoryType!=='packaging'||packages.has(m.id))fail('LEGACY_PACKAGE_MISMATCH',at)
  const requested=q(p.requestedQty,`${at}.requestedQty`),fulfilled=q(p.fulfilledQty,`${at}.fulfilledQty`),missing=q(p.shortageQty,`${at}.shortageQty`)
  if(requested!==fulfilled+missing)fail('LEGACY_PACKAGE_MISMATCH',at)
  packages.set(m.id,{fulfilled,missing});add(need,m.id,requested)
 }
 for(const [i,a] of rows(o.inventoryAllocations,'inventoryAllocations','LEGACY_ALLOCATION_REQUIRED').entries()){
  const at=`inventoryAllocations[${i}]`,m=material(a.materialId,`${at}.materialId`),lotId=key(text(a.lotId,`${at}.lotId`)),amount=q(a.qty,`${at}.qty`)
  if(!amount)fail('LEGACY_INVALID_NUMBER',`${at}.qty`)
  if(m.inventoryType!==a.inventoryType)fail('LEGACY_ALLOCATION_MISMATCH',`${at}.inventoryType`)
  if(!m.lotIds.includes(lotId)||!Object.hasOwn(m.lotQty,lotId)||!m.lots[lotId])fail('LEGACY_LOT_MISSING',`${at}.lotId`,a.lotId)
  add(take,m.id,amount)
  if(!lots.has(m.id))lots.set(m.id,new Map())
  add(lots.get(m.id),lotId,amount)
  if(lots.get(m.id).size>4)fail('LEGACY_LOT_LIMIT',at)
 }
 for(const [i,s] of rows(o.stockShortages,'stockShortages').entries()){
  const at=`stockShortages[${i}]`,m=material(s.materialId,`${at}.materialId`)
  if(m.inventoryType!==s.inventoryType)fail('LEGACY_ALLOCATION_MISMATCH',at)
  add(short,m.id,q(s.qty,`${at}.qty`))
 }
 for(const id of new Set([...need.keys(),...take.keys(),...short.keys()])){
  if((need.get(id)||0)!==(take.get(id)||0)+(short.get(id)||0))fail('LEGACY_ALLOCATION_MISMATCH',id)
  const p=packages.get(id)
  if(p&&(p.fulfilled!==(take.get(id)||0)||p.missing!==(short.get(id)||0)))fail('LEGACY_PACKAGE_MISMATCH',id)
 }
 const money=Object.fromEntries(['subtotal','gpAmount','netRevenue','ingredientCost','packagingCost','foodCost','grossProfit','discount','expectedPackagingShortageCost'].map(k=>[k,q(o[k],k,{signed:k==='grossProfit'})]))
 if(money.discount!==0||lines.reduce((sum,l)=>sum+l.totalCents,0)!==money.subtotal||money.netRevenue!==money.subtotal-money.gpAmount||money.foodCost!==money.ingredientCost+money.packagingCost||money.grossProfit!==money.netRevenue-money.foodCost||o.packagePlan.reduce((sum,p)=>sum+q(p.fulfilledCost,'packagePlan.fulfilledCost'),0)!==money.packagingCost||o.packagePlan.reduce((sum,p)=>sum+q(p.expectedShortageCost,'packagePlan.expectedShortageCost'),0)!==money.expectedPackagingShortageCost)fail('LEGACY_FINANCIAL_MISMATCH','financials')
 const used=[...need.keys()],profile=shop.catalog.summaryMaterials
 const size=Math.max(profile.length,used.length)
 if(![15,16].includes(size))fail('LEGACY_MATERIAL_PROFILE','materialIds')
 for(const id of [...profile,...shop.materialIds])if(used.length<size&&!used.includes(id)&&byId.has(id))used.push(id)
 if(used.length!==size)fail('LEGACY_MATERIAL_PROFILE','materialIds')
 used.sort((a,b)=>byId.get(a).costRank-byId.get(b).costRank)
 const inventory=used.map(materialId=>{
  const alloc=lots.get(materialId)||new Map(),lotIds=[...alloc.keys()]
  return {materialId,needed:need.get(materialId)||0,take:take.get(materialId)||0,shortage:short.get(materialId)||0,lotIds,lotTakes:Array.from({length:4},(_,i)=>alloc.get(lotIds[i])||0)}
 })
 const data={schemaVersion:2,kind:'sale_set',origin:'legacy',status,opId,createdAt:timestamp(o.createdAt,'createdAt'),platformId:key(text(o.platformId,'platformId')),lines,materialIds:used,inventory,approvedShortages:Object.fromEntries(inventory.map(r=>[r.materialId,r.shortage])),subtotalCents:money.subtotal,gpCents:money.gpAmount,netCents:money.netRevenue,ingredientCostCents:money.ingredientCost,packagingCostCents:money.packagingCost,grossProfitCents:money.grossProfit,sourceLegacyId,sourceLegacyRecordId:record.id,sourceLegacyJson:archive.json,sourceSha256:hash(archive.json)}
 if(status==='cancelled')data.cancelledAt=timestamp(o.cancelledAt,'cancelledAt')
 else{
  for(const r of inventory){const m=byId.get(r.materialId);if(m.stock+r.take>1e9||r.lotIds.some((id,i)=>m.lotQty[id]+r.lotTakes[i]>1e9))fail('LEGACY_RETURN_RANGE',r.materialId)}
  try{summaryCancel(shop,materials,data)}catch(e){fail('LEGACY_CANCEL_UNSUPPORTED','inventory',e.message)}
 }
 return {id:opId,data}
}

export function planLegacyReceipts({shop,materials,legacyRecords,existingOrders=[]}){
 const orders=[],blocked=[],skipped=[],seen=new Map(),accepted=new Map(),existing=new Map(existingOrders.map(r=>[r.id,r.data]))
 for(const record of legacyRecords.filter(r=>(r.data??r).kind==='orders'||r.id?.startsWith('orders_'))){
  try{
   const row=convert(record,{shop,materials})
   if(seen.has(row.id)){
    const first=seen.get(row.id)
    if(!blocked.some(b=>b.sourceLegacyRecordId===first&&b.code==='LEGACY_DUPLICATE_RECEIPT'))blocked.push({sourceLegacyRecordId:first,code:'LEGACY_DUPLICATE_RECEIPT',path:'orderId'})
    const index=orders.findIndex(o=>o.id===row.id);if(index>=0)orders.splice(index,1)
    const skip=skipped.indexOf(row.id);if(skip>=0)skipped.splice(skip,1)
    accepted.delete(row.id);fail('LEGACY_DUPLICATE_RECEIPT','orderId')
   }
   seen.set(row.id,record.id)
   if(existing.has(row.id)){
    const before=existing.get(row.id)
    if(!['committed','cancelled'].includes(before.status)||row.data.status==='cancelled'&&before.status!=='cancelled'||Object.entries(row.data).some(([k,v])=>!['status','cancelledAt'].includes(k)&&!isDeepStrictEqual(before[k],v))||row.data.status==='cancelled'&&!isDeepStrictEqual(before.cancelledAt,row.data.cancelledAt))fail('LEGACY_RECEIPT_COLLISION',row.id)
    skipped.push(row.id)
   }else orders.push(row)
   accepted.set(row.id,row.data)
  }catch(e){blocked.push({sourceLegacyRecordId:record.id,code:e.code||'LEGACY_INVALID_DATA',path:e.path||'archive',...(e.detail?{detail:e.detail}:{})})}
 }
 const returnMaterials={...shop.returnMaterials}
 for(const receipt of accepted.values())for(const id of receipt.materialIds)returnMaterials[id]=true
 return {orders,blocked,skipped,rootPatch:{returnMaterials}}
}
