import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import { finishAppStartup, showAppStartupError } from '../../src/composables/appStartup'
import App from '../../src/App.vue'
import { readFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const initialView = vi.hoisted(() => {
  let resolve
  const ready = new Promise(r => { resolve = r })
  return { ready, resolve }
})
vi.mock('../../src/views/DashboardView.vue', async () => {
  await initialView.ready
  return { __esModule: true, default: { name: 'ReadyDashboard', template: '<h2>หน้าร้านพร้อมแล้ว</h2>' } }
})

function startupFixture() {
  const screen = document.createElement('section')
  screen.id = 'app-loading'
  screen.innerHTML = '<p data-startup-message role="status">กำลังเตรียมร้านให้พร้อม…</p><button data-startup-retry type="button" hidden>ลองโหลดใหม่</button>'
  const root = document.createElement('div')
  root.id = 'app'
  root.setAttribute('inert', '')
  document.body.append(screen, root)
  return { screen, root }
}
afterEach(() => { document.body.innerHTML = '' })

it('keeps startup visible until the initial page actually resolves, then releases the app', async () => {
  createTestStore()
  const { screen, root } = startupFixture()
  const wrapper = mount(App, { attachTo: root })
  try {
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    expect(root.hasAttribute('inert')).toBe(true)
    initialView.resolve()
    await flushPromises()
    expect(wrapper.text()).toContain('หน้าร้านพร้อมแล้ว')
    expect(document.getElementById('app-loading')).toBeNull()
    expect(root.hasAttribute('inert')).toBe(false)
  } finally { wrapper.unmount() }
})

it('offers recovery instead of continuing the bouncing loader after a loading failure', () => {
  const { screen, root } = startupFixture()
  showAppStartupError()
  expect(screen.dataset.state).toBe('error')
  expect(screen.querySelector('[data-startup-message]').getAttribute('role')).toBe('alert')
  expect(screen.textContent).toContain('โหลดร้านไม่สำเร็จ')
  expect(screen.querySelector('button').hidden).toBe(false)
  finishAppStartup()
  expect(screen.isConnected).toBe(true)
  expect(root.hasAttribute('inert')).toBe(true)
})

it('offers recovery even when the entry JavaScript cannot be downloaded', async () => {
  const html = readFileSync('index.html', 'utf8')
  const page = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/Greek_yokk/' })
  try {
    const doc = page.window.document
    doc.querySelector('script[type="module"]').dispatchEvent(new page.window.Event('error'))
    if (doc.readyState === 'loading') {
      await new Promise(resolve => doc.addEventListener('DOMContentLoaded', resolve, { once: true }))
    }
    expect(doc.querySelector('[data-startup-message]').getAttribute('role')).toBe('alert')
    expect(doc.querySelector('[data-startup-retry]').hidden).toBe(false)
  } finally { page.window.close() }
})

it('does not release a dialog-owned inert app after the startup screen has already gone', () => {
  const { root } = startupFixture()
  finishAppStartup()
  root.setAttribute('inert', '')
  finishAppStartup()
  expect(root.hasAttribute('inert')).toBe(true)
})
