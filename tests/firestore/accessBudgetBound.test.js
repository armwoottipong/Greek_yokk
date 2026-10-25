// Diagnostic: isolate the parent predicate to prove its explicit shape bound.
// Other mutation guards are bypassed ONLY in this local demo test, never deployed.
import { readFile } from 'node:fs/promises'
import { expect, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { saleBatch, seedProof } from './proofFixture.js'
import { mixedLotFixture } from './mixedLotFixture.js'

it('counts before-material reads in the sale parent bound, including packaging', async () => {
  const candidate = await readFile(new URL('./candidate.rules', import.meta.url), 'utf8')
  const diagnostic = candidate.split('\n').map(line => {
    if (/allow (create|update):/.test(line) && !line.includes('validSale(')) return line.replace(/if .*;/, 'if true;')
    return line
  }).join('\n')
  expect(diagnostic).not.toBe(candidate)
  const env = await createRulesTest({ rules: diagnostic })
  try {
    for (const count of [3, 4]) {
      await env.clearFirestore()
      const f = mixedLotFixture({ multiMaterials: count })
      expect(f.order.inventory.reduce((n, row) => n + row.packagingCostCents, 0)).toBe(f.order.packagingCostCents)
      const reads = f.materials.length + f.order.witnessCount + f.order.lineWitnessCount + 3 + count
      expect(reads).toBe(count === 3 ? 20 : 21)
      await seedProof(env, f)
      const attempt = saleBatch(env.authenticatedContext('cashier').firestore(), f).commit()
      if (reads <= 20) await assertSucceeds(attempt)
      else await assertFails(attempt)
    }
  } finally { await env.cleanup() }
})
