import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import AddonView from '../../src/views/AddonView.vue'

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
