import { expect, it } from 'vitest'
import { createTestStore } from '../helpers/createStore'
import { DATABASE_KEY } from '../../src/services/localDatabase'

it.each(['', ' ', null, undefined, true, -1, 100, Infinity, NaN])('rejects invalid GP %s at the store boundary', value => {
  const store = createTestStore(); store.resetDemoData()
  const before = localStorage.getItem(DATABASE_KEY)
  expect(store.savePlatformGpRates({ PLAT02: value }).ok).toBe(false)
  expect(localStorage.getItem(DATABASE_KEY)).toBe(before)
  expect(store.platforms.find(p => p.id === 'PLAT02').gpPercent).toBe(30)
})

it('rejects unknown channels atomically and supports zero GP', () => {
  const store = createTestStore(); store.resetDemoData()
  expect(store.savePlatformGpRates({ PLAT02: 10, MISSING: 20 }).ok).toBe(false)
  expect(store.platforms.find(p => p.id === 'PLAT02').gpPercent).toBe(30)
  expect(store.savePlatformGpRates({ PLAT02: 0 }).ok).toBe(true)
  expect(store.exportDatabase().platforms.find(p => p.id === 'PLAT02').gpPercent).toBe(0)
})
