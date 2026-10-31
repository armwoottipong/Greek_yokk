// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { createCommandJournal } from '../../src/cloud/journal.js'

const scope = { projectId: 'demo-yogg', shopId: 'shop', generation: 'g1', uid: 'alice', deviceId: 'device' }
const command = (opId = 'sale-1') => ({ opId, kind: 'sale', payload: { lines: [{ menuId: 'm1', qty: 2 }] } })
let indexedDB
let now
const make = (ownerId = 'tab-a', options = {}) => createCommandJournal({ indexedDB, ownerId, now: () => now, leaseMs: 1000, ...options })

beforeEach(() => { indexedDB = new IDBFactory(); now = 1000 })

describe('durable scoped command journal', () => {
  it('atomically closes a never-sent command and keeps its terminal record for other tabs',async()=>{
    const journal=make();await journal.prepare(scope,command())
    expect(await journal.rejectUnsent(scope,'sale-1')).toMatchObject({receipt:{rejected:true,code:'NOT_SUBMITTED'}})
    expect(await journal.listUnresolved(scope)).toEqual([])
    expect(await make('tab-b').inspect(scope,'sale-1')).toMatchObject({state:'resolved',receipt:{rejected:true}})
    await expect(journal.claim(scope,'sale-1')).rejects.toMatchObject({code:'ALREADY_RESOLVED'})
  })
  it('never closes an attempted command without server evidence',async()=>{
    const journal=make();await journal.prepare(scope,command());const c=await journal.claim(scope,'sale-1')
    await journal.markSending(scope,'sale-1',c.token)
    await expect(journal.rejectUnsent(scope,'sale-1')).rejects.toMatchObject({code:'RETRY_REQUIRED'})
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
  })
  it('persists before returning, survives reopening, and copies caller data', async () => {
    const journal = make()
    const envelope = command()
    await journal.prepare(scope, envelope)
    envelope.payload.lines[0].qty = 99
    await journal.close()
    const reopened = make('tab-b')
    expect((await reopened.listUnresolved(scope))[0].envelope.payload.lines[0].qty).toBe(2)
  })

  it('serializes two-tab preparation so only one unresolved command exists', async () => {
    const results = await Promise.allSettled([make().prepare(scope, command('a')), make('tab-b').prepare(scope, command('b'))])
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.find(r => r.status === 'rejected').reason.code).toBe('PENDING_COMMAND')
    expect(await make().listUnresolved(scope)).toHaveLength(1)
  })

  it('reuses identical ID and payload regardless of object key order; rejects changed data', async () => {
    const journal = make()
    await journal.prepare(scope, command())
    await expect(journal.prepare(scope, { payload: command().payload, kind: 'sale', opId: 'sale-1' })).resolves.toMatchObject({ envelope: command() })
    await expect(journal.prepare(scope, { ...command(), payload: { qty: 3 } })).rejects.toMatchObject({ code: 'COMMAND_MISMATCH' })
  })

  it.each(['uid', 'shopId', 'generation', 'projectId', 'deviceId'])('isolates records by %s', async field => {
    const journal = make()
    await journal.prepare(scope, command())
    expect(await journal.listUnresolved({ ...scope, [field]: 'different' })).toEqual([])
  })

  it('allows only one tab to claim; expired takeover retains pending command and requires reconciliation', async () => {
    const first = make()
    const second = make('tab-b')
    await first.prepare(scope, command())
    const claims = await Promise.allSettled([first.claim(scope, 'sale-1'), second.claim(scope, 'sale-1')])
    expect(claims.filter(r => r.status === 'fulfilled')).toHaveLength(1)
    const owner = claims[0].status === 'fulfilled' ? first : second
    const other = owner === first ? second : first
    const initial = claims.find(r => r.status === 'fulfilled').value
    expect(initial.mustReconcile).toBe(false)
    await owner.markSending(scope, 'sale-1', initial.token)
    now += 1001
    const takeover = await other.claim(scope, 'sale-1')
    expect(takeover.mustReconcile).toBe(true)
    expect(takeover.envelope.opId).toBe('sale-1')
    await expect(owner.markUncertain(scope, 'sale-1', initial.token)).rejects.toMatchObject({ code: 'CLAIM_LOST' })
    await expect(other.prepare(scope, command('fresh-id'))).rejects.toMatchObject({ code: 'PENDING_COMMAND' })
  })

  it('fences concurrent double-click claims even in the same tab', async () => {
    const journal = make()
    await journal.prepare(scope, command())
    const claims = await Promise.allSettled([journal.claim(scope, 'sale-1'), journal.claim(scope, 'sale-1')])
    expect(claims.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  })

  it('keeps uncertain commands through reload and resolves only matching receipts', async () => {
    const journal = make()
    await journal.prepare(scope, command())
    const claim = await journal.claim(scope, 'sale-1')
    await journal.markSending(scope, 'sale-1', claim.token)
    await journal.markUncertain(scope, 'sale-1', claim.token)
    await expect(journal.resolve(scope, 'sale-1', { opId: 'wrong', kind: 'sale' })).rejects.toMatchObject({ code: 'RECEIPT_MISMATCH' })
    expect(await make('tab-b').listUnresolved(scope)).toHaveLength(1)
    await journal.resolve(scope, 'sale-1', { opId: 'sale-1', kind: 'sale', totalCents: 100 })
    expect(await journal.listUnresolved(scope)).toEqual([])
    const previous = await journal.prepare(scope, command())
    expect(previous.state).toBe('resolved')
    await journal.prepare(scope, command('next'))
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
  })

  it.each([undefined, NaN, Infinity, () => {}, 1n, new Date()])('rejects non-JSON payload value %s before storing', async value => {
    const journal = make()
    await expect(journal.prepare(scope, { ...command(), payload: { value } })).rejects.toMatchObject({ code: 'INVALID_COMMAND' })
    expect(await journal.listUnresolved(scope)).toEqual([])
  })

  it('rejects sparse arrays, cycles, and extra envelope fields', async () => {
    const journal = make()
    const cyclic = {}; cyclic.self = cyclic
    for (const payload of [Array(2), cyclic]) {
      await expect(journal.prepare(scope, { ...command(), payload })).rejects.toMatchObject({ code: 'INVALID_COMMAND' })
    }
    await expect(journal.prepare(scope, { ...command(), extra: true })).rejects.toMatchObject({ code: 'INVALID_COMMAND' })
  })

  it('reports unavailable local storage instead of accepting a non-durable command', async () => {
    const journal = make('tab-a', { indexedDB: { open() { throw new Error('blocked') } } })
    await expect(journal.prepare(scope, command())).rejects.toMatchObject({ code: 'LOCAL_JOURNAL_FAILED' })
  })

  it('rolls back the command if writing its pending pointer fails', async () => {
    const journal = make()
    const add = IDBObjectStore.prototype.add
    const spy = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (...args) {
      if (this.name === 'pending') throw new DOMException('quota', 'QuotaExceededError')
      return add.apply(this, args)
    })
    try {
      await expect(journal.prepare(scope, command())).rejects.toMatchObject({ code: 'LOCAL_JOURNAL_FAILED' })
    } finally { spy.mockRestore() }
    expect(await journal.listUnresolved(scope)).toEqual([])
    // A different payload with the same ID would fail if the first write survived.
    await expect(journal.prepare(scope, { ...command(), payload: { qty: 99 } })).resolves.toMatchObject({ state: 'prepared' })
  })

  it('an uncertain pre-send claim still requires reconciliation on the next attempt', async () => {
    const journal = make()
    await journal.prepare(scope, command())
    const claim = await journal.claim(scope, 'sale-1')
    await journal.markUncertain(scope, 'sale-1', claim.token)
    expect(await journal.claim(scope, 'sale-1')).toMatchObject({ mustReconcile: true })
  })

  it('rejects a non-string operation ID', async () => {
    await expect(make().prepare(scope, { ...command(), opId: 1 })).rejects.toMatchObject({ code: 'INVALID_COMMAND' })
  })
})
it.each(['stock_count','switch_lot','material_create','material_archive','material_metadata','material_measure','material_details','material_type','production_recipe','receive'])('durably retains certified %s commands',async kind=>{
 const journal=make(),envelope={opId:'INVENTORY',kind,payload:{expectedRevision:3}}
 await journal.prepare(scope,envelope);expect((await journal.listUnresolved(scope))[0].envelope).toEqual(envelope)
})
it('rejects commands outside the journal allowlist',async()=>{
 await expect(make().prepare(scope,{opId:'UNSUPPORTED',kind:'anything',payload:{}})).rejects.toMatchObject({code:'INVALID_COMMAND'})
})
