import { readFile } from 'node:fs/promises'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertSucceeds } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { businessDateKey } from '../../src/domain/businessDate.js'
import { mixedLotFixture } from './mixedLotFixture.js'
import { seedProof, saleBatch } from './proofFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules', import.meta.url), 'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it.each([3, 4])('keeps unused stock and the correct active lot with six lines and %i lots', async lotCount => {
  const f = mixedLotFixture({ lotCount, prepare: fixture => {
    const m = fixture.materials[0]
    for (const lot of m.lots) lot.qty = 25000
    m.stock = lotCount * 25000
  } })
  expect(f.order.inventory[0].shortage).toBe(0)
  expect(f.nextMaterials[0].activeLotId).toBe('YOGURT-1')
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})

it.each([0, -1])('applies the Bangkok business day to an active lot expiring at offset %i', async offset => {
  const day = Math.floor(Date.parse(`${businessDateKey(new Date())}T00:00:00Z`) / 86400000)
  const f = mixedLotFixture({ prepare: fixture => {
    const m = fixture.materials[0]
    for (const lot of m.lots) lot.qty = 25000
    m.stock = 100000
    m.lots[0].expiryDay = day + offset
  } })
  expect(f.order.inventory[0].four.takes[0]).toBe(offset === 0 ? 25000 : 0)
  if (offset < 0) expect(f.nextMaterials[0].lots[0].qty).toBe(25000)
  await seedProof(env, f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(), f).commit())
})
