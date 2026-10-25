import { initializeTestEnvironment } from '@firebase/rules-unit-testing'

export const PROJECT_ID = 'demo-greek-yogg'

export function assertEmulatorTarget(projectId, host = process.env.FIRESTORE_EMULATOR_HOST) {
  if (!projectId?.startsWith('demo-')) throw new Error('Tests require a demo- project ID')
  if (host !== '127.0.0.1:8088') throw new Error('Tests require the local Firestore Emulator at 127.0.0.1:8088')
}

export async function createRulesTest({ projectId = PROJECT_ID, rules }) {
  assertEmulatorTarget(projectId)
  return initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8088, rules } })
}

export async function withRulesTest(options, fn) {
  const env = await createRulesTest(options)
  try { return await fn(env) } finally { await env.cleanup() }
}
