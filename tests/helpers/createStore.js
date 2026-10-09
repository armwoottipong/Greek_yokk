import { createPinia, setActivePinia } from 'pinia'
import { usePosStore } from '../../src/stores/posStore.js'
export function createTestStore({ storage = {}, now } = {}) {
  localStorage.clear()
  for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
  setActivePinia(createPinia())
  return usePosStore()
}
export function material(id = 'X', stock = 100, extra = {}) {
  return { id, name: id, category: 'Dairy & Milk', unit: 'g', stock, minAlert: 0, unitCost: 1, packCost: 1000, packSize: 1000, packUnit: 'ถุง', lots: [{ id: `LOT-${id}`, qty: stock, initialQty: stock, unitCost: 1, isInUse: true, receiveDate: '2026-10-01', expiryDate: '2099-01-01' }], ...extra }
}
