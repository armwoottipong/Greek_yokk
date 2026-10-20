import { it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore } from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

const row = id => document.querySelector(`[data-menu-platform="${id}"]`)
const value = (id,key) => row(id).querySelector(`[data-menu-financial="${key}"]`).textContent

it('shows all platform financials immediately without choosing a platform or changing POS',async()=>{
 const store=createTestStore();store.resetDemoData()
 const original=store.currentPlatformId,before=JSON.stringify(store.menus),w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  expect(document.querySelectorAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(document.querySelector('#menu-recipe button[data-platform-price]')).toBeNull()
  expect(value('PLAT01','price')).toContain('฿69.00')
  expect(value('PLAT01','profit')).toContain('฿43.60')
  expect(value('PLAT02','price')).toContain('฿95.00')
  expect(value('PLAT02','gp')).toContain('฿28.50')
  expect(value('PLAT02','net')).toContain('฿66.50')
  expect(value('PLAT02','cost')).toContain('฿25.40')
  expect(value('PLAT02','profit')).toContain('฿41.10')
  expect(value('PLAT02','margin')).toContain('61.8%')
  expect(store.currentPlatformId).toBe(original)
  expect(JSON.stringify(store.menus)).toBe(before)
 }finally{w.unmount()}
})

it('updates each platform reactively and labels loss without drawing negative bar segments',async()=>{
 const store=createTestStore();store.resetDemoData();const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  store.platforms.find(p=>p.id==='PLAT02').gpPercent=20;await flushPromises()
  expect(value('PLAT02','gp')).toContain('฿19.00');expect(value('PLAT02','net')).toContain('฿76.00')
  store.menus[0].prices.PLAT02=10;await flushPromises()
  expect(value('PLAT02','profit')).toContain('-฿17.40')
  expect(value('PLAT02','margin')).toContain('-217.5%')
  expect(row('PLAT02').textContent).toContain('ขาดทุน')
  expect(row('PLAT02').querySelector('[data-profit-segment]')).toBeNull()
  for(const segment of row('PLAT02').querySelectorAll('[data-chart-segment]')) expect(parseFloat(segment.style.width)).toBeGreaterThanOrEqual(0)
  expect(value('PLAT01','profit')).toContain('฿43.60')
 }finally{w.unmount()}
})

it.each([undefined,null,'',0,'0'])('shows a static unset-price skeleton for %s in all graph modes',async price=>{
 const store=createTestStore();store.resetDemoData();store.menus[0].prices.PLAT02=price
 const w=mount(Menu,{attachTo:document.body})
 try{
  for(const label of ['แท่ง','วงกลม','เส้น']){
   const button=w.findAll('button').find(b=>b.text()===label)
   await button.trigger('click');await flushPromises()
   expect(value('PLAT02','price')).toContain('ยังไม่ได้ตั้งราคา')
   expect(row('PLAT02').querySelector('[data-platform-unpriced]')).not.toBeNull()
   expect(row('PLAT02').querySelector('[data-platform-chart], [data-platform-donut], .platform-metrics, .platform-net')).toBeNull()
   expect(w.find('[data-line-platform="PLAT02"]').exists()).toBe(false)
   expect(value('PLAT01','profit')).toContain('฿43.60')
   expect(row('PLAT02').textContent).not.toMatch(/ขาดทุน|NaN|Infinity/)
  }
  store.menus[0].prices.PLAT02=95;await flushPromises()
  expect(row('PLAT02').querySelector('[data-platform-unpriced]')).toBeNull()
  expect(value('PLAT02','profit')).toContain('฿41.10')
 }finally{w.unmount()}
})

it('keeps invalid GP unavailable while valid platforms still show their own chart',async()=>{
 const store=createTestStore();store.resetDemoData();store.platforms[1].gpPercent=101
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  expect(value('PLAT02','gp')).toContain('ยังคำนวณไม่ได้')
  expect(row('PLAT02').querySelector('[data-platform-chart]')).toBeNull()
  expect(row('PLAT02').textContent).toContain('ตรวจ GP')
  expect(row('PLAT01').querySelector('[data-platform-chart]')).not.toBeNull()
 }finally{w.unmount()}
})

it('uses one money scale so equal costs occupy equal widths across different prices',async()=>{
 const store=createTestStore();store.resetDemoData();store.platforms=store.platforms.slice(0,2)
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const costs=['PLAT01','PLAT02'].map(id=>parseFloat(row(id).querySelector('.segment-cost').style.width))
  expect(costs[0]).toBeCloseTo(26.736842,4)
  expect(costs[1]).toBeCloseTo(26.736842,4)
 }finally{w.unmount()}
})

it('does not draw a profit chart when a recipe material has no known cost',async()=>{
 const store=createTestStore();store.resetDemoData()
 const materialId=store.menus[0].recipe[0].materialId
 store.materials.find(m=>m.id===materialId).unitCost=null
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  expect(value('PLAT01','cost')).toContain('ยังคำนวณไม่ได้')
  expect(value('PLAT01','profit')).toContain('ยังคำนวณไม่ได้')
  expect(row('PLAT01').querySelector('[data-platform-chart]')).toBeNull()
  expect(row('PLAT01').textContent).toContain('ตรวจต้นทุน')
 }finally{w.unmount()}
})

it('switches between bar, donut and line without filtering platforms or mutating menu prices',async()=>{
 const store=createTestStore();store.resetDemoData();const before=JSON.stringify(store.menus)
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const sheet=()=>document.getElementById('menu-recipe')
  const mode=label=>[...sheet().querySelectorAll('button')].find(b=>b.textContent===label)
  expect(mode('แท่ง').getAttribute('aria-pressed')).toBe('true')
  mode('วงกลม').click();await flushPromises()
  expect(sheet().querySelectorAll('[data-platform-donut]').length).toBe(store.platforms.length)
  expect(sheet().querySelectorAll('[data-platform-chart]')).toHaveLength(0)
  mode('เส้น').click();await flushPromises()
  expect(sheet().querySelector('[data-platform-lines]')).not.toBeNull()
  expect(sheet().querySelectorAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(value('PLAT02','profit')).toContain('฿41.10')
  expect(JSON.stringify(store.menus)).toBe(before)
  mode('แท่ง').click();await flushPromises()
  expect(sheet().querySelectorAll('[data-platform-chart]').length).toBe(store.platforms.length)
 }finally{w.unmount()}
})

it('plots a negative profit below zero and leaves unknown platform profits unplotted',async()=>{
 const store=createTestStore();store.resetDemoData();store.menus[0].prices.PLAT02=10;delete store.menus[0].prices.PLAT03
 const w=mount(Menu,{attachTo:document.body})
 try{
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  const sheet=document.getElementById('menu-recipe')
  ;[...sheet.querySelectorAll('button')].find(b=>b.textContent==='เส้น').click();await flushPromises()
  const zero=Number(sheet.querySelector('[data-zero-baseline]').getAttribute('y1'))
  const point=sheet.querySelector('[data-line-series="profit"][data-line-platform="PLAT02"]')
  expect(Number(point.getAttribute('cy'))).toBeGreaterThan(zero)
  expect(sheet.querySelector('[data-line-series="profit"][data-line-platform="PLAT03"]')).toBeNull()
  ;[...sheet.querySelectorAll('button')].find(b=>b.textContent==='วงกลม').click();await flushPromises()
  expect(row('PLAT02').querySelector('[data-platform-donut]').textContent).toContain('ค่าใช้จ่าย')
  expect(row('PLAT02').querySelector('[data-donut-profit]')).toBeNull()
  expect(value('PLAT02','profit')).toContain('-฿18.40')
 }finally{w.unmount()}
})
