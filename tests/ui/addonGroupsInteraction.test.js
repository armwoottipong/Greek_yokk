import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { createTestStore, material } from '../helpers/createStore'
import { loadDatabase } from '../../src/services/localDatabase'
import Custom from '../../src/components/modals/CustomOrderModal.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonView from '../../src/views/AddonView.vue'
import AddonEdit from '../../src/components/modals/AddonEditModal.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'

function setup() {
  const s = createTestStore(); s.resetDemoData()
  s.addonGroups = [{ id: 'G', name: 'เลือกผลไม้', minSelections: 2, maxSelections: 2, allowRepeat: false, pricingMode: 'included', options: s.addons.slice(0, 3).map(a => ({ addonId: a.id })) }]
  s.menus[0].addonGroupIds = ['G']
  return s
}
it('creates and selects an option from the group without losing its draft', async () => {
  const s = setup()
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const wrapper = mount({ render: () => h('div', [h(AddonView), h(AddonEdit)]) }, {
    global: { stubs: { teleport: true } }
  })
  const workspace = wrapper.getComponent(AddonView)
  const editor = wrapper.getComponent(AddonEdit)
  try {
    await workspace.findAll('button').find(button => button.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    await workspace.get('#addon-group-name').setValue('กลุ่มใหม่')
    await workspace.get('[data-group-add-option]').trigger('click')
    await editor.get('#addon-name').setValue('ตัวเลือกใหม่')
    await editor.vm.submit()
    await flushPromises()
    const created = s.addons.find(option => option.name === 'ตัวเลือกใหม่')
    expect(created).toBeDefined()
    expect(workspace.get('#addon-group-name').element.value).toBe('กลุ่มใหม่')
    expect(workspace.get('[aria-label="ตัวเลือกใหม่"]').element.checked).toBe(true)
    await workspace.get('[aria-label="ดูสูตรและราคาของ ตัวเลือกใหม่"]').trigger('click')
    await vi.dynamicImportSettled()
    const details = workspace.get('#group-option-details')
    expect(details.get('[data-selected-addon-name]').text()).toBe('ตัวเลือกใหม่')
    expect(details.find('[data-addon-select]').exists()).toBe(false)
    await details.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
    await workspace.findAll('button').find(button => button.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    expect(loadDatabase(localStorage).value.addonGroups.find(group => group.name === 'กลุ่มใหม่')?.options).toEqual([{ addonId: created.id }])
  } finally {
    wrapper.unmount()
  }
})
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
it('persists both groups and deducts the base and selected recipes on checkout', async () => {
  const s = setup()
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const addon = s.addons[0]
  s.materials.push(material('FRUIT', 1000))
  s.menus[0].recipe = [{ materialId: 'FRUIT', qty: 100 }]
  s.addons.slice(0, 3).forEach(option => { option.recipe = [{ materialId: 'FRUIT', qty: 10 }] })
  s.addonGroups.push({ id: 'PAID', name: 'ท็อปปิ้งเพิ่ม', minSelections: 0, maxSelections: 3, allowRepeat: false, pricingMode: 'extra', options: [{ addonId: addon.id, prices: { [s.currentPlatformId]: 20 } }] })
  const editor = mount(MenuEdit, { attachTo: document.body, global: { stubs: { teleport: true } } })
  try {
    s.modals.menuEdit = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    expect(editor.find('#menu-option-mode').exists()).toBe(false)
    await editor.get('[data-open-group-picker]').trigger('click')
    expect(editor.get('[data-picker-group="G"] input').element.checked).toBe(true)
    await editor.get('[data-picker-group="PAID"] input').setValue(true)
    await editor.findAll('#menu-group-picker button').find(b => b.text() === 'เสร็จสิ้น').trigger('click')
    await editor.vm.submit()
    expect(loadDatabase(localStorage).value.menus[0].addonGroupIds).toEqual(['G', 'PAID'])
  } finally { editor.unmount() }
  const order = mount(Custom)
  try {
    s.modals.customOrder = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    await order.get('[data-group-option="PAID"]').trigger('click')
    const add = order.findAll('button').find(b => b.text().includes('เพิ่มลงตะกร้า'))
    expect(add.attributes('disabled')).toBeDefined()
    const included = order.findAll('[data-group-option="G"]')
    await included[0].trigger('click'); await included[1].trigger('click')
    await add.trigger('click')
    expect(s.cart[0].selectedAddons.filter(a => a.id === addon.id).map(a => a.groupId).sort()).toEqual(['G', 'PAID'])
    const receipt = s.checkout()
    expect(receipt.subtotal).toBe(s.menus[0].prices[s.currentPlatformId] + 20)
    expect(receipt.items[0].selectedAddons.find(choice => choice.groupId === 'PAID').price).toBe(20)
    expect(s.matMap.FRUIT.stock).toBe(870)
  } finally { order.unmount() }
})
it('updates the paid option profit from the price draft and channel GP', async () => {
  const s = setup()
  s.materials = [material('FRUIT', 1000)]
  s.addons[0].recipe = [{ materialId: 'FRUIT', qty: 10 }]
  s.platforms[0].gpPercent = 25
  const manager = mount(GroupManager, { attachTo: document.body, global: { stubs: { teleport: true } } })
  try {
    await manager.get('[aria-label="แก้ไขกลุ่ม เลือกผลไม้"]').trigger('click')
    await manager.get('#addon-group-pricing').trigger('click')
    await manager.findAll('[role="option"]').find(option => option.text().includes('คิดเงินเพิ่ม')).trigger('click')
    await manager.findAll('[data-group-addon]')[0].findAll('input')[1].setValue(true)
    await manager.get(`#group-price-${s.addons[0].id}-${s.platforms[0].id}`).setValue(40)
    expect(manager.get('[data-group-option-profit]').text()).toBe(new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(20))
  } finally { manager.unmount() }
})
it('keeps existing menu choices until a group is explicitly assigned', async () => {
  const s = setup()
  delete s.menus[0].addonGroupIds
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const editor = mount(MenuEdit, { attachTo: document.body, global: { stubs: { teleport: true } } })
  try {
    s.modals.menuEdit = { isOpen: true, menuId: s.menus[0].id }; await flushPromises()
    await editor.get('[data-open-group-picker]').trigger('click')
    await editor.findAll('#menu-group-picker button').find(b => b.text() === 'เสร็จสิ้น').trigger('click')
    await editor.vm.submit()
    expect(s.menus[0].addonGroupIds).toBeUndefined()
  } finally { editor.unmount() }
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
it('creates and reopens a reusable group in the option workspace', async () => {
  const s = setup(), w = mount(AddonView, { global: { stubs: { teleport: true } } })
  try {
    await w.findAll('button').find(b => b.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    expect(w.get('[role="note"]').text()).toContain('ไม่พร้อมใช้งาน')
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
it('opens directly on the groups with no separate option directory', async () => {
  const s=setup(),w=mount(AddonView)
  try{
    expect(w.find('[data-addon-section]').exists()).toBe(false)
    expect(w.find('[aria-label="รายการตัวเลือกเสริม"]').exists()).toBe(false)
    expect(w.find('[data-picker-group="G"]').exists()).toBe(false)
    const expand=w.get('[aria-controls="group-options-G"]')
    expect(expand.attributes('aria-expanded')).toBe('false')
    await expand.trigger('click')
    expect(expand.attributes('aria-expanded')).toBe('true')
    expect(w.get('[data-group-options]').text()).toContain(s.addons[0].name)
    expect(w.get('[data-group-options]').text()).toContain('ไม่พร้อมใช้งาน')
  }finally{w.unmount()}
})
it('selects at most two existing groups in the menu picker',async()=>{
  const s=setup(),copy=()=>JSON.parse(JSON.stringify(s.addonGroups[0]));s.addonGroups.push({...copy(),id:'H',name:'ท็อปปิ้ง'}, {...copy(),id:'I',name:'ผลไม้พิเศษ'})
  const w=mount(MenuEdit,{attachTo:document.body})
  try{
    s.modals.menuEdit={isOpen:true,menuId:s.menus[0].id};await flushPromises()
    await w.get('[data-open-group-picker]').trigger('click');await flushPromises()
    const row=id=>document.querySelector(`[data-picker-group="${id}"] input`)
    expect(document.querySelector('#menu-group-picker')).not.toBeNull()
    row('H').click();await flushPromises()
    expect(row('I').disabled).toBe(true)
    ;[...document.querySelectorAll('#menu-group-picker button')].find(button=>button.textContent.includes('เสร็จสิ้น')).click();await flushPromises()
    expect(w.get('[data-menu-group-summary]').text()).toContain('ท็อปปิ้ง')
    expect(w.get('[data-menu-group-summary]').text()).not.toContain('ผลไม้พิเศษ')
  }finally{w.unmount()}
})

it('returns to the menu picker with a newly created group selected',async()=>{
 const s=setup(),w=mount(MenuEdit,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  s.modals.menuEdit={isOpen:true,menuId:s.menus[0].id};await flushPromises()
  await w.get('[data-open-group-picker]').trigger('click');await flushPromises()
  document.querySelector('[data-create-group-from-menu]').click();await flushPromises()
  expect(document.querySelector('#addon-group-editor')).not.toBeNull()
  const group=w.getComponent(GroupManager)
  await group.get('#addon-group-name').setValue('รับช้อนหรือไม่')
  await group.get('#addon-group-min').setValue(1)
  await group.get('#addon-group-max').setValue(1)
  await group.get('[data-group-addon] input').setValue(true)
  await group.findAll('button').find(b=>b.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click');await flushPromises()
  const created=s.addonGroups.find(g=>g.name==='รับช้อนหรือไม่')
  expect(created).toBeTruthy()
  expect(document.querySelector(`#menu-group-picker [data-picker-group="${created.id}"] input`).checked).toBe(true)
  ;[...document.querySelectorAll('#menu-group-picker button')].find(button=>button.textContent.includes('เสร็จสิ้น')).click();await flushPromises()
  expect(w.get('[data-menu-group-summary]').text()).toContain('รับช้อนหรือไม่')
 }finally{w.unmount()}
})

it('uses a drawer for the menu group picker on narrow screens',async()=>{
 const original=window.innerWidth
 Object.defineProperty(window,'innerWidth',{configurable:true,value:390})
 const s=setup(),w=mount(MenuEdit,{attachTo:document.body})
 try{
  s.modals.menuEdit={isOpen:true,menuId:s.menus[0].id};await flushPromises()
  await w.get('[data-open-group-picker]').trigger('click');await flushPromises()
  expect(document.querySelector('#menu-group-picker').classList.contains('dialog-frame-shell--drawer')).toBe(true)
  document.querySelector('[data-picker-group="G"] input').click()
  ;[...document.querySelectorAll('#menu-group-picker button')].find(button=>button.textContent.includes('ยกเลิก')).click()
  await flushPromises()
  expect(w.get('[data-menu-group-summary]').text()).toContain('เลือกผลไม้')
 }finally{w.unmount();Object.defineProperty(window,'innerWidth',{configurable:true,value:original})}
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
