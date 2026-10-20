import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import AddonView from '../../src/views/AddonView.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'

it('keeps search and selected channel when moving between addons and reusable groups',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(AddonView)
 try {
  await w.get('[aria-label="ค้นหา Add-on"]').setValue(store.addons[0].name)
  await w.get('[data-addon-section="groups"]').trigger('click')
  expect(w.get('[data-addon-section="groups"]').attributes('aria-pressed')).toBe('true')
  expect(w.findComponent(GroupManager).isVisible()).toBe(true)
  expect(w.get('[aria-label="รายการ Add-on"]').isVisible()).toBe(false)
  await w.get('[data-addon-section="addons"]').trigger('click')
  expect(w.get('[aria-label="ค้นหา Add-on"]').element.value).toBe(store.addons[0].name)
  expect(w.findAll('[data-addon-details]')).toHaveLength(1)
 }finally{w.unmount()}
})

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

it('shows one addon row and one selected price, independently of checkout channel',async()=>{
 const store=createTestStore();store.resetDemoData()
 const original=store.currentPlatformId,w=mount(AddonView)
 try {
  await flushPromises()
  expect(w.findAll('[data-addon-details]')).toHaveLength(store.addons.length)
  expect(w.find('table').exists()).toBe(false)
  expect(w.findAll('.platform-price')).toHaveLength(store.addons.length)
  const channel=w.get('[aria-label="ช่องทางที่แสดงราคา"][role="combobox"]')
  await channel.trigger('keydown',{key:'ArrowDown'})
  await channel.trigger('keydown',{key:'ArrowDown'})
  await channel.trigger('keydown',{key:'Enter'});await flushPromises()
  expect(w.vm.displayPlatformId).toBe(store.platforms[1].id)
  expect(store.currentPlatformId).toBe(original)
  await w.get('[aria-label="ค้นหา Add-on"]').setValue('not found')
  expect(w.findAll('[data-addon-details]')).toHaveLength(0)
  await w.get('[aria-label="ล้างค้นหา Add-on"]').trigger('click')
  expect(w.findAll('[data-addon-details]')).toHaveLength(store.addons.length)
 }finally{w.unmount()}
})
