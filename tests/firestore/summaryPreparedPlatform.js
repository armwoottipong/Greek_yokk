import { doc,setDoc } from 'firebase/firestore'
import { GENERATION } from './proofFixture.js'
import { ensurePreparation,preparationDescriptor } from './summaryPreparationLifecycle.js'

// Test-only immutable preparation, not a sale or offline queue. An online
// production adapter and reconciliation remain separate delivery gates.
export function platformProofCount(c){return Math.max(1,Math.ceil(Math.max(c.menuIds.length,c.addonIds.length,c.groupIds.length)/2))}
export async function prepareSummaryPlatform(db,f,{omitProof,omitProposal=false}={}){
  if(!f.operation.create)return
  await ensurePreparation(db,preparationDescriptor(f,'platform'))
  const path=`${GENERATION}/preparedPlatforms/${f.operation.opId}`
  if(!omitProposal)await setDoc(doc(db,path),{...f.operation,catalog:f.nextShop.catalog})
  for(let i=0;i<platformProofCount(f.nextShop.catalog);i++){
    if(i===omitProof)break
    await setDoc(doc(db,`${path}/columnProofs/${i}`),{opId:f.operation.opId})
  }
}
