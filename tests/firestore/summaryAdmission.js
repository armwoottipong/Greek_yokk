// Candidate preflight only. The future online adapter must invoke this BEFORE
// the first preparation write. These headroom guards are not Security Rules.
import { commitMetrics } from './summaryProfileMetrics.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { preparedProof } from './summaryPreparedSale.js'
import { platformProofCount } from './summaryPreparedPlatform.js'
import { preparationDescriptor,preparationRecord,preparationPath } from './summaryPreparationLifecycle.js'
export const ADMISSION_LIMITS=Object.freeze({documentBytes:800000,requestBytes:8*1024*1024})
const database='projects/demo-greek-yogg/databases/(default)'
export function indexedFields(config,collection){
  if(!config.fieldOverrides.some(f=>f.collectionGroup===collection&&f.fieldPath==='*'&&f.indexes.length===0))throw new Error('Missing collection exemption')
  return config.fieldOverrides.filter(f=>f.collectionGroup===collection&&f.fieldPath!=='*'&&f.indexes.length>0).map(f=>f.fieldPath).sort()
}
export function admitBatches(batches){
  const violations=new Set(),requests=[]
  if(!Array.isArray(batches)||!batches.length)return {ok:false,productionReady:false,violations:['EMPTY_WORKFLOW']}
  for(const batch of batches){
    try{
      if(!Array.isArray(batch)||!batch.length)throw new Error('Empty batch')
      if(new Set(batch.map(w=>w.path)).size!==batch.length)violations.add('DUPLICATE_WRITE_PATH')
      const result=commitMetrics(database,batch)
      result.violations.forEach(v=>violations.add(v))
      if(result.maxDocumentBytes>ADMISSION_LIMITS.documentBytes)violations.add('ADMISSION_DOCUMENT')
      if(result.wireBytes>ADMISSION_LIMITS.requestBytes)violations.add('ADMISSION_REQUEST')
      requests.push({writes:batch.length,maxDocumentBytes:result.maxDocumentBytes,modelledBytes:result.wireBytes})
    }catch{violations.add('UNSUPPORTED_AUDIT_VALUE')}
  }
  return {ok:violations.size===0,productionReady:false,violations:[...violations],requests:requests.length,
    writes:requests.reduce((n,r)=>n+r.writes,0),maxDocumentBytes:Math.max(0,...requests.map(r=>r.maxDocumentBytes)),maxRequestBytes:Math.max(0,...requests.map(r=>r.modelledBytes))}
}
export function inventoryBatches(f){
  const path=`${GENERATION}/preparedInventory/${f.operation.opId}`,d=preparationDescriptor(f,'inventory_batch')
  const batches=[[{path:preparationPath(d.kind,d.opId),data:preparationRecord(d)}],[{path,data:f.proposal}]]
  for(const [i,step] of f.steps.entries()){
    batches.push([{path:`${path}/steps/${i}`,data:step}])
    for(let j=0;j<f.proposal.materialIds.length*3;j++){
      const id=f.proposal.materialIds[Math.floor(j/3)]
      batches.push([{path:`${path}/steps/${i}/proofs/${j}`,data:{before:step.before[id],after:step.after[id]}}])
    }
  }
  batches.push([{path:ROOT,data:f.nextShop},{path:`${GENERATION}/operations/${f.operation.opId}`,data:f.operation},...f.nextMaterials.map(m=>({path:`${GENERATION}/materials/${m.id}`,data:m}))])
  return batches
}
export function saleBatches(f){
  const d=preparationDescriptor(f,'sale_set'),batches=[[{path:preparationPath(d.kind,d.opId),data:preparationRecord(d)}]]
  for(let i=0;i<f.order.lineWitnessCount;i++){
    const path=`${GENERATION}/preparedSales/${f.order.opId}/lineProofs/${i}`,lines=f.order.lines.slice(i*2,i*2+2)
    batches.push([{path,data:preparedProof(f,i,lines.slice(0,1))}])
    if(lines.length===2)batches.push([{path,data:preparedProof(f,i,lines)}])
  }
  batches.push([{path:ROOT,data:f.nextShop},{path:`${GENERATION}/orders/${f.order.opId}`,data:f.order},...f.nextMaterials.map(m=>({path:`${GENERATION}/materials/${m.id}`,data:m}))])
  return batches
}
export function platformBatches(f){
  const batches=[],path=`${GENERATION}/preparedPlatforms/${f.operation.opId}`
  if(f.operation.create){
    const d=preparationDescriptor(f,'platform')
    batches.push([{path:preparationPath(d.kind,d.opId),data:preparationRecord(d)}])
    batches.push([{path,data:{...f.operation,catalog:f.nextShop.catalog}}])
    for(let i=0;i<platformProofCount(f.nextShop.catalog);i++)batches.push([{path:`${path}/columnProofs/${i}`,data:{opId:f.operation.opId}}])
  }
  batches.push([{path:ROOT,data:f.nextShop},{path:`${GENERATION}/operations/${f.operation.opId}`,data:f.operation}])
  return batches
}
