const SCOPE_FIELDS = ['projectId', 'shopId', 'generation', 'uid', 'deviceId']
const failure = code => ({ ok: false, code })
const raised = code => Object.assign(new Error(code), { code })

/** Prepared coordinator, deliberately without Firebase imports or a default commit.
 * Production adapters MUST use server-only receipt reads and one idempotent atomic
 * transaction. protocolCertified is an internal integration gate, not a user role.
 * No timer, online listener, or background task automatically retries commands.
 */
export function createCommandExecutor({ journal, getContext, getReceipt, commit }) {
  function guard(scope) {
    const context = getContext()
    if (!context || SCOPE_FIELDS.some(key => !scope?.[key] || context[key] !== scope[key])) throw raised('CONTEXT_CHANGED')
    if (context.protocolCertified !== true) throw raised('PROTOCOL_NOT_CERTIFIED')
    if (context.online !== true) throw raised('OFFLINE')
    if (context.ready !== true) throw raised('NOT_READY')
  }

  async function execute(scope, envelope) {
    let claim
    let record
    let attempted = false
    let resolved = false
    try {
      guard(scope)
      record = await journal.prepare(scope, envelope)
      guard(scope)
      if (record.state === 'resolved') return { ok: true, value: record.receipt }
      claim = await journal.claim(scope, record.envelope.opId)
      guard(scope)
      // Use the persisted immutable payload, never the caller's mutable object.
      const persisted = claim.envelope
      if (claim.mustReconcile) {
        const receipt = await getReceipt(scope, persisted.kind, persisted.opId)
        guard(scope)
        if (receipt) {
          await journal.resolve(scope, persisted.opId, receipt)
          resolved = true
          guard(scope)
          return { ok: true, value: receipt }
        }
        // A not-found read permits only an explicit same-ID idempotent retry.
      }
      await journal.markSending(scope, persisted.opId, claim.token)
      guard(scope)
      attempted = true
      const receipt = await commit(scope, persisted)
      await journal.resolve(scope, persisted.opId, receipt)
      resolved = true
      guard(scope)
      return { ok: true, value: receipt }
    } catch (error) {
      if (claim && !resolved) {
        try { await journal.markUncertain(scope, claim.envelope.opId, claim.token) } catch { /* retain durable sending record for recovery */ }
      }
      const causeCode=error?.code||'UNKNOWN'
      if ((attempted || record?.attempted || causeCode==='COMMAND_BUSY') && !resolved) return {...failure(attempted||causeCode==='COMMAND_BUSY'?'PENDING_RESULT':causeCode),causeCode,outcome:'uncertain'}
      return {...failure(causeCode==='UNKNOWN'?'PENDING_RESULT':causeCode),causeCode,outcome:record?'prepared':'blocked'}
    }
  }

  async function reconcile(scope) {
    try {
      guard(scope)
      const records = await journal.listUnresolved(scope)
      guard(scope)
      if (!records.length) return { ok: true, value: null }
      const { envelope } = records[0]
      const receipt = await getReceipt(scope, envelope.kind, envelope.opId)
      guard(scope)
      if (!receipt) return failure('PENDING_RESULT')
      await journal.resolve(scope, envelope.opId, receipt)
      guard(scope)
      return { ok: true, value: receipt }
    } catch (error) {
      return failure(error?.code || 'PENDING_RESULT')
    }
  }

  return { execute, reconcile }
}
