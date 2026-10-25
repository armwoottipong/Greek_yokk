// @vitest-environment node
import { afterEach, expect, it } from 'vitest'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'

const exec = promisify(execFile)
const folders = []
afterEach(async () => { for (const folder of folders.splice(0)) await rm(folder, { recursive: true, force: true }) })
async function files() {
  const folder = await mkdtemp(join(tmpdir(), 'yogg-preflight-')); folders.push(folder)
  const snapshot = join(folder, 'backup.json'), bounds = join(folder, 'bounds.json')
  await writeFile(snapshot, JSON.stringify({ schemaVersion: 4, materials: [], menus: [], addons: [], platforms: [{ id: 'P', gpPercent: 0, isActive: true }] }))
  await writeFile(bounds, JSON.stringify({ maxStoredLots: 4, maxQuantityQ: 1000000000, maxMaterialsPerBill: 12, maxProductionInputs: 3, maxGroupsPerMenu: 4, maxOptionsPerLine: 2 }))
  return { snapshot, bounds }
}

it('runs a read-only backup inspection with explicit bounds and no Firebase credentials', async () => {
  const { snapshot, bounds } = await files(), before = await readFile(snapshot, 'utf8')
  const { stdout } = await exec(process.execPath, ['scripts/firebase-preflight.mjs', '--input', snapshot, '--constraints', bounds])
  const report = JSON.parse(stdout)
  expect(report).toMatchObject({ ok: true, inspectionOnly: true, stats: { materials: 0, orders: 0 }, productionReady: false })
  expect(report).not.toHaveProperty('snapshot')
  expect(await readFile(snapshot, 'utf8')).toBe(before)
})

it('uses a nonzero exit for a blocked backup and reports only diagnostics', async () => {
  const { snapshot, bounds } = await files()
  await writeFile(snapshot, JSON.stringify({ materials: 'bad' }))
  try {
    await exec(process.execPath, ['scripts/firebase-preflight.mjs', '--input', snapshot, '--constraints', bounds])
    throw new Error('expected blocked inspection')
  } catch (error) {
    expect(error.code).toBe(2)
    expect(JSON.parse(error.stdout)).toMatchObject({ ok: false, inspectionOnly: true, code: 'INVALID_SNAPSHOT' })
  }
})

it('requires explicit constraints and rejects unknown arguments without inspecting', async () => {
  const { snapshot } = await files()
  for (const args of [['--input', snapshot], ['--input', snapshot, '--deploy']]) {
    await expect(exec(process.execPath, ['scripts/firebase-preflight.mjs', ...args])).rejects.toMatchObject({ code: 1 })
  }
})
