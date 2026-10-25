import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT, GENERATION, seedProof, saleBatch } from './proofFixture.js'
import { historyWindowFixture } from './historyWindowFixture.js'
import { mixedLotFixture } from './mixedLotFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it('keeps the six-line three-material baseline valid in the history policy', async () => {
  const f = mixedLotFixture({ multiMaterials: 3 })
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([1, 3])('combines retained history with six lines and %i multi-lot materials', async multiMaterials => {
  const f = historyWindowFixture({ fixture: mixedLotFixture({ multiMaterials }) })
  await seedProof(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertSucceeds(saleBatch(db, f).commit())
  expect((await getDoc(doc(db, `${GENERATION}/materials/${f.materials[0].id}`))).data().lots).toEqual(f.nextMaterials[0].lots)
})

it.each([0, 2, 1.5])('rejects an invalid material revision delta %s despite the deduplicated witness', async delta => {
  const f = mixedLotFixture({ multiMaterials: 3 })
  await seedProof(env, f)
  f.nextMaterials[0].revision = f.materials[0].revision + delta
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(saleBatch(db, f).commit())
  expect((await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).exists()).toBe(false)
  expect((await getDoc(doc(db, `${GENERATION}/materials/${f.materials[0].id}`))).data()).toEqual(f.materials[0])
})

it.each([{ prefix: 6, suffix: 5 }, { prefix: 0, suffix: 12 }, { prefix: 20, suffix: 0 }])('deducts the current window and preserves empty history $prefix/$suffix', async options => {
  const f = historyWindowFixture(options)
  await seedProof(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertSucceeds(saleBatch(db, f).commit())
  const saved = (await getDoc(doc(db, `${GENERATION}/materials/YOGURT`))).data()
  expect(saved.lots).toEqual(f.nextMaterials[0].lots)
  expect(saved.lots).toHaveLength(options.prefix + options.suffix + 4)
})

it.each([
  ['modified old history', f => { f.nextMaterials[0].lots[0].receiveDay++ }],
  ['removed old history', f => { f.nextMaterials[0].lots.shift() }],
  ['modified later history', f => { f.nextMaterials[0].lots.at(-1).id = 'FORGED' }],
  ['negative offset', f => { f.order.inventory[0].four.offset = -1 }],
  ['fractional offset', f => { f.order.inventory[0].four.offset = 1.5 }],
  ['wrong window', f => { f.order.inventory[0].four.offset++ }],
  ['missing window', f => { delete f.order.inventory[0].four.offset }],
  ['changed first window metadata', f => { f.nextMaterials[0].lots[6].receiveDay++ }],
])('rejects %s atomically', async (_label, alter) => {
  const f = historyWindowFixture()
  await seedProof(env, f); alter(f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it('rejects a window omitting positive stock elsewhere in the history', async () => {
  const f = historyWindowFixture()
  f.materials[0].lots[0].qty = 10; f.materials[0].stock += 10
  f.nextMaterials[0].lots[0].qty = 10; f.nextMaterials[0].stock += 10
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each(['valid', 'prefix metadata', 'suffix ID', 'extra returned stock'])('validates cancellation of a window sale: %s', async mode => {
  const f = historyWindowFixture()
  await seedProof(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await saleBatch(db, f).commit()
  const saved = (await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).data()
  const receipt = { schemaVersion: 1, kind: 'cancel', status: 'committed', opId: 'CANCEL-WINDOW', uid: 'cashier', orderId: saved.opId,
    materialIds: saved.materialIds, createdAt: serverTimestamp(), shopRevision: 3, witnessCount: 1 }
  const batch = writeBatch(db)
  batch.set(doc(db, `${GENERATION}/cancellations/${receipt.opId}`), receipt)
  batch.set(doc(db, `${GENERATION}/cancellations/${receipt.opId}/proofs/0`), { opId: receipt.opId, index: 0 })
  batch.set(doc(db, `${GENERATION}/orders/${saved.opId}`), { ...saved, status: 'cancelled', cancellationId: receipt.opId, cancelledAt: serverTimestamp() })
  batch.set(doc(db, ROOT), { ...f.nextShop, revision: 3, lastOpId: receipt.opId, lastOpKind: 'cancel' })
  for (let i = 0; i < f.nextMaterials.length; i++) {
    const before = f.nextMaterials[i], next = structuredClone(before), row = saved.inventory[i]
    const offset = row.four?.offset || 0, takes = row.four?.takes || [row.take0, row.take1]
    takes.forEach((take, j) => { next.lots[offset + j].qty += take })
    next.stock += takes.reduce((n, take) => n + take, 0)
    if (!next.activeLotId) {
      const active = next.lots.find(l => l.qty > 0)
      if (active) { active.isInUse = true; next.activeLotId = active.id }
    }
    next.revision++; next.lastOpId = receipt.opId; next.lastOpKind = 'cancel'; next.lastOpIndex = i
    if (i === 0 && mode === 'prefix metadata') next.lots[0].receiveDay++
    if (i === 0 && mode === 'suffix ID') next.lots.at(-1).id = 'FORGED-RETURN'
    if (i === 0 && mode === 'extra returned stock') { next.lots[offset].qty++; next.stock++ }
    batch.set(doc(db, `${GENERATION}/materials/${next.id}`), next)
  }
  if (mode !== 'valid') {
    await assertFails(batch.commit())
    expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
    expect((await getDoc(doc(db, `${GENERATION}/materials/YOGURT`))).data().stock).toBe(f.nextMaterials[0].stock)
    return
  }
  await assertSucceeds(batch.commit())
  const restored = (await getDoc(doc(db, `${GENERATION}/materials/YOGURT`))).data()
  expect(restored.lots).toEqual(f.materials[0].lots)
  expect(restored.stock).toBe(f.materials[0].stock)
})
