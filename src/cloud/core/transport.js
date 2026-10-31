import {applyCatalogDisplay} from './catalogPlan.js'
import {REVISION_COMMAND_KINDS} from './revisionCommands.js'
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
   const f=summaryMultiGroupSale(shop,materials,p.lines,{...options,platformId:p.platformId,packages:p.packages})
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
 const cacheChanged=(a,b)=>a.revision!==b.revision||!equal(a.billPreparations||{},b.billPreparations||{})||a.billPreparationId!==b.billPreparationId
 const collectionFor=kind=>kind==='sale'?'orders':'operations'
 function checkReceipt(s,command,r){
  if(r.kind==='command_abort'){
   if(r.opId!==command.opId||r.uid!==s.uid||r.sourceKind!==command.kind||command.payload?.expectedRevision!==undefined&&r.sourceRevision!==command.payload.expectedRevision)throw fail('COMMAND_ID_COLLISION')
   return r
  }
  const kinds={menu:['menu'],addon:['addon','catalog'],group:['group'],sale:['sale_set'],cancel:['cancel'],receive:['stock_in','package_stock_in'],produce:['produce'],inventory:['stock_in','package_stock_in'],...Object.fromEntries(['platform_gp','history_clear','stock_count','switch_lot','material_create','material_archive','material_delete','material_metadata','material_measure','material_details','material_type','production_recipe'].map(k=>[k,[k]]))}
  if(r.opId!==command.opId||r.uid!==s.uid||!kinds[command.kind]?.includes(r.kind))throw fail('COMMAND_ID_COLLISION')
  const p=command.payload
  if(p){
   if(command.kind==='platform_gp'&&!equal(r.rates,p.rates))throw fail('COMMAND_ID_COLLISION')
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
    if(!equal(r.billOperands?.packages||{},p.packages||{}))throw fail('COMMAND_ID_COLLISION')
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
    const data={opId:id,index:i,uid:s.uid,catalogRevision:f.shop.catalogRevision,platformId:f.order.platformId,addonKeys:f.order.addonKeys,materialIds:f.order.materialIds,billOperands:f.order.billOperands,lines:lines.slice(0,count),coverageCount:0}
    if(before.exists()){
     const saved=before.data(),savedShape={...saved};delete savedShape.coverageCount
     const shape={...data};delete shape.coverageCount
     if(saved.lines.length>=count&&equal({...savedShape,lines:saved.lines.slice(0,count)},shape))return
     if(saved.uid!==s.uid||saved.opId!==id||saved.catalogRevision!==data.catalogRevision||saved.platformId!==data.platformId)throw fail('COMMAND_ID_COLLISION')
     if(count===2&&saved.lines.length===1)data.coverageCount=saved.coverageCount
    }
    admit(s,[{path,data}]);t.set(doc(db,path),data)
   })
   for(let count=1;count<=lines.length;count++)await runTransaction(db,async t=>{
    guard(s);const before=await t.get(doc(db,path));guard(s)
    const saved=before.data();if(saved.coverageCount>=count)return
    const data={...saved,coverageCount:count};admit(s,[{path,data}]);t.set(doc(db,path),data)
   })
  }
  const certificatePath=`${gen(s)}/preparedSales/${id}/certificates/bill`
  const certificate={opId:id,uid:s.uid,catalogRevision:f.shop.catalogRevision,platformId:f.order.platformId,addonKeys:f.order.addonKeys,materialIds:f.order.materialIds,billOperands:f.order.billOperands,lines:f.order.lines}
  if(f.order.materialIds.length<15)certificate.lineOptionQuantities=f.order.lineOptionQuantities
  if(f.order.materialIds.length<15)for(let i=0;i<3;i++)await runTransaction(db,async t=>{
   guard(s);const proofRef=doc(db,`${gen(s)}/preparedSales/${id}/operandProofs/${i}`),saved=await t.get(proofRef)
   if(saved.exists()){if(!equal(saved.data(),certificate))throw fail('COMMAND_ID_COLLISION');return}
   guard(s);admit(s,[{path:proofRef.path,data:certificate}]);t.set(proofRef,certificate)
  })
  await runTransaction(db,async t=>{
   guard(s);const rootDoc=await t.get(doc(db,root(s)));checkRoot(s,rootDoc.data())
   if(rootDoc.data().catalogRevision!==f.shop.catalogRevision)throw fail('PRICE_REVIEW_REQUIRED')
   const saved=await t.get(doc(db,certificatePath));guard(s)
   if(saved.exists()){if(!equal(saved.data(),certificate))throw fail('COMMAND_ID_COLLISION');return}
   admit(s,[{path:certificatePath,data:certificate}]);t.set(doc(db,certificatePath),certificate)
  })
  // Validate canonical quantities separately from stock allocation. The final
  // atomic sale matches and consumes these per-command material cache entries.
  let attemptedCacheRows
  for(let attempt=0;attempt<4;attempt++)try{await runTransaction(db,async t=>{
   guard(s);const rootDoc=await t.get(doc(db,root(s)));checkRoot(s,rootDoc.data())
   if(rootDoc.data().catalogRevision!==f.shop.catalogRevision)throw fail('PRICE_REVIEW_REQUIRED')
   const rows=[]
   for(const row of f.order.inventory){const ref=doc(db,`${gen(s)}/materials/${row.materialId}`),before=await t.get(ref);if(!before.exists())throw fail('INCOMPLETE_INVENTORY');rows.push({row,ref,before:before.data()})}
   attemptedCacheRows=rows
   const writes=rows.map(({row,ref,before})=>{
    const data={...before,billPreparationId:id,billPreparations:{...before.billPreparations,[id]:{uid:s.uid,catalogRevision:f.shop.catalogRevision,needed:row.needed}}}
    if(Object.keys(data.billPreparations).length>64)throw fail('PREPARATION_LIMIT')
    return {path:ref.path,data}
   })
   guard(s);admit(s,writes);for(const w of writes)t.set(doc(db,w.path),w.data)
  });break
  }catch(error){
   if(error.code==='PREPARATION_LIMIT'&&attempt<3&&await recoverExpiredCapacity(s,attemptedCacheRows))continue
   if(attempt===3||!['permission-denied','aborted'].includes(error.code)||!attemptedCacheRows)throw error
   let changed=false
   for(const {ref,before} of attemptedCacheRows){const latest=await getDocFromServer(ref);guard(s);if(latest.exists()&&cacheChanged(before,latest.data()))changed=true}
   if(!changed)throw error
  }

 }

 async function prepareCatalog(s,command,f,sourceRevision){
  const operation=f.operation,ids=operation.validationIds
  for(let index=0;index*4<ids.length;index++)await runTransaction(db,async t=>{
   guard(s);const rootDoc=await t.get(doc(db,root(s)));checkRoot(s,rootDoc.data())
   if(rootDoc.data().revision!==sourceRevision)throw fail('STALE_CATALOG_PREPARATION')
   const path=`${gen(s)}/recipeAdmissions/${command.opId}/parts/${index}`,ref=doc(db,path),saved=await t.get(ref)
   const data={opId:command.opId,index,uid:s.uid,sourceRevision,kind:command.kind,entityId:operation.entityId,input:operation.input,entitySnapshot:operation.entitySnapshot,materialIds:ids.slice(index*4,index*4+4)}
   guard(s)
   if(saved.exists()){
    const before=saved.data()
    if(before.uid!==s.uid||before.entityId!==data.entityId||before.kind!==data.kind||!equal(before.input,data.input))throw fail('COMMAND_ID_COLLISION')
    if(equal(before,data))return
   }
   admit(s,[{path,data}]);t.set(ref,data)
  })
 }
 async function prepareMaterialReferences(s,command,shop){
  if(command.kind==='material_archive'&&command.payload.deleted===false)return
  for(let index=0;index<8;index++)await runTransaction(db,async t=>{
   guard(s);const rootDoc=await t.get(doc(db,root(s)));checkRoot(s,rootDoc.data())
   if(rootDoc.data().revision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
   const path=`${gen(s)}/materialReferences/${command.opId}/parts/${index}`,ref=doc(db,path),saved=await t.get(ref)
   const data={opId:command.opId,index,uid:s.uid,sourceRevision:shop.revision,kind:command.kind,materialId:command.payload.materialId}
   guard(s)
   if(saved.exists()){
    const before=saved.data();if(before.uid!==s.uid||before.kind!==data.kind||before.materialId!==data.materialId)throw fail('COMMAND_ID_COLLISION')
    if(equal(before,data))return
   }
   admit(s,[{path,data}]);t.set(ref,data)
  })
 }
 async function commit(command){
  const s=scope()
  if(!/^[A-Za-z0-9_-]{1,120}$/.test(command.opId||''))throw fail('INVALID_COMMAND_ID')
  const saved=await receipt(command.kind,command.opId);if(saved)return checkReceipt(s,command,saved)
  const initial=await snapshot();guard(s)
  if(['material_archive','material_delete'].includes(command.kind)){plan(s,command,initial.shop,initial.materials);await prepareMaterialReferences(s,command,initial.shop)}
  if(command.kind==='sale')await prepareSale(s,plan(s,command,initial.shop,initial.materials).f)
  if(['menu','addon','group'].includes(command.kind))await prepareCatalog(s,command,plan(s,command,initial.shop,initial.materials).f,initial.shop.revision)
  let attemptedRevision,attemptedMaterials,result
  for(let attempt=0;attempt<3;attempt++)try{
   result=await runTransaction(db,async t=>{
   guard(s);const shopDoc=await t.get(doc(db,root(s)));checkRoot(s,shopDoc.data())
   const receiptRef=doc(db,`${gen(s)}/${collectionFor(command.kind)}/${command.opId}`),existing=await t.get(receiptRef)
   if(existing.exists())return checkReceipt(s,command,existing.data())
   const shop=shopDoc.data(),ids=shop.materialIds||shop.catalog.summaryMaterials,materials=[]
   attemptedRevision=shop.revision
   for(const id of ids){const m=await t.get(doc(db,`${gen(s)}/materials/${id}`));if(!m.exists())throw fail('INCOMPLETE_INVENTORY');materials.push(m.data())}
   attemptedMaterials=materials
   let oldOrder
   if(command.kind==='cancel'){const o=await t.get(doc(db,`${gen(s)}/orders/${command.payload.orderId}`));if(!o.exists())throw fail('ORDER_NOT_FOUND');oldOrder=o.data()}
   let display
   if(['menu','addon','group'].includes(command.kind)){const d=await t.get(doc(db,`${gen(s)}/display/catalog`));if(!d.exists())throw fail('INCOMPLETE_CATALOG_DISPLAY');display=d.data()}
   guard(s);const p=plan(s,command,shop,materials,oldOrder)
   const writes=[{path:root(s),data:p.f.nextShop},{path:receiptRef.path,data:p.receipt},...p.materials.map(m=>({path:`${gen(s)}/materials/${m.id}`,data:m}))]
   if(p.f.displayChange)writes.push({path:`${gen(s)}/display/catalog`,data:applyCatalogDisplay(display,p.f.displayChange)})
   for(const proof of p.f.checkProofs||[])writes.push({path:`${gen(s)}/operations/${command.opId}/referenceProofs/${proof.namespace||'check'}${proof.index}`,data:proof.data})
   if(p.f.admittedProof)writes.push({path:`${gen(s)}/operations/${command.opId}/referenceProofs/admitted`,data:p.f.admittedProof})
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
   if(fresh.shop.revision===attemptedRevision&&!attemptedMaterials?.some(before=>{const after=fresh.materials.find(m=>m.id===before.id);return after&&cacheChanged(before,after)}))throw error
   if(['menu','addon','group'].includes(command.kind))await prepareCatalog(s,command,plan(s,command,fresh.shop,fresh.materials).f,fresh.shop.revision)
   if(['material_archive','material_delete'].includes(command.kind)){plan(s,command,fresh.shop,fresh.materials);await prepareMaterialReferences(s,command,fresh.shop)}
  }
  guard(s)
  // Always return the persisted server receipt, including resolved timestamps.
  return await receipt(command.kind,result.opId)
 }
 async function rejectStaleInventory(command){
  const s=scope(),expected=command.payload?.expectedRevision
  if(!REVISION_COMMAND_KINDS.includes(command.kind)||!Number.isSafeInteger(expected)||expected<0)throw fail('STALE_NOT_PROVEN')
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
  const proofCount=Math.ceil((command.payload.lines?.length||0)/2)
  if(proofCount<1||proofCount>3)throw fail('INVALID_COMMAND')
  // Establish the same manifest before closing it, fencing late sale attempts.
  const path=`${gen(s)}/preparations/sale_${command.opId}`,ref=doc(db,path)
  await runTransaction(db,async t=>{guard(s);const m=await t.get(ref);if(m.exists())return;t.set(ref,{kind:'sale_set',opId:command.opId,uid:s.uid,proofCount,stepCount:0,materialCount:0,state:'open',createdAt:serverTimestamp(),lifetimeDays:7})})
  const result=await runTransaction(db,async t=>{
   guard(s);const r=await t.get(doc(db,`${gen(s)}/orders/${command.opId}`)),m=await t.get(ref)
   if(r.exists())return {receipt:checkReceipt(s,command,r.data())}
   const certificateRef=doc(db,`${gen(s)}/preparedSales/${command.opId}/certificates/bill`),certificate=await t.get(certificateRef)
   if(m.data().uid!==s.uid)throw fail('COMMAND_ID_COLLISION')
   if(m.data().state==='abandoned')return {abandoned:true}
   if(m.data().state!=='open')throw fail('PREPARATION_CLOSED')
   guard(s);t.update(ref,{state:'abandoned',closedAt:serverTimestamp()});if(certificate.exists())t.delete(certificateRef)
   for(let i=0;i<m.data().proofCount;i++)t.delete(doc(db,`${gen(s)}/preparedSales/${command.opId}/lineProofs/${i}`))
   return {abandoned:true}
  })
  if(result.abandoned)await cleanupBillCache(s,command.opId)
  return result
 }
 async function abortInventory(command){
  const s=scope(),expected=command.payload?.expectedRevision
  if(!REVISION_COMMAND_KINDS.includes(command.kind)||!Number.isSafeInteger(expected)||expected<0||!/^[A-Za-z0-9_-]{1,120}$/.test(command.opId||''))throw fail('RETRY_REQUIRED')
  return runTransaction(db,async t=>{
   guard(s)
   const rootRef=doc(db,root(s)),before=await t.get(rootRef);checkRoot(s,before.data())
   const original=await t.get(doc(db,`${gen(s)}/operations/${command.opId}`))
   if(original.exists())return {receipt:checkReceipt(s,command,original.data())}
   const shop=before.data()
   if(shop.revision>expected)return {rejected:true,code:'COMMAND_STOPPED'}
   if(shop.revision!==expected)throw fail('STALE_NOT_PROVEN')
   const closureRef=doc(db,`${gen(s)}/operations/${command.opId}`)
   const closed={schemaVersion:2,kind:'command_abort',status:'committed',opId:command.opId,uid:s.uid,createdAt:serverTimestamp(),sourceKind:command.kind,sourceRevision:expected,shopRevision:expected+1}
   const next={...shop,revision:expected+1,lastOpId:command.opId,lastOpKind:'command_abort'}
   guard(s);admit(s,[{path:rootRef.path,data:next},{path:closureRef.path,data:closed}]);t.set(rootRef,next);t.set(closureRef,closed)
   return {rejected:true,code:'COMMAND_STOPPED'}
  })
 }
 async function recoverExpiredCapacity(s,rows){
  let recovered=false
  for(const {ref} of rows||[]){
   const current=await getDocFromServer(ref);guard(s)
   const entries=current.data()?.billPreparations||{}
   if(Object.keys(entries).length<64)continue
   let cleared=false
   for(const opId of Object.keys(entries)){
    const manifestRef=doc(db,`${gen(s)}/preparations/sale_${opId}`),manifest=await getDocFromServer(manifestRef);guard(s)
    const m=manifest.data()
    if(!m||m.kind!=='sale_set'||!['open','expired','abandoned'].includes(m.state)||m.createdAt.toMillis()+7*86400000>Date.now())continue
    await runTransaction(db,async t=>{
     guard(s);const before=await t.get(manifestRef),receiptDoc=await t.get(doc(db,`${gen(s)}/orders/${opId}`)),certificateRef=doc(db,`${gen(s)}/preparedSales/${opId}/certificates/bill`),certificate=await t.get(certificateRef)
     const saved=before.data();guard(s)
     if(receiptDoc.exists()||['expired','abandoned'].includes(saved.state))return
     if(saved.state!=='open')throw fail('PREPARATION_CLOSED')
     t.update(manifestRef,{state:'expired',closedAt:serverTimestamp()})
     if(certificate.exists())t.delete(certificateRef)
     for(let i=0;i<saved.proofCount;i++)t.delete(doc(db,`${gen(s)}/preparedSales/${opId}/lineProofs/${i}`))
    })
    await cleanupBillCache(s,opId,true);cleared=true;recovered=true;break
   }
   if(!cleared)return false
  }
  return recovered
 }
 async function cleanupBillCache(s,opId,expired=false){
  const initial=await snapshot(),ids=initial.materials.filter(m=>m.billPreparations?.[opId]&&(expired||m.billPreparations[opId].uid===s.uid)).map(m=>m.id)
  if(!ids.length)return
  let attempted
  for(let attempt=0;attempt<4;attempt++)try{await runTransaction(db,async t=>{
   guard(s);const rootDoc=await t.get(doc(db,root(s)));checkRoot(s,rootDoc.data())
   const rows=[];for(const id of ids){const ref=doc(db,`${gen(s)}/materials/${id}`),d=await t.get(ref);if(d.exists())rows.push({ref,before:d.data()})}
   attempted=rows;const writes=[]
   for(const {ref,before} of rows)if(before.billPreparations?.[opId]&&(expired||before.billPreparations[opId].uid===s.uid)){
    const entries={...before.billPreparations};delete entries[opId]
    const data={...before,billPreparationId:opId,billPreparations:entries};writes.push({path:ref.path,data})
   }
   guard(s);admit(s,writes);for(const w of writes)t.set(doc(db,w.path),w.data)
  });return}catch(error){
   if(attempt===3||!['permission-denied','aborted'].includes(error.code)||!attempted)throw error
   let changed=false;for(const {ref,before} of attempted){const current=await getDocFromServer(ref);guard(s);if(current.exists()&&cacheChanged(before,current.data()))changed=true}
   if(!changed)throw error
  }
 }
 return {snapshot,commit,receipt,abandonSale,rejectStaleInventory,abortInventory}
}
