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

function animatedStartupFixture() {
  const fixture = startupFixture()
  const logo = document.createElement('img')
  logo.className = 'startup-mascot'
  fixture.screen.append(logo)
  Object.defineProperty(logo, 'offsetWidth', { value: 200 })
  const animations = []
  const animate = vi.fn(() => {
    let resolve
    const animation = { finished: new Promise(r => { resolve = r }), cancel: vi.fn(), resolve: () => resolve() }
    animations.push(animation)
    return animation
  })
  logo.animate = animate
  fixture.screen.animate = animate
  fixture.root.animate = animate
  return { ...fixture, logo, animate, animations }
}

it('reveals the ready app through a zoom and crossfade, keeping interaction blocked until the exit finishes', async () => {
  const { screen, root, animate, animations } = animatedStartupFixture()
  const ready = finishAppStartup()
  const repeated = finishAppStartup()
  await flushPromises()
  expect(screen.dataset.state).toBe('exiting')
  expect(animate).toHaveBeenCalledTimes(3)
  expect(animate.mock.calls[0][0].at(-1).transform).toMatch(/scale\(/)
  expect(root.hasAttribute('inert')).toBe(true)
  await finishAppStartup()
  expect(animate).toHaveBeenCalledTimes(3)
  animations.forEach(animation => animation.resolve())
  await ready
  await repeated
  expect(screen.isConnected).toBe(false)
  expect(root.hasAttribute('inert')).toBe(false)
  expect(animations.every(animation => animation.cancel.mock.calls.length === 1)).toBe(true)
})

it('uses a short crossfade without the full-screen zoom for reduced motion', async () => {
  const original = window.matchMedia
  window.matchMedia = vi.fn(() => ({ matches: true }))
  try {
    const { animate, animations } = animatedStartupFixture()
    const ready = finishAppStartup()
    await flushPromises()
    expect(animate).toHaveBeenCalledTimes(2)
    expect(animate.mock.calls.every(([frames, options]) => options.duration === 180 && frames.every(frame => !frame.transform))).toBe(true)
    animations.forEach(animation => animation.resolve())
    await ready
  } finally { window.matchMedia = original }
})

it('cancels the exit and preserves recovery if a startup error arrives during the crossfade', async () => {
  const { screen, root, animations } = animatedStartupFixture()
  const ready = finishAppStartup()
  await flushPromises()
  showAppStartupError()
  expect(animations.every(animation => animation.cancel.mock.calls.length > 0)).toBe(true)
  animations.forEach(animation => animation.resolve())
  await ready
  expect(screen.dataset.state).toBe('error')
  expect(screen.isConnected).toBe(true)
  expect(root.hasAttribute('inert')).toBe(true)
})

it('keeps startup visible until the initial page actually resolves, then releases the app', async () => {
  createTestStore()
  const { screen, root } = startupFixture()
  const wrapper = mount(App, { attachTo: root })
  try {
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    expect(root.hasAttribute('inert')).toBe(true)
    for (const image of document.images) {
      Object.defineProperties(image, { complete: { configurable: true, value: true }, naturalWidth: { configurable: true, value: 100 } })
    }
    initialView.resolve()
    await flushPromises()
    expect(wrapper.text()).toContain('หน้าร้านพร้อมแล้ว')
    expect(document.getElementById('app-loading')).toBeNull()
    expect(root.hasAttribute('inert')).toBe(false)
  } finally { wrapper.unmount() }
})

it('offers recovery instead of continuing the bouncing loader after a loading failure', async () => {
  const { screen, root } = startupFixture()
  showAppStartupError()
  expect(screen.dataset.state).toBe('error')
  expect(screen.querySelector('[data-startup-message]').getAttribute('role')).toBe('alert')
  expect(screen.textContent).toContain('โหลดร้านไม่สำเร็จ')
  expect(screen.querySelector('button').hidden).toBe(false)
  await finishAppStartup()
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

it('does not release a dialog-owned inert app after the startup screen has already gone', async () => {
  const { root } = startupFixture()
  await finishAppStartup()
  root.setAttribute('inert', '')
  await finishAppStartup()
  expect(root.hasAttribute('inert')).toBe(true)
})

it('keeps loading until the document, logo image decode and fonts are all ready', async () => {
  const { screen, root } = startupFixture()
  const logo = document.createElement('img')
  logo.src = '/brand/loading-wordmark.png'
  screen.prepend(logo)
  Object.defineProperties(logo, {
    complete: { configurable: true, get: () => false },
    naturalWidth: { configurable: true, get: () => 100 }
  })
  let finishDecode, finishFonts
  logo.decode = () => new Promise(resolve => { finishDecode = resolve })
  const fontsReady = new Promise(resolve => { finishFonts = resolve })
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: fontsReady } })
  const state = vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
  try {
    const ready = finishAppStartup()
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    state.mockReturnValue('complete')
    window.dispatchEvent(new Event('load'))
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    logo.dispatchEvent(new Event('load'))
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    finishDecode()
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    finishFonts()
    await ready
    expect(screen.isConnected).toBe(false)
    expect(root.hasAttribute('inert')).toBe(false)
  } finally {
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else delete document.fonts
  }
})

it('does not hold the shop behind loading for lazy or failed optional page images', async () => {
  const { screen, root } = startupFixture()
  const lazy = document.createElement('img')
  lazy.src = '/below-the-fold.png'
  lazy.loading = 'lazy'
  const broken = document.createElement('img')
  broken.src = '/optional-photo.png'
  Object.defineProperties(broken, { complete: { value: true }, naturalWidth: { value: 0 } })
  root.append(lazy, broken)
  await finishAppStartup()
  expect(screen.isConnected).toBe(false)
  expect(root.hasAttribute('inert')).toBe(false)
})

it('offers reload when the required branding image fails instead of revealing a broken startup', async () => {
  const { screen, root } = startupFixture()
  const logo = document.createElement('img')
  logo.src = '/brand/loading-wordmark.png'
  Object.defineProperties(logo, { complete: { value: true }, naturalWidth: { value: 0 } })
  screen.prepend(logo)
  await finishAppStartup()
  expect(screen.isConnected).toBe(true)
  expect(screen.dataset.state).toBe('error')
  expect(screen.querySelector('[data-startup-retry]').hidden).toBe(false)
  expect(root.hasAttribute('inert')).toBe(true)
})

it.each([0, 2500])('shows loading for at least 3 seconds from first display, with %i ms already elapsed', async elapsed => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(performance, 'now').mockReturnValue(1000 + elapsed)
  const { screen, root } = startupFixture()
  screen.dataset.startedAt = '1000'
  try {
    const ready = finishAppStartup()
    await flushPromises()
    expect(screen.isConnected).toBe(true)
    await vi.advanceTimersByTimeAsync(3000 - elapsed - 1)
    expect(screen.isConnected).toBe(true)
    expect(root.hasAttribute('inert')).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    await ready
    expect(screen.isConnected).toBe(false)
    expect(root.hasAttribute('inert')).toBe(false)
  } finally { vi.useRealTimers() }
})

it('continues waiting beyond 3 seconds when assets are still loading, without adding another delay', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  vi.spyOn(performance, 'now').mockReturnValue(1000)
  const { screen } = startupFixture()
  screen.dataset.startedAt = '1000'
  let finishFonts
  const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
  Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: new Promise(resolve => { finishFonts = resolve }) } })
  try {
    const ready = finishAppStartup()
    await vi.advanceTimersByTimeAsync(4000)
    expect(screen.isConnected).toBe(true)
    finishFonts()
    await ready
    expect(screen.isConnected).toBe(false)
  } finally {
    vi.useRealTimers()
    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else delete document.fonts
  }
})
