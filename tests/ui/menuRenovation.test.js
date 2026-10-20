import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Editor from '../../src/components/modals/MenuEditModal.vue'

it('clears the menu search and restores the full list',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[aria-label="ค้นหาเมนู"]').setValue('missing')
  expect(w.findAll('[data-catalog-details]')).toHaveLength(0)
  w.get('[aria-label="ล้างค้นหาเมนู"]').element.focus()
  await w.get('[aria-label="ล้างค้นหาเมนู"]').trigger('click');await flushPromises()
  expect(w.findAll('[data-catalog-details]')).toHaveLength(4)
  expect(document.activeElement.getAttribute('aria-label')).toBe('ค้นหาเมนู')
 }finally{w.unmount()}
})

it('selects another menu without changing checkout channel or saved menu data',async()=>{
 const store=createTestStore();store.resetDemoData();const before=JSON.stringify(store.menus),platform=store.currentPlatformId,w=mount(Menu)
 try{
  await w.findAll('[data-menu-select]')[1].trigger('click');await flushPromises()
  expect(w.get('[data-selected-menu-name]').text()).toContain(store.menus[1].name)
  expect(w.findAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(store.currentPlatformId).toBe(platform);expect(JSON.stringify(store.menus)).toBe(before)
 }finally{w.unmount()}
})

it('allows keyboard selection of a menu using native list buttons',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  const button=w.findAll('[data-menu-select]')[1]
  button.element.focus();button.element.click();await flushPromises()
  expect(button.attributes('aria-pressed')).toBe('true')
  expect(w.get('[data-selected-menu-name]').text()).toContain(store.menus[1].name)
 }finally{w.unmount()}
})

it('keeps blank and zero prices distinct while editing through shared numeric fields',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Editor)
 try{
  store.modals.menuEdit={isOpen:true,menuId:null};await flushPromises()
  const price=w.get(`[aria-label="ราคา ${store.platforms[0].name}"]`)
  await price.setValue('0');expect(w.vm.form.prices[store.platforms[0].id]).toBe(0)
  await price.setValue('');expect(w.vm.form.prices[store.platforms[0].id]).toBe('')
  await price.setValue('125.5');expect(w.vm.form.prices[store.platforms[0].id]).toBe(125.5)
 }finally{w.unmount()}
})
