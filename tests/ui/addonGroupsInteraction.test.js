import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import { createTestStore, material } from '../helpers/createStore'
import { loadDatabase } from '../../src/services/localDatabase'
import Custom from '../../src/components/modals/CustomOrderModal.vue'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import AddonView from '../../src/views/AddonView.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'
import Confirm from '../../src/components/modals/ConfirmModal.vue'
import Frame from '../../src/components/ui/DialogFrame.vue'
import {encodeLegacyId} from '../../src/cloud/paths.js'

function setup() {
  const s = createTestStore(); s.resetDemoData()
  s.addonGroups = [{ id: 'G', name: 'เลือกผลไม้', minSelections: 2, maxSelections: 2, allowRepeat: false, pricingMode: 'included', options: s.addons.slice(0, 3).map(a => ({ addonId: a.id })) }]
  s.menus[0].addonGroupIds = ['G']
  return s
}
it('uses the same stock picture for a group option in the Local checkout picker',async()=>{
 const s=setup();s.materials.push(material('PHOTO',20,{emoji:'🍌'}));s.addons[0].recipe=[{materialId:'PHOTO',qty:1}];s.addons[0].emoji='🍓'
 const w=mount(Custom)
 try{s.modals.customOrder={isOpen:true,menuId:s.menus[0].id};await flushPromises();expect(w.findAll('[data-group-option="G"]')[0].get('.entity-image').text()).toBe('🍌')}finally{w.unmount()}
})
it('uses the imported Firebase storefront for option price suggestions while preserving blank and free',async()=>{
 const s=setup(),storefrontId=encodeLegacyId('PLAT01'),deliveryId=encodeLegacyId('PLAT02')
 s.platforms.forEach(p=>{p.id=encodeLegacyId(p.id)})
 s.platforms[0].name='ซื้อที่ร้าน'
 s.addonGroups[0].pricingMode='extra'
 s.addonGroups[0].options[0].prices={[storefrontId]:100}
 const manager=mount(GroupManager,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  await manager.get('[aria-label="แก้ไขกลุ่ม เลือกผลไม้"]').trigger('click')
  await openOptionAction(manager,manager.get('[data-group-addon]'),'ราคา')
  const input=manager.get(`#group-price-${s.addons[0].id}-${storefrontId}`)
  await manager.get('[aria-label="รายละเอียดราคา GrabFood"]').trigger('click')
  const recommendation=()=>manager.get(`[data-price-recommendation="${deliveryId}"]`)
  expect(recommendation().text()).toContain('142.86')
  await recommendation().get('button').trigger('click')
  expect(manager.get(`#group-price-${s.addons[0].id}-${deliveryId}`).element.value).toBe('142.86')
  await input.setValue('')
  expect(recommendation().get('button').attributes('disabled')).toBeDefined()
  await input.setValue(0)
  expect(recommendation().text()).toContain('0.00')
  expect(recommendation().get('button').attributes('disabled')).toBeUndefined()
  await manager.get('[aria-label="รายละเอียดราคา ซื้อที่ร้าน"]').trigger('click')
  expect(manager.find(`[data-price-recommendation="${storefrontId}"]`).exists()).toBe(false)
 }finally{manager.unmount()}
})
it('uses the menu analysis popup and keeps blank, zero and paid prices distinct after saving', async () => {
 const s=setup(),platform=s.platforms[0],addon=s.addons[0]
 platform.gpPercent=25
 s.materials.push(material('PRICE-FRUIT',100,{unitCost:1}))
 addon.recipe=[{materialId:'PRICE-FRUIT',qty:10}]
 s.addonGroups[0].options=[{addonId:addon.id,prices:{},unpricedPlatformIds:s.platforms.map(p=>p.id)}]
 s.addonGroups[0].minSelections=0
 const manager=mount(GroupManager,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  expect(manager.get('.group-item-price').text()).toContain('ยังไม่ได้ตั้งราคา')
  await manager.get('.group-items-header button').trigger('click')
  await openOptionAction(manager,manager.get('[data-group-addon]'),'ราคา')
  const settings=manager.get('#group-option-settings')
  expect(settings.text()).toContain('กรอก 0 เพื่อให้ฟรี')
  await settings.get('[data-catalog-analysis="group-option-price"]').trigger('click')
  let analysis=manager.get('#catalog-group-option-price-analysis')
  expect(analysis.findAll('[data-menu-platform]')).toHaveLength(0)
  expect(analysis.text()).toContain('ยังไม่ได้ตั้งราคา')
  await analysis.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
  const input=manager.get(`#group-price-${addon.id}-${platform.id}`)
  await input.setValue(0)
  await settings.get('[data-catalog-analysis="group-option-price"]').trigger('click')
  analysis=manager.get('#catalog-group-option-price-analysis')
  expect(analysis.get('[data-menu-financial="price"]').text()).toContain('ฟรี')
  expect(analysis.get('[data-menu-financial="profit"]').text()).toContain('-฿10.00')
  await analysis.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
  await input.setValue(40)
  await settings.get(`[aria-label="รายละเอียดราคา ${platform.name}"]`).trigger('click')
  expect(settings.get(`[data-net-revenue="${platform.id}"]`).text()).toContain('30.00')
  await settings.get(`[aria-label="รายละเอียดราคา ${platform.name}"]`).trigger('click')
  await settings.get('[data-catalog-analysis="group-option-price"]').trigger('click')
  analysis=manager.get('#catalog-group-option-price-analysis')
  expect(analysis.get('[data-menu-financial="profit"]').text()).toContain('฿20.00')
  expect(analysis.get('[aria-label="รูปแบบกราฟ"]').exists()).toBe(true)
  await analysis.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
  await settings.findAll('button').find(b=>b.text()==='เสร็จสิ้น').trigger('click')
  await manager.findAll('button').find(b=>b.text()==='บันทึกกลุ่มตัวเลือก').trigger('click')
  await flushPromises()
  const saved=loadDatabase(localStorage).value.addonGroups[0].options[0]
  expect(saved.prices).toEqual({[platform.id]:40})
  expect(saved.unpricedPlatformIds).toEqual(s.platforms.slice(1).map(p=>p.id))
 }finally{manager.unmount()}
})
async function chooseOne(wrapper) {
  await wrapper.get('[role="combobox"][aria-label="ลูกค้าเลือกอย่างไร"]').trigger('click')
  await wrapper.findAll('[role="option"]').find(option => option.text() === 'ต้องเลือก 1 อย่าง').trigger('click')
}
async function addManualOption(wrapper, name) {
  await wrapper.get('[data-group-add-option]').trigger('click')
  const picker = wrapper.get('#group-stock-picker')
  await picker.findAll('button').find(button => button.text() === 'สร้างตัวเลือกเอง').trigger('click')
  const manual = wrapper.get('#group-manual-option')
  await manual.get('[aria-label="ชื่อตัวเลือก"]').setValue(name)
  await manual.findAll('button').find(button => button.text() === 'เพิ่มตัวเลือก').trigger('click')
}
async function openOptionAction(wrapper, row, label) {
  await row.get('[aria-haspopup="dialog"]').trigger('click')
  const popup = wrapper.get('#group-option-settings')
  await popup.findAll('button').find(button => button.text() === label).trigger('click')
}
it('requires the group name before deleting and detaching linked menus', async () => {
  const s=setup()
  const wrapper=mount({render:()=>h('div',[h(AddonView),h(Confirm)])},{attachTo:document.body,global:{stubs:{teleport:true}}})
  try {
    await wrapper.findAll('button').find(button=>button.text()==='ลบกลุ่ม').trigger('click')
    await flushPromises()
    const popup=wrapper.get('#ConfirmModal')
    expect(popup.text()).toContain(s.menus[0].name)
    expect(popup.get('[data-confirm-submit]').attributes('disabled')).toBeDefined()
    await popup.get('#confirm-required-text').setValue('ผิดชื่อ')
    expect(popup.get('[data-confirm-submit]').attributes('disabled')).toBeDefined()
    expect(s.addonGroups).toHaveLength(1)
    await popup.get('#confirm-required-text').setValue('เลือกผลไม้')
    await popup.get('[data-confirm-submit]').trigger('click')
    await flushPromises()
    expect(s.addonGroups).toHaveLength(0)
    expect(s.menus[0]).toMatchObject({addonGroupIds:[],hasAddons:false})
    expect(loadDatabase(localStorage).value.addonGroups).toHaveLength(0)
  } finally {wrapper.unmount()}
})
it('creates and selects a stock-free option from the group without losing its draft', async () => {
  const s = setup()
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const wrapper = mount(AddonView, { global: { stubs: { teleport: true } } })
  try {
    await wrapper.findAll('button').find(button => button.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    await wrapper.get('#addon-group-name').setValue('กลุ่มใหม่')
    await addManualOption(wrapper, 'ตัวเลือกใหม่')
    expect(s.addons.some(option => option.name === 'ตัวเลือกใหม่')).toBe(false)
    await wrapper.findAll('button').find(button => button.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    const created = s.addons.find(option => option.name === 'ตัวเลือกใหม่')
    expect(created.recipe).toEqual([])
    expect(loadDatabase(localStorage).value.addonGroups.find(group => group.name === 'กลุ่มใหม่')?.options).toEqual([{ addonId: created.id, prices: {}, unpricedPlatformIds: s.platforms.map(p => p.id) }])
  } finally {
    wrapper.unmount()
  }
})
it('adds one ingredient and one package from stock to a paid group option', async () => {
  const s = setup()
  s.materials.push(material('BLUEBERRY', 100, { name: 'บลูเบอร์รีทดสอบ', image: 'data:image/jpeg;base64,/9j/2Q==', unit: 'กรัม', hasSubRecipe: true }))
  s.materials.push(material('SPOON', 10, { name: 'ช้อนทดสอบ', inventoryType: 'packaging', unit: 'คัน' }))
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const wrapper = mount(AddonView, {
    attachTo: document.body, global: { stubs: { teleport: true } }
  })
  try {
    await wrapper.findAll('button').find(button => button.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
    await wrapper.get('#addon-group-name').setValue('กลุ่มจากคลัง')
    await wrapper.get('[data-group-add-option]').trigger('click')
    const picker = wrapper.get('#group-stock-picker')
    expect(picker.text()).toContain('คงเหลือ 100 กรัม')
    expect(picker.text()).toContain('ต้นทุนต่อกรัม')
    await picker.get('input[aria-label="บลูเบอร์รีทดสอบ"]').setValue(true)
    await picker.findAll('button').find(button => button.text() === 'เพิ่ม 1 รายการ').trigger('click')
    const row = wrapper.get('[data-group-addon]')
    expect(row.get('.group-option-image img').attributes('src')).toBe('data:image/jpeg;base64,/9j/2Q==')
    await openOptionAction(wrapper, row, 'บรรจุภัณฑ์')
    await wrapper.get('[role="combobox"][aria-label="บรรจุภัณฑ์เพิ่มเติม"]').trigger('click')
    await wrapper.findAll('[role="option"]').find(option => option.text().includes('ช้อนทดสอบ')).trigger('click')
    await wrapper.get('#group-option-settings').findAll('button').find(button => button.text() === 'เสร็จสิ้น').trigger('click')
    expect(row.text()).toContain('บลูเบอร์รีทดสอบ')
    await openOptionAction(wrapper, row, 'แก้จำนวนต่อที่')
    const platform = s.platforms[0]
    await wrapper.get('[aria-label="จำนวนต่อที่"]').setValue(2.5)
    expect(wrapper.get('[data-group-addon]').text()).toContain('กรัม')
    expect(wrapper.get('[data-group-addon]').text()).toContain('คัน')
    await wrapper.get('#group-option-settings').findAll('button').find(button => button.text() === 'เสร็จสิ้น').trigger('click')
    await openOptionAction(wrapper, row, 'ราคา')
    const pricePopup = wrapper.get('#group-option-settings')
    await pricePopup.get('input[id^="group-price-"]').setValue(12)
    await pricePopup.get('[data-catalog-analysis="group-option-price"]').trigger('click')
    expect(wrapper.get('#catalog-group-option-price-analysis [data-menu-financial="profit"]').exists()).toBe(true)
    await wrapper.get('#catalog-group-option-price-analysis [aria-label="ปิดหน้าต่าง"]').trigger('click')
    await pricePopup.findAll('button').find(button => button.text() === 'เสร็จสิ้น').trigger('click')
    const menuId = s.menus[1].id
    await wrapper.get('[role="combobox"][aria-label="เชื่อมกับเมนู"]').trigger('click')
    await wrapper.findAll('[role="option"]').find(option => option.text() === s.menus[1].name).trigger('click')
    await wrapper.findAll('button').find(button => button.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    const addon = s.addons.find(option => option.name === 'บลูเบอร์รีทดสอบ')
    expect(addon.recipe).toEqual([{ materialId: 'BLUEBERRY', qty: 2.5 }, { materialId: 'SPOON', qty: 1 }])
    const group = loadDatabase(localStorage).value.addonGroups.find(group => group.name === 'กลุ่มจากคลัง')
    expect(group.options[0].prices[platform.id]).toBe(12)
    expect(wrapper.get('[data-group-options] img').attributes('src')).toBe('data:image/jpeg;base64,/9j/2Q==')
    expect(addon.image).toBeFalsy()
    const menu = s.menus.find(item => item.id === menuId)
    expect(menu.addonGroupIds).toEqual([group.id])
    expect(s.addToCart(menu, [{ id: addon.id, groupId: group.id }])).toBe(true)
    expect(s.checkout()).toBeTruthy()
    expect(s.matMap.BLUEBERRY.stock).toBe(97.5)
    expect(s.matMap.SPOON.stock).toBe(9)
    await wrapper.get('[aria-label="แก้ไขกลุ่ม กลุ่มจากคลัง"]').trigger('click')
    await wrapper.get('[data-group-add-option]').trigger('click')
    const reopenedPicker = wrapper.get('#group-stock-picker')
    expect(reopenedPicker.get('input[aria-label="บลูเบอร์รีทดสอบ"]').element.disabled).toBe(true)
    expect(reopenedPicker.text()).toContain('อยู่ในกลุ่มแล้ว')
    const copy = { ...addon, id: 'ADDON-DUPLICATE' }
    expect(s.saveAddonGroup({
      ...group, options: [...group.options, { addonId: copy.id }], newAddons: [copy]
    })).toMatchObject({ok:false})
    expect(s.addons.some(item => item.id === copy.id)).toBe(false)
  } finally { wrapper.unmount() }
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
it('persists a staged group link only when the group drawer saves', async () => {
  const s = setup()
  const menu = s.menus[1]
  vi.spyOn(s, 'confirmDialog').mockResolvedValue(true)
  const wrapper = mount({ render: () => h('div', [h(AddonView), h(MenuEdit)]) }, {
    attachTo: document.body, global: { stubs: { teleport: true } }
  })
  try {
    await wrapper.get('[aria-label="แก้ไขกลุ่ม เลือกผลไม้"]').trigger('click')
    await wrapper.get('[role="combobox"][aria-label="เชื่อมกับเมนู"]').trigger('click')
    await wrapper.findAll('[role="option"]').find(option => option.text() === menu.name).trigger('click')
    await flushPromises()
    expect(s.menus.find(item => item.id === menu.id).addonGroupIds).toBeUndefined()
    await wrapper.findAll('button').find(button => button.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    expect(loadDatabase(localStorage).value.menus.find(item => item.id === menu.id).addonGroupIds).toEqual(['G'])
  } finally { wrapper.unmount() }
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
it('opens option details with the selected group price, stock units and channel profit', async () => {
  const s = setup()
  const addon = s.addons[0]
  const platform = s.platforms[0]
  platform.gpPercent = 25
  s.materials.push(material('DETAIL-FRUIT', 100, { name: 'ผลไม้ทดสอบ', unit: 'กรัม' }))
  s.materials.push(material('DETAIL-CUP', 100, { name: 'ถ้วยทดสอบ', unit: 'ใบ', inventoryType: 'packaging' }))
  addon.recipe = [{ materialId: 'DETAIL-FRUIT', qty: 10 }, { materialId: 'DETAIL-CUP', qty: 1 }]
  addon.prices = { [platform.id]: 90 }
  s.addonGroups.push({ ...s.addonGroups[0], id: 'PAID', name: 'ขายเพิ่ม', pricingMode: 'extra',
    options: [{ addonId: addon.id, prices: { [platform.id]: 40 } }] })
  const money = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' })
  const manager = mount(GroupManager, { attachTo: document.body, global: { stubs: { teleport: true } } })
  try {
    await manager.get('.group-item-trigger .group-item-image').trigger('click')
    const detail = manager.get('#group-option-detail')
    expect(detail.text()).toContain('10 กรัม')
    expect(detail.text()).toContain('1 ใบ')
    await detail.get('[data-catalog-analysis="group-option"]').trigger('click')
    const popup = manager.get('#catalog-group-option-analysis')
    expect(popup.get('[data-menu-financial="price"]').text()).toContain('ฟรี')
    expect(popup.get('[data-menu-financial="cost"]').text()).toContain(money.format(11))
    await popup.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
    await detail.get('[aria-label="ปิดหน้าต่าง"]').trigger('click')
    await manager.findAll('.group-directory-button').find(button => button.text().includes('ขายเพิ่ม')).trigger('click')
    await manager.get('.group-item-trigger').trigger('click')
    await manager.get('[data-catalog-analysis="group-option"]').trigger('click')
    const channel = manager.get('#catalog-group-option-analysis [data-menu-platform]')
    expect(channel.text()).toContain(money.format(40))
    expect(channel.get('[data-menu-financial="profit"] dd').text()).toBe(money.format(19))
    expect(s.addonGroups[1].options[0].paused).toBeUndefined()
  } finally { manager.unmount() }
})
it('updates the paid option profit from the price draft and channel GP', async () => {
  const s = setup()
  s.materials.push(material('FRUIT', 1000))
  s.addons[0].recipe = [{ materialId: 'FRUIT', qty: 10 }]
  s.platforms[0].gpPercent = 25
  const manager = mount(GroupManager, { attachTo: document.body, global: { stubs: { teleport: true } } })
  try {
    await manager.get('[aria-label="แก้ไขกลุ่ม เลือกผลไม้"]').trigger('click')
    await openOptionAction(manager, manager.get('[data-group-addon]'), 'แก้จำนวนต่อที่')
    const quantityPopup = manager.get('#group-option-settings')
    await quantityPopup.get('[aria-label="จำนวนต่อที่"]').setValue(11)
    expect(s.addons[0].recipe[0].qty).toBe(10)
    await quantityPopup.findAll('button').find(button => button.text() === 'เสร็จสิ้น').trigger('click')
    await openOptionAction(manager, manager.get('[data-group-addon]'), 'ราคา')
    await manager.get(`#group-price-${s.addons[0].id}-${s.platforms[0].id}`).setValue(40)
    await manager.get('[data-catalog-analysis="group-option-price"]').trigger('click')
    expect(manager.get('#catalog-group-option-price-analysis [data-menu-financial="profit"] dd').text()).toBe(new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(19))
    await manager.get('#catalog-group-option-price-analysis [aria-label="ปิดหน้าต่าง"]').trigger('click')
    await manager.get('#group-option-settings').findAll('button').find(button => button.text() === 'เสร็จสิ้น').trigger('click')
    await manager.findAll('button').find(button => button.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
    await flushPromises()
    expect(s.addons[0].recipe[0].qty).toBe(11)
    expect(s.addonGroups[0].options[1].prices[s.platforms[0].id]).toBe(0)
  } finally { manager.unmount() }
})
it('warns, blocks and reopens from stock while manual pause applies to only one group', async () => {
  const s = setup()
  s.materials.push(material('FRUIT', 10, { minAlert: 15 }))
  s.addons[0].recipe = [{ materialId: 'FRUIT', qty: 10 }]
  Object.assign(s.addonGroups[0], { warnLowStock: true, autoPauseOutOfStock: true })
  s.addonGroups.push({ ...s.addonGroups[0], id: 'H', name: 'กลุ่มที่สอง', options: s.addonGroups[0].options.map(option => ({ ...option })) })
  s.menus[0].addonGroupIds = ['G', 'H']
  const order = mount(Custom)
  const manager = mount(AddonView)
  try {
    s.modals.customOrder = { isOpen: true, menuId: s.menus[0].id }
    await flushPromises()
    const first = group => order.findAll(`[data-group-option="${group}"]`)[0]
    expect(first('G').text()).toContain('ใกล้หมด')
    s.matMap.FRUIT.stock = 0
    await flushPromises()
    expect(first('G').attributes('disabled')).toBeDefined()
    s.matMap.FRUIT.stock = 10
    await flushPromises()
    expect(first('G').attributes('disabled')).toBeUndefined()
    await manager.get(`[aria-label="เปิดขาย ${s.addons[0].name} ในกลุ่มนี้"]`).setValue(false)
    await flushPromises()
    expect(first('G').attributes('disabled')).toBeDefined()
    expect(first('H').attributes('disabled')).toBeUndefined()
    expect(loadDatabase(localStorage).value.addonGroups[0].options[0].paused).toBe(true)
  } finally { manager.unmount(); order.unmount() }
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
    expect(w.get('[aria-label="พักขายอัตโนมัติเมื่อของหมด"]').element.checked).toBe(false)
    await w.get('#addon-group-name').setValue('ฟรี 1 ชนิด')
    await chooseOne(w)
    await addManualOption(w, 'ผลไม้ฟรี')
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
    expect(w.get('.group-directory-button').attributes('aria-pressed')).toBe('true')
    expect(w.get('[data-group-options]').text()).toContain(s.addons[0].name)
    expect(w.get('[data-group-options]').text()).toContain('พร้อมจำหน่าย')
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
  await chooseOne(group)
  await addManualOption(group, 'รับช้อน')
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
