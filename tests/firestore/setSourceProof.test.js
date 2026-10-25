import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc } from 'firebase/firestore'
import { createRulesTest } from './helpers.js'
import { ROOT, GENERATION } from './proofFixture.js'
import { seedSetCatalog, setSaleBatch } from './setCatalogFixture.js'
import { sourceSetFixture } from './setCatalogSourceAdapter.js'
import { prepareStockMaterial,planSetStockIn,setStockInBatch } from './setStockInFixture.js'
import { encodeLegacyId } from '../../src/cloud/paths.js'

// Opt-in local source check. Never require a user's backup for CI and never
// serialize the backup, historical orders or external URLs into repo fixtures.
const sourcePath = process.env.GY_SOURCE_BACKUP
let env, bytes, source
beforeAll(async () => {
  if (!sourcePath) return
  bytes = await readFile(sourcePath)
  source = JSON.parse(bytes.toString('utf8'))
  env = await createRulesTest({ rules: await readFile(new URL('./candidates/set-catalog.rules', import.meta.url), 'utf8') })
})
beforeEach(async () => { if (env) await env.clearFirestore() })
afterAll(async () => {
  await env?.cleanup()
  if (sourcePath) expect(createHash('sha256').update(await readFile(sourcePath)).digest('hex')).toBe(createHash('sha256').update(bytes).digest('hex'))
})

it.runIf(Boolean(sourcePath)).each([{ fruit: true }, { allOptions: true }, { allOptions: true, lines: 6 }])('checks supplied source catalog with $lines lines, fruit=$fruit', async options => {
  const f = sourceSetFixture(source, options)
  await seedSetCatalog(env, f)
  const db = env.authenticatedContext('cashier').firestore()
  await assertSucceeds(setSaleBatch(db, f).commit())
  expect((await getDoc(doc(db, ROOT))).data().revision).toBe(2)
  const receipt = (await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).data()
  expect(receipt.materialIds.length).toBeLessThanOrEqual(15)
  expect(receipt.lines[0].optionIds.length).toBe(options.fruit ? 3 : 11)
})

it.runIf(Boolean(sourcePath))('uses each active source platform with its own prices and GP', async () => {
  const active = source.platforms.filter(platform => platform.isActive !== false)
  for (let platformIndex = 0; platformIndex < active.length; platformIndex++) {
    await env.clearFirestore()
    const f = sourceSetFixture(source, { allOptions: true, lines: 6, platformIndex })
    await seedSetCatalog(env, f)
    const db = env.authenticatedContext('cashier').firestore()
    await assertSucceeds(setSaleBatch(db, f).commit())
    const receipt = (await getDoc(doc(db, `${GENERATION}/orders/${f.order.opId}`))).data()
    expect(receipt.platformId).toBe(f.order.platformId)
    expect(receipt.gpCents).toBe(f.order.gpCents)
    expect(receipt.subtotalCents).toBe(f.order.subtotalCents)
  }
})

it.runIf(Boolean(sourcePath)).each(['ingredient','packaging'])('receives and merges stock using source %s units and costs',async inventoryType=>{
  const f=sourceSetFixture(source)
  const raw=source.materials.find(m=>m.inventoryType===inventoryType && m.lots?.length===1)
  const index=f.materials.findIndex(m=>m.id===encodeLegacyId(raw.id))
  expect(f.materials[index].packSize).toBe(Number(raw.packSize)>0 ? Number(raw.packSize) : 1)
  const m=prepareStockMaterial(f.materials[index]);f.materials[index]=m
  const old=m.lots[m.lotIds[0]]
  expect(old.initialQtyQ).toBe(Math.round((Number(raw.lots[0].initialQty)||0)*100))
  const stock=planSetStockIn(f.shop,m,{qtyQ:100,unitCost:0,receiveDay:old.receiveDay,expiryDay:old.expiryDay})
  await seedSetCatalog(env,f)
  await assertSucceeds(setStockInBatch(env.authenticatedContext('cashier').firestore(),stock).commit())
})
