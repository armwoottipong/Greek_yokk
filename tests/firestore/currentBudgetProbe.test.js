// Emulator-only diagnostic: never deploy these permissive substitutions.
import { readFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { createRulesTest } from './helpers.js'
import { proofFixture, seedProof, saleBatch } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'
it('measures each candidate validator independently', async () => {
 const rules = await readFile(new URL('./candidate.rules', import.meta.url),'utf8')
 const guards = ['validSale(s,g,request.resource.data,id)', 'validLineDoc(s,g,id,index,request.resource.data)', 'validWitness(s,g,id,index,request.resource.data)', 'stockGuard(s,g,id)', 'shopGuard(s)']
 const results = []
 for (const guard of guards) {
  let isolated = rules
  for (const other of guards) if(other !== guard) isolated = isolated.replace(`if ${other};`, 'if true;')
  const env = await createRulesTest({rules:isolated})
  try {
   await env.clearFirestore()
   const f = proofFixture(); const pair=f.order.lines; f.order.lines=Array.from({length:6},(_,i)=>structuredClone(pair[i%2])); recomputeFromDomain(f)
   await seedProof(env,f)
   try { await saleBatch(env.authenticatedContext('cashier').firestore(),f).commit(); results.push({guard,accepted:true}) }
   catch(e) {results.push({guard,accepted:false,expressionLimit:e.message.includes('maximum of 1000')})}
  } finally {await env.cleanup()}
 }
 console.log('ISOLATED_BUDGET',JSON.stringify(results))
 expect(results).toHaveLength(5)
})
