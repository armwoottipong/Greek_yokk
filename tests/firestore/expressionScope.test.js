import { it, expect } from 'vitest'
import { doc, writeBatch } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'

it('checks whether expression counters are shared across batch writes', async () => {
  const functions = Array.from({ length: 10 }, (_, j) => `function chunk${j}(x) { return ${Array.from({length:10},(_,i)=>`x >= ${j*10+i}`).join(' && ')}; }`).join('\n')
  const calls = Array.from({ length: 10 }, (_, i) => `chunk${i}(x)`).join(' && ')
  const env = await createRulesTest({ rules: `rules_version = '2'; service cloud.firestore {
    match /databases/{database}/documents { ${functions} function costly(x) { return ${calls}; }
    match /scope-probe/{id} { allow create: if costly(request.resource.data.x); } } }` })
  const results = []
  try {
    for (const count of [1, 2, 4, 8, 16, 32]) {
      await env.clearFirestore()
      const db = env.authenticatedContext('test').firestore(), batch = writeBatch(db)
      for (let i = 0; i < count; i++) batch.set(doc(db, `scope-probe/${i}`), { x: 100 + i })
      try { await batch.commit(); results.push({ count, accepted: true }) }
      catch (e) { results.push({ count, accepted: false }); expect(e.message).toContain('maximum of 1000') }
    }
    console.log('EXPRESSION_SCOPE', JSON.stringify(results))
    expect(results[0].accepted).toBe(true)
  } finally { await env.cleanup() }
})
