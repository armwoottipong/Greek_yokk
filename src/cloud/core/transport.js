import {applyCatalogDisplay} from './catalogPlan.js'
import {doc,collection,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp} from 'firebase/firestore'
import {summaryMultiGroupSale} from './model/saleGroups.js'
import {summaryCancel} from './model/cancel.js'
import {planInventoryCommand} from './inventoryPlan.js'
import {commitMetrics} from './model/metrics.js'
const fail=code=>Object.assign(new Error(code),{code})
const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v)
const equal=(a,b)=>canonical(a)===canonical(b)
export function createCoreTransport({db,getContext}){
 function scope(){const s={...getContext()};guard(s);return s}
 function guard(s){const c=getContext();if(!c||['projectId','shopId','generation','uid','deviceId'].some(k=>!s[k]||s[k]!==c[k]))throw fail('CONTEXT_CHANGED');if(!c.online)throw fail('OFFLINE');if(!c.ready)throw fail('NOT_READY')}
 const root=s=>`shops/${s.shopId}`,gen=s=>`${root(s)}/generations/${s.generation}`
 function admit(s,writes){const m=commitMetrics(`projects/${s.projectId}/databases/(default)`,writes);if(m.violations.length||m.maxDocumentBytes>800000||m.wireBytes>8*1024*1024)throw fail('DATA_SIZE_LIMIT')}
 function checkRoot(s,data){guard(s);if(data?.status!=='active'||data.generation!==s.generation)throw fail('SHOP_NOT_READY')}
 async function snapshot(){
  const s=scope()
  for(let attempt=0;attempt<3;attempt++){
   const a=await getDocFromServer(doc(db,root(s)));checkRoot(s,a.data())
   const rows=await getDocsFromServer(collection(db,`${gen(s)}/materials`));guard(s)
   const b=await getDocFromServer(doc(db,root(s)));checkRoot(s,b.data())
   if(a.data().revision!==b.data().revision)continue
   return {shop:b.data(),materials:rows.docs.map(d=>d.data())}
  }
  throw fail('SHOP_BUSY')
 }
 function plan(s,command,shop,materials,order){
  const p=command.payload||{},options={opId:command.opId,uid:s.uid}
  if(command.kind==='sale'){
   const f=summaryMultiGroupSale(shop,materials,p.lines,{...options,platformId:p.platformId})
   const shortages=Object.fromEntries(Object.entries(f.order.approvedShortages).filter(([,q])=>q>0))
   if(!equal(shortages,p.approvedShortages||{}))throw fail('SHORTAGE_REVIEW_REQUIRED')
   if(p.subtotalCents!==undefined&&p.subtotalCents!==f.order.subtotalCents)throw fail('PRICE_REVIEW_REQUIRED')
   return {f,receipt:f.order,materials:f.nextMaterials,order:f.order}
  }
  if(command.kind==='cancel'){
   const f=summaryCancel(shop,materials,order,options)
   return {f,receipt:f.operation,materials:f.nextMaterials,order:f.nextOrder}
  }
  const f=planInventoryCommand(shop,materials,command,s.uid)
  return {f,receipt:f.operation,materials:f.nextMaterials}
 }
 const collectionFor=kind=>kind==='sale'?'orders':'operations'
 function checkReceipt(s,command,r){
  const kinds={menu:['menu'],addon:['addon','catalog'],group:['group'],sale:['sale_set'],cancel:['cancel'],receive:['stock_in','package_stock_in'],produce:['produce'],inventory:['stock_in','package_stock_in'],...Object.fromEntries(['history_clear','stock_count','switch_lot','material_create','material_archive','material_delete','material_metadata','material_measure','material_details','material_type','production_recipe'].map(k=>[k,[k]]))}
  if(r.opId!==command.opId||r.uid!==s.uid||!kinds[command.kind]?.includes(r.kind))throw fail('COMMAND_ID_COLLISION')
  const p=command.payload
  if(p){
   if(['menu','addon','group'].includes(command.kind)&&(!equal(r.input,p.input)||!equal(r.display,p.display)||r.entityId!==(command.kind==='addon'?p.entityId:p.input.id)))throw fail('COMMAND_ID_COLLISION')
   if(command.kind==='cancel'&&r.orderId!==p.orderId)throw fail('COMMAND_ID_COLLISION')
   if(['inventory','receive','produce'].includes(command.kind)){
    if((r.materialId||r.outputId)!==p.materialId)throw fail('COMMAND_ID_COLLISION')
    for(const [k,v] of Object.entries(p.input||{}))if(Object.hasOwn(r,k)&&!equal(r[k],v))throw fail('COMMAND_ID_COLLISION')
   }
   if(p.expectedRevision!==undefined&&r.shopRevision!==p.expectedRevision+1)throw fail('COMMAND_ID_COLLISION')
   if(command.kind==='stock_count'){
    if(!Array.isArray(p.requests)||p.requests.length!==r.rows.length)throw fail('COMMAND_ID_COLLISION')
    p.requests.forEach((q,i)=>{const row=r.rows[i],counts=q.counts?.map(c=>({id:c.id,to:c.to})),saved=row.counts.map(c=>({id:c.id,to:c.to}))
     if(q.materialId!==row.materialId||(q.mode||'count')!==row.mode||(q.reason||'')!==row.reason||(q.note||'')!==row.note||(q.requestedQ||0)!==row.requestedQ||!equal(counts,saved))throw fail('COMMAND_ID_COLLISION')
    })
   }
   if(command.kind==='material_create'){
    const input=Object.fromEntries(['id','name','emoji','unit','inventoryType','packSize','minAlertQ'].map(key=>[key,r.materialSnapshot[key]]))
    if(!equal(input,p.input))throw fail('COMMAND_ID_COLLISION')
   }
   if(command.kind==='history_clear'&&r.clearedThroughRevision!==r.shopRevision)throw fail('COMMAND_ID_COLLISION')
   if(command.kind==='material_delete'&&r.materialId!==p.materialId)throw fail('COMMAND_ID_COLLISION')
   if(['switch_lot','material_archive','material_metadata','material_measure','material_details','material_type','production_recipe'].includes(command.kind)){
    if((r.materialId||r.targetId)!==p.materialId)throw fail('COMMAND_ID_COLLISION')
    const key={switch_lot:'lotId',material_archive:'deleted',material_metadata:'metadata',material_measure:'measure',material_details:'details',material_type:'inventoryType',production_recipe:'recipe'}[command.kind]
    if(!equal(r[key],p[key]))throw fail('COMMAND_ID_COLLISION')
   }
   if(command.kind==='sale'){
    if(r.platformId!==p.platformId||r.lines.length!==p.lines.length)throw fail('COMMAND_ID_COLLISION')
    p.lines.forEach((l,i)=>{const saved=r.lines[i];if(l.menuId!==saved.menuId||l.qty!==saved.qty||(l.note||'')!==saved.note)throw fail('COMMAND_ID_COLLISION')
     if(l.selections){const groups={};for(const choice of l.selections){groups[choice.groupId]??={_:0};groups[choice.groupId][choice.id]=choice.selectionQty??1}for(const id of Object.keys(saved.groupSelections))if(!equal(groups[id]||{_:0},saved.groupSelections[id]))throw fail('COMMAND_ID_COLLISION')}
     else{const quantities={_:0};for(const id of l.optionIds||[])quantities[id]=(quantities[id]||0)+1;if(!equal(quantities,saved.optionQuantities))throw fail('COMMAND_ID_COLLISION')}
    })
   }
  }
  return r
 }
 async function receipt(kind,opId){const s=scope(),d=await getDocFromServer(doc(db,`${gen(s)}/${collectionFor(kind)}/${opId}`));guard(s);return d.exists()?checkReceipt(s,{kind,opId},d.data()):null}
 async function prepareSale(s,f){
  const id=f.order.opId,manifestPath=`${gen(s)}/preparations/sale_${id}`
  const descriptor={kind:'sale_set',opId:id,uid:s.uid,proofCount:f.order.lineWitnessCount,stepCount:0,materialCount:0}
  await runTransaction(db,async t=>{
   guard(s);const shop=await t.get(doc(db,root(s)));checkRoot(s,shop.data())
   const m=await t.get(doc(db,manifestPath));guard(s)
   if(m.exists()){if(m.data().state!=='open'||Object.entries(descriptor).some(([k,v])=>m.data()[k]!==v))throw fail('PREPARATION_CLOSED');return}
   const data={...descriptor,state:'open',createdAt:serverTimestamp(),lifetimeDays:7};admit(s,[{path:manifestPath,data}]);t.set(doc(db,manifestPath),data)
  })
  for(let i=0;i<f.order.lineWitnessCount;i++){
   const lines=f.order.lines.slice(i*2,i*2+2),path=`${gen(s)}/preparedSales/${id}/lineProofs/${i}`
   for(let count=1;count<=lines.length;count++)await runTransaction(db,async t=>{
    guard(s);const shop=await t.get(doc(db,root(s)));checkRoot(s,shop.data())
    const before=await t.get(doc(db,path));guard(s)
    const data={opId:id,index:i,uid:s.uid,catalogRevision:f.shop.catalogRevision,platformId:f.order.platformId,addonKeys:f.order.addonKeys,lines:lines.slice(0,count)}
    if(before.exists()){
     const saved=before.data()
     if(equal(saved,data))return
     if(saved.lines.length>count&&equal({...saved,lines:saved.lines.slice(0,count)},data))return
     if(saved.uid!==s.uid||saved.opId!==id||saved.catalogRevision!==data.catalogRevision||saved.platformId!==data.platformId)throw fail('COMMAND_ID_COLLISION')
    }
    admit(s,[{path,data}]);t.set(doc(db,path),data)
   })
  }
 }
 async function commit(command){
  const s=scope()
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(command.opId||''))throw fail('INVALID_COMMAND_ID')
  const saved=await receipt(command.kind,command.opId);if(saved)return checkReceipt(s,command,saved)
  const initial=await snapshot();guard(s)
  if(command.kind==='sale')await prepareSale(s,plan(s,command,initial.shop,initial.materials).f)
  let attemptedRevision,result
  for(let attempt=0;attempt<3;attempt++)try{
   result=await runTransaction(db,async t=>{
   guard(s);const shopDoc=await t.get(doc(db,root(s)));checkRoot(s,shopDoc.data())
   const receiptRef=doc(db,`${gen(s)}/${collectionFor(command.kind)}/${command.opId}`),existing=await t.get(receiptRef)
   if(existing.exists())return checkReceipt(s,command,existing.data())
   const shop=shopDoc.data(),ids=shop.materialIds||shop.catalog.summaryMaterials,materials=[]
   attemptedRevision=shop.revision
   for(const id of ids){const m=await t.get(doc(db,`${gen(s)}/materials/${id}`));if(!m.exists())throw fail('INCOMPLETE_INVENTORY');materials.push(m.data())}
   let oldOrder
   if(command.kind==='cancel'){const o=await t.get(doc(db,`${gen(s)}/orders/${command.payload.orderId}`));if(!o.exists())throw fail('ORDER_NOT_FOUND');oldOrder=o.data()}
   let display
   if(['menu','addon','group'].includes(command.kind)){const d=await t.get(doc(db,`${gen(s)}/display/catalog`));if(!d.exists())throw fail('INCOMPLETE_CATALOG_DISPLAY');display=d.data()}
   guard(s);const p=plan(s,command,shop,materials,oldOrder)
   const writes=[{path:root(s),data:p.f.nextShop},{path:receiptRef.path,data:p.receipt},...p.materials.map(m=>({path:`${gen(s)}/materials/${m.id}`,data:m}))]
   if(p.f.displayChange)writes.push({path:`${gen(s)}/display/catalog`,data:applyCatalogDisplay(display,p.f.displayChange)})
   if(p.f.inputProof)writes.push({path:`${gen(s)}/operations/${command.opId}/referenceProofs/input`,data:p.f.inputProof})
   if(p.f.shapeProof)writes.push({path:`${gen(s)}/operations/${command.opId}/referenceProofs/shape`,data:p.f.shapeProof})
   if(p.f.referenceProof)writes.push({path:`${gen(s)}/operations/${command.opId}/referenceProofs/0`,data:p.f.referenceProof})
   if(command.kind==='cancel')writes.push({path:`${gen(s)}/orders/${command.payload.orderId}`,data:p.order})
   // An empty set is a conservative admission bound for the smaller delete wire.
   for(const id of p.f.removedMaterialIds||[])writes.push({path:`${gen(s)}/materials/${id}`,data:{},remove:true})
   admit(s,writes);for(const w of writes)if(w.remove)t.delete(doc(db,w.path));else t.set(doc(db,w.path),w.data)
   return p.receipt
   });break
  }catch(error){
   // A concurrent root update may invalidate Rules' getAfter view before the
   // SDK receives an ABORTED response. Retry only this same immutable command,
   // only after proving the root actually advanced. Never queue in the background.
   if(attempt===2||!['permission-denied','aborted'].includes(error.code))throw error
   const fresh=await snapshot();guard(s)
   if(fresh.shop.revision===attemptedRevision)throw error
  }
  guard(s)
  // Always return the persisted server receipt, including resolved timestamps.
  return await receipt(command.kind,result.opId)
 }
 async function rejectStaleInventory(command){
  const s=scope(),expected=command.payload?.expectedRevision
  const kinds=['menu','addon','group','inventory','receive','produce','history_clear','stock_count','switch_lot','material_create','material_archive','material_delete','material_metadata','material_measure','material_details','material_type','production_recipe']
  if(!kinds.includes(command.kind)||!Number.isSafeInteger(expected)||expected<0)throw fail('STALE_NOT_PROVEN')
  // Read the advanced root first. Once observed it fences this immutable draft;
  // a subsequent server receipt read also catches commits completed before it.
  const fresh=await snapshot();guard(s)
  if(fresh.shop.revision<=expected)throw fail('STALE_NOT_PROVEN')
  const saved=await receipt(command.kind,command.opId);guard(s)
  if(saved)return {receipt:checkReceipt(s,command,saved)}
  return {rejected:true,code:'STALE_INVENTORY_DRAFT'}
 }
 async function abandonSale(command){
  const s=scope(),saved=await receipt('sale',command.opId);if(saved)return {receipt:checkReceipt(s,command,saved)}
  const initial=await snapshot(),f=summaryMultiGroupSale(initial.shop,initial.materials,command.payload.lines,{opId:command.opId,uid:s.uid,platformId:command.payload.platformId})
  // Establish the same manifest before closing it, fencing late sale attempts.
  const path=`${gen(s)}/preparations/sale_${command.opId}`,ref=doc(db,path)
  await runTransaction(db,async t=>{guard(s);const m=await t.get(ref);if(m.exists())return;t.set(ref,{kind:'sale_set',opId:command.opId,uid:s.uid,proofCount:f.order.lineWitnessCount,stepCount:0,materialCount:0,state:'open',createdAt:serverTimestamp(),lifetimeDays:7})})
  return runTransaction(db,async t=>{
   guard(s);const r=await t.get(doc(db,`${gen(s)}/orders/${command.opId}`)),m=await t.get(ref)
   if(r.exists())return {receipt:checkReceipt(s,command,r.data())}
   if(m.data().uid!==s.uid)throw fail('COMMAND_ID_COLLISION')
   if(m.data().state==='abandoned')return {abandoned:true}
   if(m.data().state!=='open')throw fail('PREPARATION_CLOSED')
   guard(s);t.update(ref,{state:'abandoned',closedAt:serverTimestamp()})
   for(let i=0;i<m.data().proofCount;i++)t.delete(doc(db,`${gen(s)}/preparedSales/${command.opId}/lineProofs/${i}`))
   return {abandoned:true}
  })
 }
 return {snapshot,commit,receipt,abandonSale,rejectStaleInventory}
}
