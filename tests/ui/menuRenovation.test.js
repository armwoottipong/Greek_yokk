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

it('changes the displayed channel inline without changing checkout pricing',async()=>{
 const store=createTestStore();store.resetDemoData();const original=store.currentPlatformId,w=mount(Menu)
 try{
  await flushPromises()
  await w.get('[role="tab"][data-platform-tab="PLAT02"]').trigger('click')
  await flushPromises()
  expect(w.vm.displayPlatformId).toBe(store.platforms[1].id);expect(store.currentPlatformId).toBe(original)
 }finally{w.unmount()}
})

it('selects platform badges in the detail sheet and keeps toolbar selection in sync without changing POS',async()=>{
 const store=createTestStore();store.resetDemoData();const platform=store.currentPlatformId,before=JSON.stringify(store.menus)
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const sheet=()=>document.getElementById('menu-recipe')
  const badge=sheet().querySelector('button[data-platform-price="PLAT02"]')
  expect(badge).not.toBeNull();badge.click();await flushPromises()
  expect(badge.getAttribute('aria-pressed')).toBe('true')
  expect(sheet().querySelector('[data-platform-price="PLAT01"]').getAttribute('aria-pressed')).toBe('false')
  expect(w.get('[data-platform-tab="PLAT02"]').attributes('aria-selected')).toBe('true')
  expect(w.vm.displayPlatformId).toBe('PLAT02')
  expect(store.currentPlatformId).toBe(platform)
  expect(JSON.stringify(store.menus)).toBe(before)
  w.vm.closeBomModal();await flushPromises()
  expect(w.get('[data-platform-tab="PLAT02"]').attributes('aria-selected')).toBe('true')
  expect(w.get('.menu-row-price').text()).toContain('GrabFood')
 }finally{w.unmount()}
})

it('supports keyboard platform tabs',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-platform-tab="PLAT01"]').trigger('keydown',{key:'ArrowRight'});await flushPromises()
  expect(w.vm.displayPlatformId).toBe('PLAT02')
  expect(document.activeElement.getAttribute('data-platform-tab')).toBe('PLAT02')
  await w.get('[data-platform-tab="PLAT02"]').trigger('keydown',{key:'End'});await flushPromises()
  expect(w.vm.displayPlatformId).toBe('PLAT04')
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
