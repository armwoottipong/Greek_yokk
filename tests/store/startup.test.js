import { describe, it, expect } from 'vitest'
import { createTestStore, material } from '../helpers/createStore'
describe('non-destructive startup', () => {
  it('preserves existing data without clear marker', () => {
    const store = createTestStore({ storage: { GY_MATERIALS: [material()], GY_ORDERS: [{ orderId: 'OLD', createdAt: '2026-10-01T00:00:00Z' }] } })
    expect(store.materials[0]?.id).toBe('X')
    expect(store.orders[0]?.orderId).toBe('OLD')
  })
  it('preserves corrupt raw key for recovery without throwing', () => {
    let store
    expect(() => { store = createTestStore({storage: {GY_CLEARED_ALL_V1:'true', GY_MATERIALS:'{bad'}}) }).not.toThrow()
    expect(localStorage.getItem('GY_MATERIALS')).toBe('{bad')
    expect(store.storageError).toBeTruthy()
  })
  it('does not fabricate activity history for an empty shop', () => {
    expect(createTestStore().activityLogs).toEqual([])
  })
})
