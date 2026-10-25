import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { doc, getDoc, getDocFromServer, runTransaction } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION, ROOT, proofFixture, saleBatch, seedProof } from './proofFixture.js'
import { recomputeFromDomain } from './proofDomainAdapter.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

// Test-only planner adapter; no production transaction module is enabled here.
async function submit(db, fixture) {
  try { return await runTransaction(db, async tx => {
    const receipt = await tx.get(doc(db, `${GENERATION}/orders/${fixture.order.opId}`))
    if (receipt.exists()) {
      if (receipt.data().subtotalCents !== fixture.order.subtotalCents) throw new Error('PAYLOAD_CHANGED')
      return { replay: true, id: receipt.id }
    }
    const shop = await tx.get(doc(db, ROOT))
    const materials = []
    for (const m of fixture.materials) materials.push(await tx.get(doc(db, `${GENERATION}/materials/${m.id}`)))
    if (shop.data().revision !== fixture.order.shopRevision - 1 || materials.some((snap, i) => snap.data().revision !== fixture.materials[i].revision)) throw new Error('NEEDS_REVIEW')
    saleBatch(db, fixture, { writeTarget: tx })
    return { replay: false, id: fixture.order.opId }
  }) } catch (error) {
    // Emulator may reject a stale write through Rules before SDK retry. A fresh
    // root read distinguishes a demonstrated revision conflict from permission.
    if (error.code === 'permission-denied') {
      const current = await getDocFromServer(doc(db, ROOT))
      if (current.data().revision !== fixture.order.shopRevision - 1) throw new Error('NEEDS_REVIEW')
    }
    throw error
  }
}

it('replays a committed transaction without deducting stock again', async () => {
  const f = proofFixture()
  await seedProof(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  expect(await submit(db, f)).toMatchObject({ replay: false })
  expect(await submit(db, f)).toMatchObject({ replay: true })
  for (const m of f.nextMaterials) expect((await getDoc(doc(db, `${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
})

it('commits exactly one competing command without applying old allocations twice', async () => {
  const first = proofFixture(), second = proofFixture()
  second.order.opId = 'SALE-SECOND'
  second.nextShop.lastOpId = second.order.opId
  recomputeFromDomain(second)
  await seedProof(env, first)
  const results = await Promise.allSettled([
    submit(env.authenticatedContext('cashier').firestore(), first),
    submit(env.authenticatedContext('cashier').firestore(), second),
  ])
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  const error = results.find(r => r.status === 'rejected').reason
  // A Rules rejection can arrive before the winner's commit becomes observable.
  // It remains a failed/pending command; never infer safe resubmission with a new ID.
  expect(error.message === 'NEEDS_REVIEW' || error.code === 'permission-denied').toBe(true)
  const db = env.authenticatedContext('cashier').firestore()
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
  for (const m of first.nextMaterials) expect((await getDoc(doc(db, `${GENERATION}/materials/${m.id}`))).data().stock).toBe(m.stock)
})

it('accepts a different fresh operation ID when it wins before the original', async () => {
  const f = proofFixture()
  f.order.opId = 'SALE-SECOND'
  f.nextShop.lastOpId = f.order.opId
  recomputeFromDomain(f)
  await seedProof(env, f)
  await expect(submit(env.authenticatedContext('cashier').firestore(), f)).resolves.toMatchObject({ id: 'SALE-SECOND' })
})
