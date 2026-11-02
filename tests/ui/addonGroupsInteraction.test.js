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
it('opens the Add-on workspace on collapsible option groups', async () => {
  const s=setup(),w=mount(AddonView)
  try{
    expect(w.get('[data-addon-section="groups"]').attributes('aria-pressed')).toBe('true')
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
