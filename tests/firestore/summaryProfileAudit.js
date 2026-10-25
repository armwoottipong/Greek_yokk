import { sourcePreparedFixture } from './summaryPreparedSource.js'
import { preparedProof } from './summaryPreparedSale.js'
import { summaryInventoryBatch } from './summaryInventoryBatch.js'
import { documentMetrics,commitMetrics,auditMaterialProfile,inventoryBudget,saleBudget } from './summaryProfileMetrics.js'
import { ROOT,GENERATION } from './proofFixture.js'
import { admitBatches,saleBatches,inventoryBatches } from './summaryAdmission.js'
const database='projects/demo-greek-yogg/databases/(default)'
export function auditPreparedProfile(raw){
  const base=sourcePreparedFixture(raw,{fruit:true,lines:6}),profile=auditMaterialProfile(base.shop,base.materials)
  const reports=[],admissions=[]
  const measure=(name,writes)=>{
    const m=commitMetrics(database,writes),docs=writes.map(w=>documentMetrics(w.path,w.data))
    reports.push({name,documents:writes.length,storageBytes:docs.reduce((n,d)=>n+d.storageBytes,0),maxDocumentBytes:m.maxDocumentBytes,
      modelledCommitBytes:m.wireBytes,maxDepth:Math.max(...docs.map(d=>d.maxDepth)),violations:m.violations})
  }
  measure('initial-projected-catalog-and-stock',[{path:ROOT,data:base.shop},...base.materials.map(m=>({path:`${GENERATION}/materials/${m.id}`,data:m}))])
  for(const options of [{fruit:true},{allOptions:true}]){
    const f=sourcePreparedFixture(raw,{...options,lines:6})
    admissions.push({name:options.fruit?'six-line-group-sale':'six-line-eleven-addon-sale',...admitBatches(saleBatches({...f,order:{...f.order,proofMode:'prepared'}}))})
    measure(options.fruit?'six-line-group-sale':'six-line-eleven-addon-sale',[
      {path:ROOT,data:f.nextShop},{path:`${GENERATION}/orders/${f.order.opId}`,data:{...f.order,proofMode:'prepared'}},
      ...f.nextMaterials.map(m=>({path:`${GENERATION}/materials/${m.id}`,data:m}))])
    for(let index=0;index<f.order.lineWitnessCount;index++)measure(`price-pair-${options.fruit?'group':'legacy'}-${index}`,[{
      path:`${GENERATION}/preparedSales/${f.order.opId}/lineProofs/${index}`,data:preparedProof(f,index,f.order.lines.slice(index*2,index*2+2))}])
  }
  const output=base.materials.find(m=>m.productionRecipe),recipe=output?.productionRecipe
  if(recipe){
    const day=Math.floor((Date.now()+7*3600000)/86400000)
    const actions=recipe.inputIds.map((id,i)=>({kind:'receive',materialId:id,input:{qtyQ:recipe.quantities[i],unitCost:base.materials.find(m=>m.id===id).unitCost,
      receiveDay:day,expiryDay:999999,newLotId:`AUDIT-${i}`,lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}}))
    actions.push({kind:'produce',materialId:output.id,input:{qtyQ:recipe.yieldQ,lotId:'AUDIT-PRODUCT',receiveDay:day,expiryDay:999999,lotCreatedAtISO:'2026-10-22T00:00:00.000Z'}})
    actions.push({kind:'count',materialId:output.id,counts:[{id:'AUDIT-PRODUCT',to:recipe.yieldQ-1}]})
    const f=summaryInventoryBatch(base.shop,base.materials,actions,{opId:'AUDIT-INVENTORY'})
    admissions.push({name:'mixed-inventory',...admitBatches(inventoryBatches(f))})
    const path=`${GENERATION}/preparedInventory/AUDIT-INVENTORY`
    measure('mixed-proposal',[{path,data:f.proposal}])
    for(const [i,step] of f.steps.entries()){
      measure(`mixed-step-${i}`,[{path:`${path}/steps/${i}`,data:step}])
      // All three proof phases have identical payload; measure each material once.
      for(const [j,id] of f.proposal.materialIds.entries())measure(`mixed-proof-${i}-${j}`,[{path:`${path}/steps/${i}/proofs/${j*3}`,data:{before:step.before[id],after:step.after[id]}}])
    }
    measure('mixed-final',[{path:ROOT,data:f.nextShop},{path:`${GENERATION}/operations/AUDIT-INVENTORY`,data:f.operation},...f.nextMaterials.map(m=>({path:`${GENERATION}/materials/${m.id}`,data:m}))])
  }
  return {inspectionOnly:true,productionReady:false,sampleFits:profile.violations.length===0&&reports.every(r=>r.violations.length===0)&&admissions.every(a=>a.ok),profile,
    historicalRecordsExcluded:{orders:raw.orders?.length||0,activityLogs:raw.activityLogs?.length||0},
    scenarios:reports,admissions,budgets:{saleSix:saleBudget(6),mixedMaximum:inventoryBudget(6,6)},
    unresolved:['full lossless historical import/export codec','deployed index build and production query validation','transaction index delta and transport validation','protected sale union >15','production counters/listener/retry/cleanup load'],
    scope:'sample projected documents and modelled full-set Commit payloads only; no migration approval'}
}
