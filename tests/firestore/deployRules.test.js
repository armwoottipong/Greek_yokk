import { readFile } from 'node:fs/promises'
import { beforeAll, afterAll, it } from 'vitest'
import { assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'

let env
beforeAll(async () => {
  const rules = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8')
  env = await createRulesTest({ rules })
})
afterAll(async () => { await env?.cleanup() })

it('keeps the deployable policy closed even for an authenticated owner claim', async () => {
  const db = env.authenticatedContext('owner', { role: 'owner' }).firestore()
  await assertFails(getDoc(doc(db, 'shops/anything')))
  await assertFails(setDoc(doc(db, 'shops/anything'), { status: 'active' }))
})
