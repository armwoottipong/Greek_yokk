import { afterEach, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore, material } from '../helpers/createStore'
import Addon from '../../src/components/modals/AddonEditModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'

let wrapper
afterEach(() => wrapper?.unmount())
async function openEditor(recipe = []) {
  const store = createTestStore()
  store.resetDemoData()
  store.materials.push(
    material('BOM-FOOD', 100, { name: 'Cup fruit', category: 'Packaging', unit: 'g' }),
    material('BOM-PACK', 100, { name: 'Plain sleeve', category: 'Fruit', inventoryType: 'packaging', unit: 'ใบ' }),
    material('BOM-ARCHIVED', 100, { isArchived: true })
  )
  store.addons[0].recipe = recipe
  vi.spyOn(store, 'confirmDialog').mockResolvedValue(true)
  wrapper = mount(Addon, { attachTo: document.body })
  store.modals.addonEdit = { isOpen: true, addonId: store.addons[0].id }
  await flushPromises()
  return store
}
function button(label) {
  return wrapper.findAll('button').find(b => b.text().includes(label))
}

it('adds and removes accessible recipe rows with grouped persisted material types and units', async () => {
  await openEditor()
  expect(wrapper.findComponent(Frame).exists()).toBe(true)
  await button('เพิ่มรายการในสูตร').trigger('click')
  const select = wrapper.get('select[aria-label="วัตถุดิบในสูตร 1"]')
  expect(select.get('optgroup[label="วัตถุดิบปกติ"] option[value="BOM-FOOD"]').text()).toContain('g')
  expect(select.get('optgroup[label="บรรจุภัณฑ์"] option[value="BOM-PACK"]').text()).toContain('ใบ')
  expect(select.find('option[value="BOM-ARCHIVED"]').exists()).toBe(false)
  await select.setValue('BOM-PACK')
  expect(wrapper.get('[data-addon-recipe-row]').text()).toContain('ใบ')
  await wrapper.get('[aria-label="ลบ Plain sleeve จากสูตร"]').trigger('click')
  expect(wrapper.findAll('[data-addon-recipe-row]')).toHaveLength(0)
})

it('saves all recipe rows without legacy linkage and preserves a zero platform price', async () => {
  const store = await openEditor([{ materialId: 'BOM-FOOD', qty: 25 }, { materialId: 'BOM-PACK', qty: 2 }])
  const save = vi.spyOn(store, 'saveAddon')
  await wrapper.get(`[aria-label="ราคา ${store.platforms[0].name}"]`).setValue('0')
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(save).toHaveBeenCalledWith({ id: store.addons[0].id, name: store.addons[0].name,  emoji: store.addons[0].emoji, prices: expect.objectContaining({ [store.platforms[0].id]: 0 }), recipe: [{ materialId: 'BOM-FOOD', qty: 25 }, { materialId: 'BOM-PACK', qty: 2 }] })
  const saved = JSON.parse(localStorage.getItem('GY_DATABASE_V3')).addons[0]
  expect(saved.recipe).toEqual([{ materialId: 'BOM-FOOD', qty: 25 }, { materialId: 'BOM-PACK', qty: 2 }])
  expect(saved).not.toHaveProperty('materialId')
  expect(saved).not.toHaveProperty('amountUsed')
  expect(store.modals.addonEdit.isOpen).toBe(false)
})

it.each([0, -1, '', 'Infinity', 'NaN'])('blocks a non-positive or non-finite recipe quantity (%s)', async qty => {
  const store = await openEditor([{ materialId: 'BOM-FOOD', qty: 25 }])
  const before = JSON.stringify(store.addons)
  if (qty === 'Infinity' || qty === 'NaN') wrapper.vm.form.recipe[0].qty = Number(qty)
  else await wrapper.get('[aria-label="ปริมาณ Cup fruit"]').setValue(String(qty))
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('มากกว่า 0')
  expect(wrapper.get('[aria-label="ปริมาณ Cup fruit"]').attributes('aria-invalid')).toBe('true')
  expect(store.confirmDialog).not.toHaveBeenCalled()
  expect(JSON.stringify(store.addons)).toBe(before)
})

it('prevents duplicate selection and rejects existing duplicate rows rather than losing quantities', async () => {
  const store = await openEditor([{ materialId: 'BOM-FOOD', qty: 25 }])
  await button('เพิ่มรายการในสูตร').trigger('click')
  expect(wrapper.get('select[aria-label="วัตถุดิบในสูตร 2"] option[value="BOM-FOOD"]').element.disabled).toBe(true)
  wrapper.vm.form.recipe = [{ materialId: 'BOM-FOOD', qty: 25 }, { materialId: 'BOM-FOOD', qty: 5 }]
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('ซ้ำ')
  expect(store.confirmDialog).not.toHaveBeenCalled()
})

it('reveals a collapsed recipe section and focuses its invalid row when save is blocked', async () => {
  const store = await openEditor([{ materialId: 'BOM-FOOD', qty: 25 }])
  const before = JSON.stringify(store.addons)
  await wrapper.get('[aria-label="ปริมาณ Cup fruit"]').setValue('0')
  const recipeSection = wrapper.get('[data-addon-recipe-row]').element.closest('details')
  recipeSection.open = false
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(recipeSection.open).toBe(true)
  expect(wrapper.get('[role="alert"]').isVisible()).toBe(true)
  expect(wrapper.get('[data-addon-recipe-row]').element.contains(document.activeElement)).toBe(true)
  expect(document.activeElement.getAttribute('aria-invalid')).toBe('true')
  expect(store.confirmDialog).not.toHaveBeenCalled()
  expect(JSON.stringify(store.addons)).toBe(before)
})

it.each(['MISSING', 'BOM-ARCHIVED'])('shows unavailable material recovery and allows removal (%s)', async materialId => {
  const store = await openEditor([{ materialId, qty: 2 }])
  expect(wrapper.get('[role="status"]').text()).toContain('เลือกใหม่หรือลบรายการ')
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(store.confirmDialog).not.toHaveBeenCalled()
  await wrapper.get('[data-addon-recipe-row] button[title="ลบรายการ"]').trigger('click')
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(store.addons[0].recipe).toEqual([])
  expect(store.modals.addonEdit.isOpen).toBe(false)
})

it('keeps recipe edits local and preserves the discard confirmation', async () => {
  const store = await openEditor([{ materialId: 'BOM-FOOD', qty: 25 }])
  store.confirmDialog.mockResolvedValue(false)
  await wrapper.get('[aria-label="ปริมาณ Cup fruit"]').setValue('30')
  await button('ยกเลิก').trigger('click')
  await flushPromises()
  expect(store.confirmDialog).toHaveBeenCalledWith(expect.objectContaining({ type: 'danger' }))
  expect(store.modals.addonEdit.isOpen).toBe(true)
  expect(store.addons[0].recipe).toEqual([{ materialId: 'BOM-FOOD', qty: 25 }])
})

it('focuses the name recovery error before saving', async () => {
  await openEditor()
  await wrapper.get('#addon-name').setValue('')
  await button('บันทึก Add-on').trigger('click')
  await flushPromises()
  expect(wrapper.get('#addon-name').attributes('aria-invalid')).toBe('true')
  expect(document.activeElement.id).toBe('addon-name')
})

it('omits a blank platform price on save while preserving an explicitly entered zero',async()=>{
 const store=await openEditor()
 const [free,unset]=store.platforms
 wrapper.vm.form.prices={[free.id]:0,[unset.id]:''}
 const save=vi.spyOn(store,'saveAddon')
 await button('บันทึก Add-on').trigger('click');await flushPromises()
 expect(save.mock.calls[0][0].prices).toEqual({[free.id]:0})
 expect(store.addons[0].prices).not.toHaveProperty(unset.id)
})
