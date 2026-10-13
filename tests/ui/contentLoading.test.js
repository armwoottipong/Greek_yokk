import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import App from '../../src/App.vue'

const stockPage = vi.hoisted(() => {
  let resolve
  return { ready: new Promise(r => { resolve = r }), resolve: () => resolve() }
})
const settingsPage = vi.hoisted(() => {
  let resolve
  return { ready: new Promise(r => { resolve = r }), resolve: () => resolve() }
})
vi.mock('../../src/views/DashboardView.vue', () => ({ __esModule: true, default: { template: '<h2>Dashboard ready</h2>' } }))
vi.mock('../../src/views/StockView.vue', async () => {
  await stockPage.ready
  return { __esModule: true, default: { template: '<h2>Stock ready</h2>' } }
})
vi.mock('../../src/views/SettingsView.vue', async () => {
  await settingsPage.ready
  return { __esModule: true, default: { template: '<h2>Settings ready</h2>' } }
})

it('shows the main loader only after 1 second, then removes it immediately when ready', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  const s = createTestStore()
  const w = mount(App, { attachTo: document.body })
  try {
    await flushPromises()
    s.switchTab('stock')
    await flushPromises()
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    expect(w.get('#main-content').attributes('aria-busy')).toBe('true')
    expect(w.get('[data-page-content]').attributes('inert')).toBeDefined()
    expect(w.get('#main-sidebar').attributes('inert')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(999)
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(w.find('[data-content-loading]').exists()).toBe(true)
    stockPage.resolve()
    await flushPromises()
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    expect(w.get('[data-page-content]').text()).toContain('Stock ready')
    expect(w.get('#main-content').attributes('aria-busy')).toBe('false')
  } finally { w.unmount(); vi.useRealTimers() }
})

it('does not flash the loader on fast cached pages or when an earlier navigation finishes', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  const s = createTestStore()
  const w = mount(App)
  try {
    await flushPromises()
    s.switchTab('settings')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    s.switchTab('stock')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(2000)
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    settingsPage.resolve()
    await flushPromises()
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    expect(w.get('[data-page-content]').text()).toContain('Stock ready')
    s.switchTab('dashboard')
    await flushPromises()
    expect(w.find('[data-content-loading]').exists()).toBe(false)
    await vi.advanceTimersByTimeAsync(3000)
    expect(w.find('[data-content-loading]').exists()).toBe(false)
  } finally { w.unmount(); vi.useRealTimers() }
})
