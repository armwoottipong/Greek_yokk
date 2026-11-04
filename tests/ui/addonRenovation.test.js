import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import AddonView from '../../src/components/catalog/OptionCatalog.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'

it('associates group validation with the invalid input and focuses it without saving',async()=>{
 const store=createTestStore();store.resetDemoData()
 const host=document.createElement('div');document.body.append(host)
 const w=mount(GroupManager,{attachTo:host,global:{stubs:{teleport:true}}})
 try{
  await w.findAll('button').find(b=>b.text().includes('เพิ่มกลุ่มตัวเลือก')).trigger('click')
  await flushPromises()
  await w.findAll('button').find(b=>b.text().includes('บันทึกกลุ่มตัวเลือก')).trigger('click')
  await flushPromises()
  const input=w.get('#addon-group-name')
  expect(input.attributes('aria-invalid')).toBe('true')
  expect(input.attributes('aria-describedby')).toContain('addon-group-name-error')
  expect(document.activeElement).toBe(input.element)
  expect(store.addonGroups).toHaveLength(0)
 }finally{w.unmount();host.remove()}
})

it('shows all platform financials for the active addon without changing checkout channel',async()=>{
 const store=createTestStore();store.resetDemoData();const original=store.currentPlatformId,w=mount(AddonView,{attachTo:document.body})
 try{
  document.querySelector('[data-catalog-analysis="addon"]').click();await flushPromises()
  expect(w.findAll('[data-addon-select]')).toHaveLength(store.addons.length)
  expect(document.querySelectorAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(w.find('[aria-label="ช่องทางที่แสดงราคา"]').exists()).toBe(false)
  await w.get('[aria-label="ค้นหาตัวเลือกเสริม"]').setValue('not found')
  expect(w.findAll('[data-addon-select]')).toHaveLength(0)
  await w.get('[aria-label="ล้างค้นหาตัวเลือกเสริม"]').trigger('click')
  expect(w.findAll('[data-addon-select]')).toHaveLength(store.addons.length)
  expect(store.currentPlatformId).toBe(original)
 }finally{w.unmount()}
})
