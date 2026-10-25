// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { IDBFactory } from 'fake-indexeddb'
import { createCommandJournal } from '../../src/cloud/journal.js'
import { createCommandExecutor } from '../../src/cloud/commandExecutor.js'

const scope = { projectId: 'demo-yogg', shopId: 'shop', generation: 'g1', uid: 'alice', deviceId: 'device' }
const envelope = { opId: 'sale-1', kind: 'sale', payload: { qty: 2 } }
const receipt = { opId: 'sale-1', kind: 'sale', totalCents: 100 }
let journal, context, getReceipt, commit, executor
beforeEach(() => {
  journal = createCommandJournal({ indexedDB: new IDBFactory(), ownerId: 'tab' })
  context = { ...scope, online: true, ready: true, protocolCertified: true }
  getReceipt = vi.fn().mockResolvedValue(null)
  commit = vi.fn().mockResolvedValue(receipt)
  executor = createCommandExecutor({ journal, getContext: () => context, getReceipt, commit })
})

describe('isolated command execution coordinator', () => {
  it.each([
    [{ online: false }, 'OFFLINE'], [{ ready: false }, 'NOT_READY'],
    [{ protocolCertified: false }, 'PROTOCOL_NOT_CERTIFIED'], [{ uid: 'bob' }, 'CONTEXT_CHANGED'],
  ])('blocks before storage/network for context %s', async (change, code) => {
    Object.assign(context, change)
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code })
    expect(commit).not.toHaveBeenCalled()
    expect(getReceipt).not.toHaveBeenCalled()
    expect(await journal.listUnresolved(scope)).toEqual([])
  })

  it('makes no network calls if durable journal preparation fails', async () => {
    const broken = createCommandExecutor({ journal: { prepare: async () => { throw Object.assign(new Error(), { code: 'LOCAL_JOURNAL_FAILED' }) } }, getContext: () => context, getReceipt, commit })
    expect(await broken.execute(scope, envelope)).toMatchObject({ ok: false, code: 'LOCAL_JOURNAL_FAILED' })
    expect(commit).not.toHaveBeenCalled()
    expect(getReceipt).not.toHaveBeenCalled()
  })

  it('persists sending state before commit and never submits twice on double click', async () => {
    commit.mockImplementation(async () => {
      expect((await journal.listUnresolved(scope))[0]).toMatchObject({ state: 'sending', attempted: true })
      return receipt
    })
    const results = await Promise.all([executor.execute(scope, envelope), executor.execute(scope, envelope)])
    expect(results.filter(r => r.ok)).toHaveLength(1)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(await journal.listUnresolved(scope)).toEqual([])
  })

  it('recovers a committed sale after lost response without another commit', async () => {
    commit.mockRejectedValue(new Error('response lost'))
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'PENDING_RESULT' })
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
    getReceipt.mockResolvedValue(receipt)
    expect(await executor.reconcile(scope)).toMatchObject({ ok: true, value: receipt })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(await journal.listUnresolved(scope)).toEqual([])
  })

  it('does not treat a missing receipt as a failed sale or automatically retry', async () => {
    commit.mockRejectedValue(new Error('timeout'))
    await executor.execute(scope, envelope)
    expect(await executor.reconcile(scope)).toMatchObject({ ok: false, code: 'PENDING_RESULT' })
    expect(commit).toHaveBeenCalledTimes(1)
    expect(await executor.execute(scope, { ...envelope, opId: 'new-sale' })).toMatchObject({ ok: false, code: 'PENDING_COMMAND' })
    commit.mockResolvedValue(receipt)
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: true, value: receipt })
    expect(commit).toHaveBeenLastCalledWith(scope, envelope)
    expect(getReceipt).toHaveBeenCalledWith(scope, 'sale', 'sale-1')
  })

  it('rechecks identity after journal preparation, before any network call', async () => {
    const prepare = journal.prepare
    journal.prepare = async (...args) => { const record = await prepare(...args); context.uid = 'bob'; return record }
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'CONTEXT_CHANGED' })
    expect(commit).not.toHaveBeenCalled()
    expect(getReceipt).not.toHaveBeenCalled()
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
  })

  it('rechecks network after a recovery read before allowing a retry', async () => {
    commit.mockRejectedValue(new Error('lost'))
    await executor.execute(scope, envelope)
    getReceipt.mockImplementation(async () => { context.online = false; return null })
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'OFFLINE' })
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('retains pending command when a receipt has a mismatched operation', async () => {
    commit.mockResolvedValue({ ...receipt, opId: 'wrong' })
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'PENDING_RESULT' })
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
  })

  it('a replay of a resolved command cannot clear a newer unresolved command', async () => {
    await executor.execute(scope, envelope)
    await journal.prepare(scope, { ...envelope, opId: 'next' })
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: true, value: receipt })
    expect((await journal.listUnresolved(scope))[0].envelope.opId).toBe('next')
    expect(commit).toHaveBeenCalledTimes(1)
  })

  it('never commits if persisting the sending state fails', async () => {
    journal.markSending = async () => { throw Object.assign(new Error(), { code: 'LOCAL_JOURNAL_FAILED' }) }
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'LOCAL_JOURNAL_FAILED' })
    expect(commit).not.toHaveBeenCalled()
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
  })

  it('recovers from a journal resolution failure after the server has committed', async () => {
    const resolve = journal.resolve
    journal.resolve = async () => { throw Object.assign(new Error(), { code: 'LOCAL_JOURNAL_FAILED' }) }
    expect(await executor.execute(scope, envelope)).toMatchObject({ ok: false, code: 'PENDING_RESULT' })
    expect(await journal.listUnresolved(scope)).toHaveLength(1)
    journal.resolve = resolve
    getReceipt.mockResolvedValue(receipt)
    expect(await executor.reconcile(scope)).toMatchObject({ ok: true, value: receipt })
    expect(commit).toHaveBeenCalledTimes(1)
  })
})
