import { doc,setDoc,writeBatch } from 'firebase/firestore'
import { ROOT,GENERATION } from './proofFixture.js'
import { ensurePreparation,preparationDescriptor } from './summaryPreparationLifecycle.js'

export const inventoryPath=id=>`${GENERATION}/preparedInventory/${id}`
export async function prepareInventoryBatch(db,f,{omitStep,omitProof}={}){
  await ensurePreparation(db,preparationDescriptor(f,'inventory_batch'))
  const path=inventoryPath(f.operation.opId)
  await setDoc(doc(db,path),f.proposal)
  for(const [step,state] of f.steps.entries()){
    if(step===omitStep)break
    await setDoc(doc(db,`${path}/steps/${step}`),state)
    for(let proof=0;proof<f.proposal.materialIds.length*3;proof++){
      if(omitProof?.step===step&&omitProof.proof===proof)return
      const id=f.proposal.materialIds[Math.floor(proof/3)]
      try{await setDoc(doc(db,`${path}/steps/${step}/proofs/${proof}`),{before:state.before[id],after:state.after[id]})}
      catch(error){const tagged=new Error(`Inventory preparation step ${step} proof ${proof}: ${error.code||error.name}`,{cause:error});tagged.code=error.code;throw tagged}
    }
  }
}
// TEST ONLY. Production requires explicit online transactions and reconciliation.
export function inventoryBatchCommit(db,f,{omitMaterial,omitOperation=false,omitShop=false}={}){
  const b=writeBatch(db)
  if(!omitShop)b.set(doc(db,ROOT),f.nextShop)
  if(!omitOperation)b.set(doc(db,`${GENERATION}/operations/${f.operation.opId}`),f.operation)
  for(const m of f.nextMaterials)if(m.id!==omitMaterial)b.set(doc(db,`${GENERATION}/materials/${m.id}`),m)
  return b
}
