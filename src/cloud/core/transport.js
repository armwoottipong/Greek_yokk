import {doc,collection,getDocFromServer,getDocsFromServer,runTransaction,serverTimestamp} from 'firebase/firestore'
import {summaryMultiGroupSale} from './model/saleGroups.js'
import {summaryCancel} from './model/cancel.js'
import {summaryStock} from './model/stock.js'
import {summaryPackageStock} from './model/packageStock.js'
import {summaryProduce} from './model/produce.js'
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
  if(command.kind==='receive'){
   const m=materials.find(m=>m.id===p.materialId);if(!m)throw fail('MATERIAL_NOT_FOUND')
   const f=(m.inventoryType==='packaging'?summaryPackageStock:summaryStock)(shop,m,{...p.input,...options})
   return {f,receipt:f.operation,materials:[f.next]}
  }
  if(command.kind==='produce'){
   const f=summaryProduce(shop,materials,p.materialId,{...p.input,...options})
   return {f,receipt:f.operation,materials:[...f.nextInputs,f.nextOutput]}
  }
  throw fail('UNKNOWN_COMMAND')
 }
 const collectionFor=kind=>kind==='sale'?'orders':'operations'
 function checkReceipt(s,command,r){
  const kinds={sale:['sale_set'],cancel:['cancel'],receive:['stock_in','package_stock_in'],produce:['produce']}
  if(r.opId!==command.opId||r.uid!==s.uid||!kinds[command.kind]?.includes(r.kind))throw fail('COMMAND_ID_COLLISION')
  const p=command.payload
  if(p){
   if(command.kind==='cancel'&&r.orderId!==p.orderId)throw fail('COMMAND_ID_COLLISION')
   if(['receive','produce'].includes(command.kind)){
    if((r.materialId||r.outputId)!==p.materialId)throw fail('COMMAND_ID_COLLISION')
    for(const [k,v] of Object.entries(p.input))if(Object.hasOwn(r,k)&&!equal(r[k],v))throw fail('COMMAND_ID_COLLISION')
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
   guard(s);const p=plan(s,command,shop,materials,oldOrder)
   const writes=[{path:root(s),data:p.f.nextShop},{path:receiptRef.path,data:p.receipt},...p.materials.map(m=>({path:`${gen(s)}/materials/${m.id}`,data:m}))]
   if(command.kind==='cancel')writes.push({path:`${gen(s)}/orders/${command.payload.orderId}`,data:p.order})
   admit(s,writes);for(const w of writes)t.set(doc(db,w.path),w.data)
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
 return {snapshot,commit,receipt,abandonSale}
}
