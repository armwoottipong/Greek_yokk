import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

function loadCore() {
  const scope = {}
  runInNewContext(readFileSync('scripts/invitation-mailer/Core.js', 'utf8'), scope)
  return scope.InvitationMailer
}

function fixture(overrides = {}) {
  let document = { name: 'invitation/one', updateTime: 'v1', data: {
    email: 'friend@gmail.com', role: 'viewer', createdBy: 'admin-uid',
    createdAt: '2026-10-28T00:00:00Z', status: 'pending', ...overrides,
  } }
  const sent = []
  let revision = 1
  const deps = {
    now: () => 1000000, token: () => 'lease-one', quota: () => 10,
    root: () => ({ allowedEmails: { 'friend@gmail.com': true }, userRoles: { 'friend@gmail.com': 'viewer' } }),
    cas: (expected, patch) => {
      if (expected.updateTime !== document.updateTime) return null
      document = { ...document, updateTime: `v${++revision}`, data: { ...document.data, ...patch } }
      return document
    },
    send: mail => sent.push(mail),
  }
  return { deps, sent, get document() { return document } }
}

describe('trusted invitation worker', () => {
  it('sends one branded invitation, then skips the completed request', () => {
    const core = loadCore(), f = fixture(), initial = f.document
    expect(core.process(initial, f.deps)).toBe('sent')
    expect(core.process(f.document, f.deps)).toBe('skipped')
    expect(core.process(initial, f.deps)).toBe('contended')
    expect(f.sent).toHaveLength(1)
    expect(f.sent[0]).toMatchObject({ to: 'friend@gmail.com', name: 'Yoggie' })
    expect(f.sent[0].subject).toBe('แจ้งสิทธิ์เข้าใช้งาน Yoggie')
    expect(f.sent[0].body).toContain('ไม่ต้องกดยอมรับหรือยืนยันสิทธิ์ผ่านอีเมล')
    expect(f.sent[0].htmlBody).toContain('ไม่ต้องกดยอมรับหรือยืนยันสิทธิ์ผ่านอีเมล')
    expect(f.sent[0].body + f.sent[0].htmlBody).not.toContain('คำเชิญ')
    expect(f.sent[0].body).toContain('https://armwoottipong.github.io/Greek_yokk/')
    expect(f.sent[0].htmlBody).toContain('https://armwoottipong.github.io/Greek_yokk/brand/mascot.png')
    expect(f.sent[0].htmlBody).not.toContain(['Greek', 'Yogg'].join(' '))
    expect(f.document.data.status).toBe('sent')
  })

  it.each([
    [{ allowedEmails: {}, userRoles: {} }, 'access_changed'],
    [{ allowedEmails: { 'friend@gmail.com': true }, userRoles: { 'friend@gmail.com': 'admin' } }, 'access_changed'],
  ])('rechecks current access after claiming before sending: %s', (root, outcome) => {
    const core = loadCore(), f = fixture()
    f.deps.root = () => {
      expect(f.document.data.status).toBe('processing')
      return root
    }
    expect(core.process(f.document, f.deps)).toBe('cancelled')
    expect(f.sent).toHaveLength(0)
    expect(f.document.data.outcome).toBe(outcome)
  })

  it.each(['friend@gmail.com,other@gmail.com', 'friend@gmail.com\nBcc:other@gmail.com', '<img src=x>@gmail.com'])('rejects unsafe recipient %s', email => {
    const core = loadCore(), f = fixture({ email })
    expect(core.process(f.document, f.deps)).toBe('cancelled')
    expect(f.sent).toHaveLength(0)
  })

  it('leaves requests pending when the daily email quota is exhausted', () => {
    const core = loadCore(), f = fixture()
    f.deps.quota = () => 0
    expect(core.process(f.document, f.deps)).toBe('quota')
    expect(f.document.data.status).toBe('pending')
    expect(f.sent).toHaveLength(0)
  })

  it('never retries a send exception that may already have delivered', () => {
    const core = loadCore(), f = fixture()
    f.deps.send = mail => { f.sent.push(mail); throw new Error('connection lost') }
    expect(core.process(f.document, f.deps)).toBe('unknown')
    expect(core.process(f.document, f.deps)).toBe('skipped')
    expect(f.sent).toHaveLength(1)
  })

  it('does not reclaim an expired processing lease after a crashed send', () => {
    const core = loadCore(), f = fixture({ status: 'processing', leaseUntil: 1 })
    expect(core.process(f.document, f.deps)).toBe('unknown')
    expect(f.sent).toHaveLength(0)
  })

  it('does not send while another worker holds the processing lease', () => {
    const core = loadCore(), f = fixture({ status: 'processing', leaseUntil: 2000000 })
    expect(core.process(f.document, f.deps)).toBe('skipped')
    expect(f.sent).toHaveLength(0)
  })

  it('does not send if connectivity to the current allowlist fails', () => {
    const core = loadCore(), f = fixture()
    f.deps.root = () => { throw new Error('Firestore unavailable') }
    expect(core.process(f.document, f.deps)).toBe('unknown')
    expect(f.sent).toHaveLength(0)
  })

  it('stops before sending when its lease expired during the access check', () => {
    const core = loadCore(), f = fixture()
    f.deps.root = () => { f.deps.now = () => 99999999; return { allowedEmails: { 'friend@gmail.com': true } } }
    expect(core.process(f.document, f.deps)).toBe('unknown')
    expect(f.sent).toHaveLength(0)
  })

  it('supports legacy allowed accounts with no explicit role as viewers', () => {
    const core = loadCore(), f = fixture()
    f.deps.root = () => ({ allowedEmails: { 'friend@gmail.com': true } })
    expect(core.process(f.document, f.deps)).toBe('sent')
    expect(f.sent).toHaveLength(1)
  })

  it('leaves a post-send persistence failure uncertain without sending again', () => {
    const core = loadCore(), f = fixture(), cas = f.deps.cas
    f.deps.cas = (document, patch) => {
      if (patch.status === 'sent') throw new Error('commit unavailable')
      return cas(document, patch)
    }
    expect(core.process(f.document, f.deps)).toBe('unknown')
    expect(core.process(f.document, f.deps)).toBe('skipped')
    expect(f.sent).toHaveLength(1)
  })
})

function loadAdapter(overrides = {}) {
  const requests = []
  const scope = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => null }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'armwoottipong@gmail.com' }) },
    ScriptApp: { getOAuthToken: () => 'private-runtime-token' },
    UrlFetchApp: { fetch: (url, options) => {
      requests.push({ url, options })
      return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ writeResults: [{ updateTime: 'v2' }] }) }
    } },
    ...overrides,
  }
  runInNewContext(readFileSync('scripts/invitation-mailer/Code.gs', 'utf8'), scope)
  return { scope, requests }
}

describe('Apps Script Firestore adapter', () => {
  it('reports permission diagnostic enums without leaking response data', () => {
    const { scope } = loadAdapter({ UrlFetchApp: { fetch: () => ({
      getResponseCode: () => 403,
      getContentText: () => JSON.stringify({ error: {
        message: 'private-response', details: [{ reason: 'ACCESS_TOKEN_SCOPE_INSUFFICIENT' }, { reason: 'private@example.com' }],
      } }),
    }) } })
    expect(() => scope.yoggieApi_('test')).toThrow('Firestore HTTP 403 [ACCESS_TOKEN_SCOPE_INSUFFICIENT]')
  })
  it('embeds one validated PNG per invocation with CID and no recipient remote-image request', () => {
    const sent = [], fetched = []
    const bytes = [137, 80, 78, 71, 13, 10, 26, 10, ...Array(40).fill(0)]
    const blob = { getContentType: () => 'image/png', getBytes: () => bytes, setName() { return this } }
    const { scope } = loadAdapter({
      UrlFetchApp: { fetch: (url, options) => {
        fetched.push({ url, options })
        return { getResponseCode: () => 200, getBlob: () => blob }
      } },
      MailApp: { sendEmail: message => sent.push(message) },
    })
    const sender = scope.yoggieSender_()
    const message = { to: 'friend@gmail.com', name: 'Yoggie', body: 'Open Yoggie', htmlBody: '<img src="https://armwoottipong.github.io/Greek_yokk/brand/mascot.png">' }
    sender(message)
    sender({ ...message, to: 'second@gmail.com' })
    expect(fetched).toHaveLength(1)
    expect(fetched[0].url).toBe('https://armwoottipong.github.io/Greek_yokk/brand/mascot.png')
    expect(fetched[0].options.headers).toBeUndefined()
    expect(sent).toHaveLength(2)
    expect(sent[0].htmlBody).toBe('<img src="cid:yoggieLogo">')
    expect(sent[0].inlineImages.yoggieLogo).toBe(blob)
    expect(sent[1].inlineImages.yoggieLogo).toBe(blob)
    expect(message.htmlBody).toContain('https://')
  })

  it.each([
    [404, 'image/png', [137, 80, 78, 71, 13, 10, 26, 10, ...Array(40).fill(0)]],
    [200, 'text/html', Array(48).fill(0)],
    [200, 'image/png', Array(48).fill(0)],
    [200, 'image/png', Array(2 * 1024 * 1024 + 1).fill(0)],
  ])('refuses to send when logo response is unsafe (%s, %s)', (status, type, bytes) => {
    const sent = [], fetched = []
    const { scope } = loadAdapter({
      UrlFetchApp: { fetch: url => {
        fetched.push(url)
        return { getResponseCode: () => status, getBlob: () => ({ getContentType: () => type, getBytes: () => bytes }) }
      } },
      MailApp: { sendEmail: message => sent.push(message) },
    })
    const sender = scope.yoggieSender_()
    expect(() => sender({ htmlBody: '' })).toThrow(/logo/i)
    expect(() => sender({ htmlBody: '' })).toThrow(/logo/i)
    expect(fetched).toHaveLength(1)
    expect(sent).toHaveLength(0)
  })

  it('uses a bearer token and update-time precondition while preserving request fields', () => {
    const { scope, requests } = loadAdapter()
    const updated = scope.yoggieCas_({ database: 'projects/yoggie-db/databases/(default)' }, {
      name: 'projects/yoggie-db/databases/(default)/documents/shops/greek-yogg/invitations/one',
      updateTime: 'v1', data: { email: 'friend@gmail.com', status: 'pending' },
    }, { status: 'processing', leaseUntil: 1234, leasedAt: '2026-10-28T00:00:00Z' })
    expect(updated.data.email).toBe('friend@gmail.com')
    expect(updated.updateTime).toBe('v2')
    expect(requests[0].url).toBe('https://firestore.googleapis.com/v1/projects/yoggie-db/databases/(default)/documents:commit')
    expect(requests[0].options.headers.Authorization).toBe('Bearer private-runtime-token')
    const write = JSON.parse(requests[0].options.payload).writes[0]
    expect(write.currentDocument).toEqual({ updateTime: 'v1' })
    expect(write.updateMask.fieldPaths).toEqual(['status', 'leaseUntil', 'leasedAt'])
    expect(write.update.fields).toEqual({ status: { stringValue: 'processing' }, leaseUntil: { integerValue: '1234' }, leasedAt: { timestampValue: '2026-10-28T00:00:00Z' } })
  })

  it('treats Firestore FAILED_PRECONDITION as a lost claim', () => {
    const { scope } = loadAdapter({ UrlFetchApp: { fetch: () => ({
      getResponseCode: () => 400,
      getContentText: () => JSON.stringify({ error: { status: 'FAILED_PRECONDITION' } }),
    }) } })
    expect(scope.yoggieApi_('test', 'post', {})).toBe(null)
  })

  it('does not run unless explicitly enabled by the owner', () => {
    const { scope, requests } = loadAdapter()
    expect(() => scope.runYoggieInvitations()).toThrow('Mailer disabled')
    expect(requests).toHaveLength(0)
  })

  it('rejects another effective Google account before reading Firestore', () => {
    const { scope, requests } = loadAdapter({
      PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'true' }) },
      Session: { getEffectiveUser: () => ({ getEmail: () => 'another@gmail.com' }) },
    })
    expect(() => scope.runYoggieInvitations()).toThrow('authorized Yoggie owner')
    expect(requests).toHaveLength(0)
  })
})
