import { it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

it('updates all price and GP financials when choosing a platform in the sheet',async()=>{
 const store=createTestStore();store.resetDemoData()
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const sheet=()=>document.getElementById('menu-recipe')
  const value=key=>sheet().querySelector(`[data-menu-financial="${key}"]`).textContent
  expect(value('price')).toContain('฿69.00')
  expect(value('cost')).toContain('฿25.40')
  expect(value('profit')).toContain('฿43.60')
  sheet().querySelector('[data-platform-price="PLAT02"]').click();await flushPromises()
  expect(value('price')).toContain('GrabFood');expect(value('price')).toContain('฿95.00')
  expect(value('gp')).toContain('30%');expect(value('gp')).toContain('฿28.50')
  expect(value('net')).toContain('฿66.50')
  expect(value('profit')).toContain('฿41.10')
  expect(value('margin')).toContain('61.8%')
  expect(value('cost')).toContain('฿25.40')
  expect(store.currentPlatformId).toBe('PLAT01')
  store.platforms.find(p=>p.id==='PLAT02').gpPercent=20;await flushPromises()
  expect(value('gp')).toContain('฿19.00');expect(value('net')).toContain('฿76.00')
  store.menus[0].prices.PLAT02=10;await flushPromises()
  expect(value('profit')).toContain('-฿17.40');expect(value('margin')).toContain('-217.5%')
 }finally{w.unmount()}
})

it('distinguishes unset and zero prices without showing another platform values',async()=>{
 const store=createTestStore();store.resetDemoData();delete store.menus[0].prices.PLAT02
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const sheet=()=>document.getElementById('menu-recipe')
  sheet().querySelector('[data-platform-price="PLAT02"]').click();await flushPromises()
  expect(sheet().querySelector('[data-menu-financial="price"]').textContent).toContain('ยังไม่กำหนดราคา')
  expect(sheet().querySelector('[data-menu-financial="net"]').textContent).toContain('ยังคำนวณไม่ได้')
  store.menus[0].prices.PLAT02=0;await flushPromises()
  expect(sheet().querySelector('[data-menu-financial="price"]').textContent).toContain('฿0.00')
  expect(sheet().querySelector('[data-menu-financial="net"]').textContent).toContain('฿0.00')
  expect(sheet().querySelector('[data-menu-financial="margin"]').textContent).toContain('ยังคำนวณไม่ได้')
 }finally{w.unmount()}
})
