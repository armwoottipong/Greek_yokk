import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { GENERATION, seedProof, saleBatch } from './proofFixture.js'
import { mixedLotFixture } from './mixedLotFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it.each([3, 4])('accepts six option-bearing lines with %i lots on one ingredient', async lotCount => {
  const f = mixedLotFixture({ lotCount })
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([2, 3])('accepts six option-bearing lines with four lots on %i ingredients', async multiMaterials => {
  const f = mixedLotFixture({ multiMaterials })
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([
  ['changed final lot metadata', f => { f.nextMaterials[0].lots[3].receiveDay++ }],
  ['coherent forged deduction', f => {
    const row = f.order.inventory[0]
    row.four.takes[3]--
    row.shortage++
    f.order.approvedShortages[row.materialId]++
    f.nextMaterials[0].lots[3].qty++
    f.nextMaterials[0].stock++
  }],
  ['wrong operation kind', f => { f.nextMaterials[0].lastOpKind = 'produce' }],
])('rejects %s on the combined six-line multi-lot route', async (_label, alter) => {
  const f = mixedLotFixture()
  await seedProof(env, f)
  alter(f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(saleBatch(db, f).commit())
  expect((await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).exists()).toBe(false)
  expect((await getDoc(doc(db, `${GENERATION}/materials/${f.materials[0].id}`))).data().stock).toBe(f.materials[0].stock)
})

it('rejects omitted multi-lot proof atomically on a six-line bill', async () => {
  const f = mixedLotFixture()
  await seedProof(env, f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(), f, { omitWitness: 0 }).commit())
})
