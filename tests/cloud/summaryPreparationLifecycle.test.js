// @vitest-environment node
import { it,expect } from 'vitest'
import { cleanupPaths,preparationDecision,preparationPath,criticalProofPath } from '../firestore/summaryPreparationLifecycle.js'
const m={kind:'inventory_batch',opId:'X',uid:'cashier',state:'committed',proofCount:18,stepCount:6,materialCount:6}
it('retains committed movement snapshots and cleans only the 108 redundant proofs',()=>{
  const paths=cleanupPaths(m)
  expect(paths).toHaveLength(108);expect(paths.every(p=>p.includes('/proofs/'))).toBe(true)
  expect(new Set(paths).size).toBe(108)
})
it('bounds abandoned full inventory cleanup to 115 deterministic paths',()=>{
  const paths=cleanupPaths({...m,state:'abandoned'})
  expect(paths).toHaveLength(115);expect(paths).toContain(criticalProofPath(m))
  expect(paths.some(p=>p.includes('/orders/')||p.includes('/operations/')||p.includes('/materials/'))).toBe(false)
})
it('keeps terminal manifest IDs distinct by command namespace',()=>{
  expect(preparationPath('sale_set','X')).not.toBe(preparationPath('inventory_batch','X'))
  expect(()=>preparationPath('sale_set','../X')).toThrow()
})
it.each([{...m,proofCount:32},{...m,stepCount:0},{...m,materialCount:0}])('rejects invalid cleanup dimensions',manifest=>{
  expect(()=>cleanupPaths(manifest)).toThrow()
})
it('reconciles an existing receipt before retry even if manifest is still open',()=>{
  const receipt={kind:m.kind,opId:m.opId,uid:m.uid,status:'committed'}
  expect(preparationDecision({...m,state:'open'},receipt)).toEqual({action:'committed',receipt})
  expect(preparationDecision({...m,state:'abandoned'},null).action).toBe('closed')
  expect(()=>preparationDecision(m,null)).toThrow()
  expect(preparationDecision(m,{...receipt,uid:'other'}).action).toBe('conflict')
})
