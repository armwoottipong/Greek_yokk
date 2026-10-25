// Diagnostic isolation, not a deployable security policy. Permissive variants
// exist only in memory in a demo-project Emulator to locate the failing layer.
import { readFile } from 'node:fs/promises'
import { it, expect } from 'vitest'
import { createRulesTest } from './helpers.js'
import { proofFixture, seedProof, saleBatch } from './candidates/receiptFixture.js'

it('isolates the expression-budget failure without treating weaker variants as proof', async () => {
  const candidate = await readFile(new URL('./candidates/receipt-validation.rules', import.meta.url), 'utf8')
  const variants = [
    ['complete', s => s],
    ['order-only-DIAGNOSTIC', s => s.replace('if stockGuard(s,g,id);', 'if true;').replace('if shopGuard(s);', 'if true;')],
    ['inventory-only-DIAGNOSTIC', s => s.replace('if validSale(s,g,request.resource.data,id);', 'if true;').replace('if shopGuard(s);', 'if true;')]
  ]
  const results = []
  for (const [name, transform] of variants) {
    const env = await createRulesTest({ rules: transform(candidate) })
    try {
      await env.clearFirestore()
      const fixture = proofFixture()
      await seedProof(env, fixture)
      let result = { name, accepted: true }
      try { await saleBatch(env.authenticatedContext('cashier').firestore(), fixture, { omitLines: true }).commit() }
      catch (e) { result = { name, accepted: false, code: e.code, expressionLimit: e.message.includes('maximum of 1000') } }
      results.push(result)
    } finally { await env.cleanup() }
  }
  console.log('BUDGET_DIAGNOSTIC', JSON.stringify(results))
  expect(results).toHaveLength(3)
  expect(results[0]).toMatchObject({ accepted: false, expressionLimit: true })
})
