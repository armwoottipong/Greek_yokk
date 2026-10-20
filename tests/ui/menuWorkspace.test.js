import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

it('selects menus in place and shows all channels plus recipe without a dialog or platform filter',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  expect(w.findAll('[data-menu-select]')).toHaveLength(s.menus.length)
  expect(w.get('[data-menu-select]').attributes('aria-pressed')).toBe('true')
  expect(w.find('[role=dialog]').exists()).toBe(false)
  expect(w.find('[data-platform-tab]').exists()).toBe(false)
  expect(w.findAll('[data-menu-platform]')).toHaveLength(s.platforms.length)
  await w.findAll('[data-menu-select]')[1].trigger('click')
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[1].name)
  expect(w.get('[data-menu-recipe-panel]').text()).toContain('วัตถุดิบ')
  expect(s.currentPlatformId).toBe('PLAT01')
 }finally{w.unmount()}
})

it('keeps unsaved prices isolated and offers inline save/discard/cancel before selecting another menu',async()=>{
 const s=createTestStore();s.resetDemoData();const original=s.menus[0].prices.PLAT01
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-menu-edit]').trigger('click');await flushPromises()
  expect(w.find('[role=dialog]').exists()).toBe(false)
  await w.get('[aria-label="ราคา หน้าร้าน (Storefront)"]').setValue('123')
  expect(s.menus[0].prices.PLAT01).toBe(original)
  expect(w.get('[data-menu-platform=PLAT01] [data-menu-financial=price]').text()).toContain('฿123.00')
  await w.findAll('[data-menu-select]')[1].trigger('click')
  expect(w.get('[data-menu-unsaved]').text()).toContain('ยังไม่ได้บันทึก')
  await w.get('[data-menu-stay]').trigger('click')
  expect(w.get('[aria-label="ราคา หน้าร้าน (Storefront)"]').element.value).toBe('123')
  await w.findAll('[data-menu-select]')[1].trigger('click')
  await w.get('[data-menu-discard]').trigger('click');await flushPromises()
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[1].name)
  expect(s.menus[0].prices.PLAT01).toBe(original)
 }finally{w.unmount()}
})

it('saves inline edits through the store without opening a save popup',async()=>{
 const s=createTestStore();s.resetDemoData();const confirm=vi.spyOn(s,'confirmDialog')
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-menu-edit]').trigger('click');await flushPromises()
  await w.get('#menu-name').setValue('Updated bowl')
  await w.get('[data-inline-menu-save]').trigger('click');await flushPromises()
  expect(s.menus[0].name).toBe('Updated bowl')
  expect(w.get('[data-selected-menu-name]').text()).toBe('Updated bowl')
  expect(confirm).not.toHaveBeenCalled()
  expect(w.find('#menu-name').exists()).toBe(false)
 }finally{w.unmount()}
})

it('retains the active menu when searching and can clear a no-results search',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  await w.findAll('[data-menu-select]')[1].trigger('click')
  await w.get('[aria-label="ค้นหาเมนู"]').setValue('missing-menu')
  expect(w.findAll('[data-menu-select]')).toHaveLength(0)
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[1].name)
  await w.get('[data-menu-clear-search]').trigger('click')
  expect(w.findAll('[data-menu-select]')).toHaveLength(s.menus.length)
 }finally{w.unmount()}
})

it('creates a new menu inline and makes the saved item active',async()=>{
 const s=createTestStore();s.resetDemoData();const count=s.menus.length,w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  await w.get('#menu-name').setValue('New inline bowl')
  await w.get('[data-inline-menu-save]').trigger('click');await flushPromises()
  expect(s.menus).toHaveLength(count+1)
  expect(w.get('[data-selected-menu-name]').text()).toBe('New inline bowl')
  expect(w.find('[role=dialog]').exists()).toBe(false)
 }finally{w.unmount()}
})

it('keeps an invalid draft and pending navigation until save succeeds',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-menu-edit]').trigger('click');await flushPromises()
  await w.get('#menu-name').setValue('')
  await w.findAll('[data-menu-select]')[1].trigger('click')
  await w.get('[data-menu-save-continue]').trigger('click');await flushPromises()
  expect(w.get('#menu-name').attributes('aria-invalid')).toBe('true')
  expect(w.find('[data-menu-unsaved]').exists()).toBe(true)
  expect(s.menus[0].name).not.toBe('')
  await w.get('#menu-name').setValue('Saved before switch')
  await w.get('[data-menu-save-continue]').trigger('click');await flushPromises()
  expect(s.menus[0].name).toBe('Saved before switch')
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[1].name)
 }finally{w.unmount()}
})

it('resets a discarded new draft when starting another new menu',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  await w.get('#menu-name').setValue('Discarded new draft')
  await w.get('[data-catalog-add]').trigger('click')
  await w.get('[data-menu-discard]').trigger('click');await flushPromises()
  expect(w.get('#menu-name').element.value).toBe('')
  expect(s.menus.some(menu=>menu.name==='Discarded new draft')).toBe(false)
 }finally{w.unmount()}
})
