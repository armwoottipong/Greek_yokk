import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Addon from '../../src/views/AddonView.vue'

it.each([[Menu,'menu'],[Addon,'addon']])('opens %s platform analysis on demand',async(View,kind)=>{
 const store=createTestStore();store.resetDemoData()
 const wrapper=mount(View,{attachTo:document.body})
 try{
  expect(document.querySelector('[data-menu-platform]')).toBeNull()
  const trigger=wrapper.get(`[data-catalog-analysis="${kind}"]`)
  await trigger.trigger('click');await flushPromises()
  expect(document.querySelector('[role="dialog"] [data-menu-platform]')).not.toBeNull()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('ภาพรวมทุกแพลตฟอร์ม')
  document.querySelector('[role="dialog"] button[aria-label="ปิดหน้าต่าง"]').click();await flushPromises()
  expect(document.querySelector('[data-menu-platform]')).toBeNull()
 }finally{wrapper.unmount()}
})
