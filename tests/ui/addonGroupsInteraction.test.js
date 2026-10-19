import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import Custom from '../../src/components/modals/CustomOrderModal.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonView from '../../src/views/AddonView.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'

function setup() {
  const s = createTestStore(); s.resetDemoData()
  s.addonGroups = [{ id: 'G', name: 'เลือกผลไม้', minSelections: 2, maxSelections: 2, allowRepeat: false, pricingMode: 'included', options: s.addons.slice(0, 3).map(a => ({ addonId: a.id })) }]
  s.menus[0].addonGroupIds = ['G']
  return s
}
it('requires complete group choices, caps kinds and adds free selections', async () => {
  const s = setup(), w = mount(Custom)
  try {
    s.modals.customOrder = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    const add = () => w.findAll('button').find(b => b.text().includes('เพิ่มลงตะกร้า'))
    expect(w.text()).toContain('เลือกผลไม้')
    expect(add().attributes('disabled')).toBeDefined()
    const options = w.findAll('[data-group-option="G"]')
    await options[0].trigger('click'); await options[1].trigger('click')
    expect(options[2].attributes('disabled')).toBeDefined()
    expect(add().attributes('disabled')).toBeUndefined()
    await add().trigger('click')
    expect(s.cart[0].selectedAddons).toHaveLength(2)
    expect(s.cartSummary.subtotal).toBe(s.menus[0].prices[s.currentPlatformId])
  } finally { w.unmount() }
})
it('saves menu group assignments while keeping recipe and existing settings', async () => {
  const s = setup(); vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const w = mount(MenuEdit)
  try {
    s.modals.menuEdit = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    expect(w.get('[data-menu-groups]').text()).toContain('เลือกผลไม้')
    await w.vm.submit()
    expect(s.menus[0].addonGroupIds).toEqual(['G'])
  } finally { w.unmount() }
})
it('caps repeated portions and removes a choice when its quantity reaches zero', async () => {
  const s = setup(); s.addonGroups[0].allowRepeat = true
  const w = mount(Custom)
  try {
    s.modals.customOrder = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    const addon = s.addons[0]
    await w.findAll('[data-group-option="G"]')[0].trigger('click')
    const more = w.get(`[aria-label="เพิ่ม เลือกผลไม้ ${addon.name}"]`)
    await more.trigger('click')
    expect(more.attributes('disabled')).toBeDefined()
    const less = () => w.get(`[aria-label="ลด เลือกผลไม้ ${addon.name}"]`)
    await less().trigger('click'); await less().trigger('click')
    expect(w.findAll('[data-group-option="G"]')[0].attributes('aria-pressed')).toBe('false')
  } finally { w.unmount() }
})
it('creates and reopens a reusable group in the Add-on workspace', async () => {
  const s = setup(), w = mount(AddonView, { global: { stubs: { teleport: true } } })
  try {
    await w.findAll('button').find(b => b.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    await w.get('#addon-group-name').setValue('ฟรี 1 ชนิด')
    await w.get('#addon-group-min').setValue(1)
    await w.get('#addon-group-max').setValue(1)
    await w.get('[data-group-addon] input').setValue(true)
    await w.findAll('button').find(b => b.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    expect(s.addonGroups.find(g => g.name === 'ฟรี 1 ชนิด')).toMatchObject({ minSelections: 1, maxSelections: 1, pricingMode: 'included' })
    expect(w.text()).toContain('ฟรี 1 ชนิด')
    const confirm = vi.spyOn(s, 'confirmDialog').mockResolvedValue(false)
    w.findComponent(GroupManager).findComponent(Frame).vm.$emit('request-close')
    await flushPromises()
    expect(confirm).not.toHaveBeenCalled()
  } finally { w.unmount() }
})

it('keeps the group editor outside the inert application so its fields accept input', async () => {
  setup()
  const host = document.createElement('div'); host.id = 'app'; document.body.append(host)
  const w = mount(AddonView, { attachTo: host })
  try {
    await w.findAll('button').find(b => b.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    const input = document.getElementById('addon-group-name')
    expect(input.closest('[inert]')).toBe(null)
    input.focus()
    expect(document.activeElement).toBe(input)
  } finally { w.unmount(); host.remove() }
})
