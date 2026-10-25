import { readFile } from 'node:fs/promises'
import { beforeAll, afterAll, beforeEach, it, expect } from 'vitest'
import { assertSucceeds, assertFails } from '@firebase/rules-unit-testing'
import { createRulesTest } from './helpers.js'
import { seedProof, saleBatch } from './proofFixture.js'
import { realMenuFixture } from './realMenuFixture.js'

let env
beforeAll(async () => { env = await createRulesTest({ rules: await readFile(new URL('./candidate.rules',import.meta.url),'utf8') }) })
beforeEach(async () => { await env.clearFirestore() })
afterAll(async () => { await env?.cleanup() })

it.each([
  ['MENU01','MENU02',5], ['MENU03','MENU03',7], ['MENU03','MENU04',10]
])('accepts shipped menus %s + %s across %i materials with exact existing-domain costs', async (a,b,count) => {
  const f = realMenuFixture([a,b])
  expect(f.materials).toHaveLength(count)
  await seedProof(env,f)
  await assertSucceeds(saleBatch(env.authenticatedContext('cashier').firestore(),f).commit())
})

it('rejects omission of either witness on the real ten-material sale', async () => {
  const f = realMenuFixture()
  await seedProof(env,f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertFails(saleBatch(db,f,{omitWitness:0}).commit())
  await assertFails(saleBatch(db,f,{omitWitness:1}).commit())
})

it('rejects an omitted material in the second real-menu witness', async () => {
  const f = realMenuFixture()
  await seedProof(env,f)
  await assertFails(saleBatch(env.authenticatedContext('cashier').firestore(),f,{omitMaterial:f.materials[8].id}).commit())
})
