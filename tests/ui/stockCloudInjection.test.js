import { expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia } from 'pinia'
import StockView from '../../src/views/StockView.vue'

it('renders the original stock toolbar, desktop table, and material details from an injected cloud model', async () => {
  const material = {
    id: 'CLOUD-MILK', name: 'นมสำหรับคลาวด์', category: 'Dairy & Milk', inventoryType: 'ingredient',
    unit: 'ml', stock: 120, minAlert: 0, unitCost: 0.08, packCost: 80, packSize: 1000, packUnit: 'กล่อง',
    emoji: '🥛', lots: [{ id: 'CLOUD-LOT', qty: 120, initialQty: 120, unitCost: 0.08, isInUse: true,
      receiveDate: '2026-10-01', expiryDate: '2099-01-01' }],
  }
  const model = {
    materials: [material], activeMaterials: [material], materialKindOptions: [], materialUsageById: new Map(),
    lowStockMaterials: [], outOfStockMaterials: [], modals: {}, stockDraftSummary: { items: [] },
    stockDraftSnapshot: [], hasStockDrafts: false, totalInventoryValuation: 9.6, draftInventoryValuationDiff: 0,
    projectedInventoryValuation: 9.6, reorderBudgetNeeded: 0,
    getMaterialTrackingMode: () => 'expiry_and_receive', getMaterialLots: value => value.lots,
    getMaterialUsage: () => ({ isInUse: false }), initStockDraftSnapshot() {},
  }

  // No Pinia instance is active: this view can only mount if it uses the provided model.
  setActivePinia(null)
  const wrapper = mount(StockView, {
    attachTo: document.body,
    global: { provide: { 'cloud-inventory-model': model } },
  })
  try {
    expect(wrapper.find('.stock-toolbar').exists()).toBe(true)
    expect(wrapper.get('[data-stock-receive]').text()).toContain('รับเข้าสต็อก')
    expect(wrapper.find('.desktop-material-table').exists()).toBe(true)
    expect(wrapper.findAll('.desktop-material-table thead th').map(th => th.attributes('aria-label') || th.text()))
      .toContain('คงเหลือในคลัง')
    await wrapper.get('[data-material-details="CLOUD-MILK"]').trigger('click')
    await flushPromises()
    expect(document.getElementById('material-details').textContent).toContain('120')
    expect(document.getElementById('material-details').textContent).toContain('นมสำหรับคลาวด์')
  } finally {
    wrapper.unmount()
  }
})
