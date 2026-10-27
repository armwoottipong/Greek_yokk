const SCOPE_FIELDS = ['projectId', 'shopId', 'generation', 'uid', 'deviceId']
const fail = code => Object.assign(new Error(code), { code })

// Strict JSON: never silently discard undefined values or coerce dates/non-finite numbers.
function canonical(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (typeof value !== 'object' || ancestors.has(value)) throw fail('INVALID_COMMAND')
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype) throw fail('INVALID_COMMAND')
  if (Object.getOwnPropertySymbols(value).length) throw fail('INVALID_COMMAND')
  ancestors.add(value)
  let result
  if (Array.isArray(value)) {
    if (Object.keys(value).length !== value.length) throw fail('INVALID_COMMAND')
    result = `[${Array.from({ length: value.length }, (_, i) => {
      if (!Object.hasOwn(value, i)) throw fail('INVALID_COMMAND')
      return canonical(value[i], ancestors)
    }).join(',')}]`
  } else {
    result = `{${Object.keys(value).sort().map(key => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw fail('INVALID_COMMAND')
      return `${JSON.stringify(key)}:${canonical(descriptor.value, ancestors)}`
    }).join(',')}}`
  }
  ancestors.delete(value)
  return result
}

function scopeKey(scope) {
  if (!scope || SCOPE_FIELDS.some(key => typeof scope[key] !== 'string' || !scope[key].trim() || scope[key].length > 256)) throw fail('INVALID_SCOPE')
  return JSON.stringify(SCOPE_FIELDS.map(key => scope[key]))
}

function commandJson(envelope) {
  if (!envelope || Object.keys(envelope).sort().join(',') !== 'kind,opId,payload' ||
    typeof envelope.opId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(envelope.opId) ||
    !['sale', 'cancel', 'produce', 'inventory', 'catalog', 'menu', 'addon', 'group', 'receive', 'history_clear', 'stock_count', 'switch_lot', 'material_create', 'material_archive', 'material_delete', 'material_metadata', 'material_measure', 'material_details', 'material_type', 'production_recipe'].includes(envelope.kind)) throw fail('INVALID_COMMAND')
  return canonical(envelope)
}

const requestResult = request => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

/** Local durability and tab coordination only. A claim is never permission to write
 * Firebase. Transport must check identity/network and reconcile attempted commands.
 * Browser storage can be evicted/cleared; receipts on the server remain authoritative.
 */
export function createCommandJournal({ indexedDB = globalThis.indexedDB,
  dbName = 'greek-yogg-command-journal-v1', ownerId = globalThis.crypto?.randomUUID(),
  now = Date.now, leaseMs = 15000 } = {}) {
  if (typeof ownerId !== 'string' || !ownerId || !Number.isFinite(leaseMs) || leaseMs <= 0) throw fail('INVALID_JOURNAL_CONFIG')
  let database
  let opening

  async function open() {
    if (database) return database
    if (!opening) opening = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 1)
      request.onupgradeneeded = () => {
        const records = request.result.createObjectStore('commands', { keyPath: 'key' })
        records.createIndex('scope', 'scopeKey')
        request.result.createObjectStore('pending', { keyPath: 'scopeKey' })
      }
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(fail('LOCAL_JOURNAL_FAILED'))
      request.onsuccess = () => {
        database = request.result
        database.onversionchange = () => { database.close(); database = undefined; opening = undefined }
        resolve(database)
      }
    }).catch(error => { opening = undefined; throw error })
    return opening
  }

  async function transaction(mode, run) {
    try {
      const db = await open()
      const tx = db.transaction(['commands', 'pending'], mode)
      const completed = new Promise((resolve, reject) => {
        tx.oncomplete = resolve
        tx.onabort = () => reject(tx.error || fail('LOCAL_JOURNAL_FAILED'))
        tx.onerror = () => {} // onabort reports the final transaction outcome.
      })
      try {
        const value = await run(tx.objectStore('commands'), tx.objectStore('pending'))
        await completed // Never report success merely because an individual put succeeded.
        return value
      } catch (error) {
        try { tx.abort() } catch { /* already completed or aborted */ }
        await completed.catch(() => {})
        throw error
      }
    } catch (error) {
      if (error?.code && typeof error.code === 'string') throw error
      throw fail('LOCAL_JOURNAL_FAILED')
    }
  }

  const keyFor = (sk, opId) => JSON.stringify([sk, opId])
  const view = record => ({ envelope: JSON.parse(record.json), state: record.state,
    attempted: record.attempted, createdAt: record.createdAt,
    ...(record.receiptJson ? { receipt: JSON.parse(record.receiptJson) } : {}) })

  async function withRecord(scope, opId, action) {
    const sk = scopeKey(scope)
    return transaction('readwrite', async (records, pending) => {
      const record = await requestResult(records.get(keyFor(sk, opId)))
      if (!record) throw fail('COMMAND_NOT_FOUND')
      return action(record, records, pending)
    })
  }

  return {
    async prepare(scope, envelope) {
      const sk = scopeKey(scope)
      const json = commandJson(envelope)
      const key = keyFor(sk, envelope.opId)
      return transaction('readwrite', async (records, pending) => {
        const existing = await requestResult(records.get(key))
        if (existing) {
          if (existing.json !== json) throw fail('COMMAND_MISMATCH')
          return view(existing)
        }
        if (await requestResult(pending.get(sk))) throw fail('PENDING_COMMAND')
        const record = { key, scopeKey: sk, json, state: 'prepared', attempted: false, createdAt: now(), epoch: 0 }
        records.add(record)
        pending.add({ scopeKey: sk, key })
        return view(record)
      })
    },
    async listUnresolved(scope) {
      const sk = scopeKey(scope)
      return transaction('readonly', async (records, pending) => {
        const pointer = await requestResult(pending.get(sk))
        if (!pointer) return []
        const record = await requestResult(records.get(pointer.key))
        if (!record || record.state === 'resolved') throw fail('JOURNAL_CORRUPT')
        return [view(record)]
      })
    },
    async claim(scope, opId) {
      return withRecord(scope, opId, (record, records) => {
        if (record.state === 'resolved') throw fail('ALREADY_RESOLVED')
        const time = now()
        if (record.ownerId && record.leaseUntil > time) throw fail('COMMAND_BUSY')
        const mustReconcile = record.attempted || record.state === 'uncertain' || Boolean(record.ownerId)
        record.epoch += 1
        record.ownerId = ownerId
        record.leaseUntil = time + leaseMs
        records.put(record)
        return { ...view(record), token: `${ownerId}:${record.epoch}`, mustReconcile }
      })
    },
    async markSending(scope, opId, token) {
      return withRecord(scope, opId, (record, records) => {
        if (record.state === 'resolved' || token !== `${record.ownerId}:${record.epoch}` || record.ownerId !== ownerId || record.leaseUntil <= now()) throw fail('CLAIM_LOST')
        record.state = 'sending'
        record.attempted = true
        records.put(record)
        return view(record)
      })
    },
    async markUncertain(scope, opId, token) {
      return withRecord(scope, opId, (record, records) => {
        if (record.state === 'resolved' || token !== `${record.ownerId}:${record.epoch}` || record.ownerId !== ownerId) throw fail('CLAIM_LOST')
        record.state = 'uncertain'
        record.ownerId = null
        record.leaseUntil = 0
        records.put(record)
        return view(record)
      })
    },
    async resolve(scope, opId, receipt) {
      const receiptJson = canonical(receipt)
      return withRecord(scope, opId, (record, records, pending) => {
        const envelope = JSON.parse(record.json)
        if (receipt?.opId !== opId || receipt?.kind !== envelope.kind) throw fail('RECEIPT_MISMATCH')
        if (record.state === 'resolved' && record.receiptJson !== receiptJson) throw fail('RECEIPT_MISMATCH')
        record.state = 'resolved'
        record.receiptJson = receiptJson
        record.ownerId = null
        record.leaseUntil = 0
        records.put(record)
        // A late replay of an old resolved receipt must not clear a newer command.
        return requestResult(pending.get(record.scopeKey)).then(pointer => {
          if (pointer?.key === record.key) pending.delete(record.scopeKey)
          return view(record)
        })
      })
    },
    async close() {
      if (opening) await opening.catch(() => {})
      database?.close()
      database = undefined
      opening = undefined
    },
  }
}
