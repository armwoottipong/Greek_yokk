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
  if(kind==='addon')await wrapper.get('[data-addon-section="addons"]').trigger('click')
  await new Promise(resolve=>setTimeout(resolve,0));await flushPromises()
  const trigger=document.querySelector(`[data-catalog-analysis="${kind}"]`)
  expect(trigger).not.toBeNull()
  expect(trigger.closest(`[data-${kind}-header]`)).not.toBeNull()
  expect(document.querySelector(kind==='menu'?'#menu-recipe > .menu-recipe-panel':'#addon-details > .addon-recipe-panel')).not.toBeNull()
  expect(document.querySelector(`${kind==='menu'?'#menu-recipe':'#addon-details'} > .catalog-analysis-action--ported`)).not.toBeNull()
  trigger.click();await flushPromises()
  expect(document.querySelector('[role="dialog"] [data-menu-platform]')).not.toBeNull()
  expect(document.querySelector('[role="dialog"]')?.textContent).toContain('ภาพรวมทุกแพลตฟอร์ม')
  document.querySelector('[role="dialog"] button[aria-label="ปิดหน้าต่าง"]').click();await flushPromises()
  expect(document.querySelector('[data-menu-platform]')).toBeNull()
 }finally{wrapper.unmount()}
})
