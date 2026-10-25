// TEST ONLY. Server reads are explicit; production journal/online adapter is not
// wired here. Never delete business receipts or reuse terminal preparation IDs.
import { doc,getDocFromServer,setDoc,writeBatch,serverTimestamp,runTransaction,collection,query,where,orderBy,documentId,startAfter,limit,getDocsFromServer } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
const prefixes={sale_set:'sale',inventory_batch:'inventory',platform:'platform'}
export const preparationPath=(kind,id)=>{
  if(!prefixes[kind]||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(id))throw new Error('Invalid preparation identity')
  return `${GENERATION}/preparations/${prefixes[kind]}_${id}`
}
export function preparationDescriptor(f,kind){
  const o=kind==='sale_set'?f.order:f.operation
  return {kind,opId:o.opId,uid:o.uid,proofCount:kind==='sale_set'?o.lineWitnessCount:kind==='inventory_batch'?f.proposal.materialIds.length*3:Math.max(1,Math.ceil(Math.max(f.nextShop.catalog.menuIds.length,f.nextShop.catalog.addonIds.length,f.nextShop.catalog.groupIds.length)/2)),
    stepCount:kind==='inventory_batch'?f.steps.length:0,materialCount:kind==='inventory_batch'?f.proposal.materialIds.length:0}
}
export const receiptPath=m=>`${GENERATION}/${m.kind==='sale_set'?'orders':'operations'}/${m.opId}`
export const preparationRecord=descriptor=>({...descriptor,state:'open',createdAt:serverTimestamp(),lifetimeDays:7})
export function criticalProofPath(m){
  if(m.kind==='sale_set')return `${GENERATION}/preparedSales/${m.opId}/lineProofs/0`
  if(m.kind==='platform')return `${GENERATION}/preparedPlatforms/${m.opId}/columnProofs/${m.proofCount-1}`
  return `${GENERATION}/preparedInventory/${m.opId}/steps/${m.stepCount-1}/proofs/${m.proofCount-1}`
}
export async function ensurePreparation(db,descriptor){
  const ref=doc(db,preparationPath(descriptor.kind,descriptor.opId))
  return runTransaction(db,async t=>{
    const snap=await t.get(ref)
    if(snap.exists()){
      const m=snap.data()
      if(m.state!=='open'||Object.entries(descriptor).some(([k,v])=>m[k]!==v))throw Object.assign(new Error('Preparation is closed or has another descriptor'),{code:m.uid!==descriptor.uid?'permission-denied':'failed-precondition'})
      return
    }
    // Rules set exact expiry relative to request.time; SDK serverTimestamp cannot
    // express an offset. Store a fixed seven-day integer duration, derive expiry
    // from persisted createdAt when reading and in Rules.
    t.set(ref,preparationRecord(descriptor))
  })
}
export function preparationDecision(m,receipt){
  if(receipt){
    if(receipt.opId!==m.opId||receipt.kind!==m.kind||receipt.uid!==m.uid)return {action:'conflict',reason:'RECEIPT_ID_COLLISION'}
    return {action:'committed',receipt}
  }
  if(m.state==='committed')throw new Error('Committed preparation has no receipt')
  return {action:m.state==='open'?'resume':'closed',state:m.state}
}
export async function reconcilePreparation(db,m){
  const receipt=await getDocFromServer(doc(db,receiptPath(m))),decision=preparationDecision(m,receipt.exists()?receipt.data():null)
  if(decision.action==='committed'&&m.state==='open')await setDoc(doc(db,preparationPath(m.kind,m.opId)),{...m,state:'committed',closedAt:serverTimestamp()})
  return decision
}
export function closePreparationBatch(db,m,state='abandoned'){
  if(!['abandoned','expired'].includes(state))throw new Error('Invalid close state')
  const b=writeBatch(db)
  b.set(doc(db,preparationPath(m.kind,m.opId)),{...m,state,closedAt:serverTimestamp()})
  b.delete(doc(db,criticalProofPath(m)))
  return b
}
export function cleanupPaths(m){
  preparationPath(m.kind,m.opId)
  if(!['abandoned','expired','committed'].includes(m.state))throw new Error('Preparation must be terminal')
  if(!Number.isInteger(m.proofCount)||m.proofCount<1||m.proofCount>32||!Number.isInteger(m.stepCount)||m.stepCount<0||m.stepCount>6)throw new Error('Invalid cleanup dimensions')
  if(m.kind==='inventory_batch' ? m.stepCount<1||!Number.isInteger(m.materialCount)||m.materialCount<1||m.materialCount>6||m.proofCount!==m.materialCount*3 :
    m.stepCount!==0||m.materialCount!==0||m.kind==='sale_set'&&m.proofCount>3)throw new Error('Invalid typed cleanup dimensions')
  if(m.kind==='sale_set')return Array.from({length:m.proofCount},(_,i)=>`${GENERATION}/preparedSales/${m.opId}/lineProofs/${i}`)
  if(m.kind==='platform')return [...Array.from({length:m.proofCount},(_,i)=>`${GENERATION}/preparedPlatforms/${m.opId}/columnProofs/${i}`),...(m.state==='committed'?[]:[`${GENERATION}/preparedPlatforms/${m.opId}`])]
  const path=`${GENERATION}/preparedInventory/${m.opId}`,paths=[]
  for(let i=0;i<m.stepCount;i++){
    for(let j=0;j<m.proofCount;j++)paths.push(`${path}/steps/${i}/proofs/${j}`)
    if(m.state!=='committed')paths.push(`${path}/steps/${i}`)
  }
  if(m.state!=='committed')paths.push(path)
  return paths
}
export async function cleanupPreparationPage(db,m,{cursor=0,pageSize=20}={}){
  if(!Number.isInteger(cursor)||cursor<0||!Number.isInteger(pageSize)||pageSize<1||pageSize>20)throw new Error('Invalid cleanup page')
  const paths=cleanupPaths(m),page=paths.slice(cursor,cursor+pageSize)
  if(page.length){const b=writeBatch(db);for(const path of page)b.delete(doc(db,path));await b.commit()}
  const nextCursor=Math.min(paths.length,cursor+page.length)
  return {nextCursor,done:nextCursor===paths.length,deletedRequests:page.length}
}
export function findPreparationPage(db,{before,cursor,pageSize=20}={}){
  if(!before||!Number.isInteger(pageSize)||pageSize<1||pageSize>20)throw new Error('Invalid discovery page')
  return getDocsFromServer(query(collection(db,`${GENERATION}/preparations`),where('createdAt','<=',before),orderBy('createdAt','asc'),orderBy(documentId(),'asc'),...(cursor?[startAfter(cursor)]:[]),limit(pageSize)))
}
