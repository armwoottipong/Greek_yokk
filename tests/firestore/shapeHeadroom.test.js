import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { createRulesTest } from './helpers.js'
import { proofFixture, saleBatch, seedProof } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'
import { realMenuFixture } from './realMenuFixture.js'
import { four } from './multiLotFixture.js'

it('measures expression reserve without treating a passing bounded example as certification', async () => {
  const candidate = await readFile(new URL('./candidate.rules', import.meta.url), 'utf8')
  const results = []
  for (const count of [0, 1, 4, 8, 16]) {
    // Diagnostic: strengthen every mutation predicate with extra comparisons.
    // This measures a reproducible bound, not an exact Rules expression count.
    const checks = Array.from({ length: count }, (_, i) => `(v + ${i} == ${i})`).join(' && ') || 'true'
    const rules = candidate.replace('match /databases/{database}/documents {',
      `match /databases/{database}/documents { function expressionReserve(v) { return ${checks}; }`)
      .split('\n').map(line => /allow (create|update):/.test(line)
        ? line.replace(/if (.*);/, 'if ($1) && expressionReserve(0);') : line).join('\n')
    expect(rules).not.toBe(candidate)
    const env = await createRulesTest({ rules })
    try {
      for (const [name, fixture] of [
        ['four source lots', () => four()],
        ['six option-bearing lines', () => {
          const f = proofFixture(), pair = f.order.lines
          f.order.lines = Array.from({ length: 6 }, (_, i) => structuredClone(pair[i % 2]))
          return recomputeFromDomain(f)
        }],
        ['six shipped lines and eleven materials', () => realMenuFixture(['MENU01', 'MENU02', 'MENU03', 'MENU04', 'MENU01', 'MENU02'])],
      ]) {
        const f = fixture()
        await env.clearFirestore()
        await seedProof(env, f)
        let accepted = true
        try { await saleBatch(env.authenticatedContext('cashier').firestore(), f).commit() }
        catch (error) {
          accepted = false
          expect(error.message).toContain('maximum of 1000')
        }
        results.push({ name, extraComparisons: count, accepted })
        if (count === 0) expect(accepted).toBe(true)
      }
    } finally { await env.cleanup() }
  }
  console.log('EXPRESSION_RESERVE', JSON.stringify(results))
  expect(results).toHaveLength(15)
  for (const name of new Set(results.map(r => r.name))) {
    let exhausted = false
    for (const row of results.filter(r => r.name === name)) {
      if (exhausted) expect(row.accepted).toBe(false)
      if (!row.accepted) exhausted = true
    }
  }
})
