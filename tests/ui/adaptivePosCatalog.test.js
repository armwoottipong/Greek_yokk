import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {nextTick} from 'vue'
import {createTestStore} from '../helpers/createStore'
import Pos from '../../src/views/PosView.vue'
it('selects a channel from the desktop dropdown and updates displayed prices',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Pos,{attachTo:document.body})
 try{
  await nextTick()
  const select=w.get('[data-pos-channel][role="combobox"]')
  expect(select.text()).toContain(store.platforms[0].name)
  await select.trigger('click')
  const list=document.getElementById(select.attributes('aria-controls'))
  const options=list.querySelectorAll('[role="option"]')
  expect(options[0].getAttribute('aria-selected')).toBe('true')
  options[1].click();await flushPromises()
  expect(store.currentPlatformId).toBe(store.platforms[1].id)
  expect(select.text()).toContain(store.platforms[1].name)
  expect(select.attributes('aria-expanded')).toBe('false')
  expect(w.text()).toContain('฿95')
 }finally{w.unmount()}
})
it('uses a bottom sheet on mobile and restores focus after selecting a channel',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener(){},removeEventListener(){}}))
 const store=createTestStore();store.resetDemoData()
 const w=mount(Pos,{attachTo:document.body,global:{stubs:{transition:false}}})
 try{
  const trigger=w.get('[data-pos-channel][aria-haspopup="dialog"]')
  trigger.element.focus();await trigger.trigger('click');await flushPromises()
  const dialog=document.getElementById(trigger.attributes('aria-controls'))
  expect(dialog.querySelector('.dialog-frame-panel--sheet')).toBeTruthy()
  const options=dialog.querySelectorAll('[data-channel-option]')
  expect(options[0].getAttribute('aria-current')).toBe('true')
  expect(document.activeElement).toBe(options[0])
  options[1].click()
  await vi.waitFor(()=>expect(document.body.contains(dialog)).toBe(false))
  expect(store.currentPlatformId).toBe(store.platforms[1].id)
  expect(trigger.text()).toContain(store.platforms[1].name)
  expect(document.activeElement).toBe(trigger.element)
  expect(w.text()).toContain('฿95')
 }finally{w.unmount();vi.unstubAllGlobals()}
})
it('filters inactive menus and keeps sold-out items selectable for the existing warning flow',async()=>{
 const store=createTestStore();store.resetDemoData();store.menus[1].isActive=false
 store.materials[0].stock=0;store.materials[0].lots.forEach(l=>{l.qty=0})
 const w=mount(Pos)
 try{
  expect(w.findAll('[data-pos-menu]')).toHaveLength(3)
  const menu=store.menus[0];const card=w.get('[data-pos-menu="'+menu.id+'"]')
  expect(card.attributes('disabled')).toBeUndefined();await card.trigger('click')
  expect(store.modals.customOrder.menuId).toBe(menu.id)
  await w.get('[data-pos-search]').setValue('ไม่มีเมนูนี้')
  expect(w.findAll('[data-pos-menu]')).toHaveLength(0);expect(w.text()).toContain('ไม่พบเมนู')
 }finally{w.unmount()}
})
