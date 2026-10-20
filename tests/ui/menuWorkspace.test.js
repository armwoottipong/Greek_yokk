import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
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

it.each(['[data-menu-edit]','[data-menu-recipe-panel] button'])('opens the original edit popup from %s',async selector=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  await w.findAll('[data-menu-select]')[1].trigger('click')
  await w.get(selector).trigger('click')
  expect(s.modals.menuEdit).toMatchObject({isOpen:true,menuId:s.menus[1].id})
  expect(w.find('#menu-name').exists()).toBe(false)
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[1].name)
 }finally{w.unmount()}
})

it('opens the original add popup without replacing the active overview',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  await w.get('[data-catalog-add]').trigger('click')
  expect(s.modals.menuEdit).toMatchObject({isOpen:true,menuId:null})
  expect(w.find('#menu-name').exists()).toBe(false)
  expect(w.get('[data-selected-menu-name]').text()).toContain(s.menus[0].name)
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
