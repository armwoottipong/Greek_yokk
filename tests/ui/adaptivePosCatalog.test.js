import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {nextTick} from 'vue'
import {createTestStore} from '../helpers/createStore'
import Pos from '../../src/views/PosView.vue'
it('selects a channel with visible tabs and updates displayed prices',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Pos)
 try{
  await nextTick()
  const tabs=w.findAll('[role="tab"]')
  expect(tabs[0].attributes('aria-selected')).toBe('true')
  await tabs[1].trigger('click')
  expect(store.currentPlatformId).toBe(store.platforms[1].id)
  expect(tabs[1].attributes('aria-selected')).toBe('true')
  expect(tabs[0].attributes('aria-selected')).toBe('false')
  expect(w.text()).toContain('฿95')
 }finally{w.unmount()}
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
