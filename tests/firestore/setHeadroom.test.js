import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { createRulesTest } from './helpers.js'
import { setCatalogFixture, seedSetCatalog, setSaleBatch } from './setCatalogFixture.js'

it('measures expression reserve for six eleven-option lines and fifteen materials', async () => {
  const candidate = await readFile(new URL('./candidates/set-catalog.rules', import.meta.url), 'utf8')
  const results = []
  for (const count of [0, 8, 16, 64]) {
    const checks = Array.from({ length: count }, (_, i) => `(v + ${i} == ${i})`).join(' && ') || 'true'
    const rules = candidate.replace('match /databases/{database}/documents {', `match /databases/{database}/documents { function reserve(v) { return ${checks}; }`)
      .split('\n').map(line => /allow (create|update):/.test(line) ? line.replace(/if (.*);/, 'if ($1) && reserve(0);') : line).join('\n')
    const env = await createRulesTest({ rules })
    try {
      await env.clearFirestore()
      const f = setCatalogFixture({ lines: 6, menuPattern: ['SIMPLE', 'BANANA', 'CRUNCH'] })
      await seedSetCatalog(env, f)
      let accepted = true
      try { await setSaleBatch(env.authenticatedContext('cashier').firestore(), f).commit() }
      catch (error) { accepted = false; expect(error.message).toContain('maximum of 1000') }
      results.push({ extraComparisons: count, accepted })
      if (count === 0) expect(accepted).toBe(true)
    } finally { await env.cleanup() }
  }
  console.log('SET_EXPRESSION_RESERVE', JSON.stringify(results))
  expect(results.find(row => row.extraComparisons === 8).accepted).toBe(true)
  let exhausted = false
  for (const row of results) {
    if (exhausted) expect(row.accepted).toBe(false)
    if (!row.accepted) exhausted = true
  }
})
