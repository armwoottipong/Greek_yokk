import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore, material } from '../helpers/createStore'
import MaterialEdit from '../../src/components/modals/MaterialEditModal.vue'
import Stock from '../../src/views/StockView.vue'

async function openEditor(store, id = null) {
  const wrapper = mount(MaterialEdit)
  store.modals.materialEdit = { isOpen: true, materialId: id }
  await flushPromises()
  return wrapper
}

describe('material inventory type', () => {
  it('defaults each new item to ingredient even after editing packaging', async () => {
    const store = createTestStore()
    store.materials = [material('P', 0, { inventoryType: 'packaging' })]
    const wrapper = await openEditor(store, 'P')
    store.modals.materialEdit.isOpen = false
    await flushPromises()
    store.modals.materialEdit = { isOpen: true, materialId: null }
    await flushPromises()
    expect(wrapper.vm.form.inventoryType).toBe('ingredient')
    expect(wrapper.get('input[type="radio"][value="normal"]').element.checked).toBe(true)
    wrapper.unmount()
  })

  it.each(['ingredient', 'packaging'])('preserves saved %s when the name and category change', async (type) => {
    const store = createTestStore()
    store.materials = [material('M', 0, { name: 'ถ้วยทดลอง', category: 'Packaging', inventoryType: type })]
    const wrapper = await openEditor(store, 'M')
    expect(wrapper.vm.form.inventoryType).toBe(type)
    await wrapper.get('[aria-label="ชื่อรายการ"]').setValue('ชื่อใหม่')
    wrapper.vm.form.category = 'หมวดใหม่'
    await flushPromises()
    expect(wrapper.vm.form.inventoryType).toBe(type)
    wrapper.unmount()
  })

  it('provides named Thai choices with descriptions of grouping, Package and cost', async () => {
    const store = createTestStore()
    const wrapper = await openEditor(store)
    for (const [type, label] of [['produced', 'วัตถุดิบที่มีการผลิต'], ['normal', 'วัตถุดิบปกติ'], ['packaging', 'บรรจุภัณฑ์']]) {
      const radio = wrapper.get(`input[type="radio"][value="${type}"]`)
      expect(radio.attributes('aria-label')).toBe(label)
      expect(radio.attributes('required')).toBeDefined()
      const description = wrapper.get(`#${radio.attributes('aria-describedby')}`).text()
      expect(description).toContain('ทุกบทบาท')
      expect(description).toContain('Package')
      expect(description).toContain('ต้นทุน')
    }
    wrapper.unmount()
  })

  it.each(['ingredient', 'packaging'])('submits selected %s to saveMaterial and persists it', async (type) => {
    const store = createTestStore()
    vi.spyOn(store, 'confirmDialog').mockResolvedValue(true)
    const save = vi.spyOn(store, 'saveMaterial')
    const wrapper = await openEditor(store)
    await wrapper.get('[aria-label="ชื่อรายการ"]').setValue('รายการใหม่')
    await wrapper.get(`input[type="radio"][value="${type === 'ingredient' ? 'normal' : type}"]`).setValue()
    await wrapper.vm.submit()
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ inventoryType: type, name: 'รายการใหม่' }))
    expect(store.materials.find(item => item.name === 'รายการใหม่').inventoryType).toBe(type)
    wrapper.unmount()
  })

  it.each([['ingredient', 'วัตถุดิบปกติ'], ['packaging', 'บรรจุภัณฑ์']])('shows %s badges on Stock list and detail surfaces', async (type, label) => {
    const store = createTestStore()
    store.materials = [material('M', 12.5, { inventoryType: type, category: 'หมวดใหม่' })]
    const wrapper = mount(Stock, { attachTo: document.body })
    try {
      expect(wrapper.get('.menu-directory-list [data-inventory-type]').text()).toBe(label)
      expect(wrapper.findAll('[data-material-details]')).toHaveLength(1)
      await wrapper.get('.menu-directory-list [data-material-details="M"]').trigger('click')
      await flushPromises()
      expect(document.querySelector('#material-details [data-inventory-type]').textContent).toBe(label)
      expect(store.matMap.M.stock).toBe(12.5)
    } finally {
      wrapper.unmount()
    }
  })
})
