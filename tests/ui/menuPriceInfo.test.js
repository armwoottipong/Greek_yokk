import { it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MenuPriceInfo from '../../src/components/catalog/MenuPriceInfo.vue'

it('keeps the price popup inside a short viewport even when its input has scrolled below it', async () => {
 vi.stubGlobal('innerWidth', 320); vi.stubGlobal('innerHeight', 480)
 vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
  return this.classList.contains('menu-price-info-trigger')
   ? { top: 497, bottom: 541, left: 260, right: 304, width: 44, height: 44 }
   : { top: 0, bottom: 274, left: 0, right: 296, width: 296, height: 274 }
 })
 const wrapper = mount(MenuPriceInfo, { props: { open: false, platform: { id: 'PLAT02', name: 'GrabFood', gpPercent: 30 }, sellingPrice: 95, storefrontPrice: 100, hasStorefront: true } })
 try {
  await wrapper.setProps({ open: true }); await flushPromises()
  const popup = wrapper.get('[role="region"]')
  expect(popup.element.style.top).toBe('194px')
  expect(popup.element.style.left).toBe('12px')
  expect(wrapper.get('.menu-price-info-arrow').attributes('aria-hidden')).toBe('true')
  expect(wrapper.get('.menu-price-info-arrow').element.style.visibility).toBe('hidden')
 } finally { wrapper.unmount(); vi.restoreAllMocks(); vi.unstubAllGlobals() }
})

it('points the price popup arrow at a visible trigger above or below',async()=>{
 vi.stubGlobal('innerWidth',360);vi.stubGlobal('innerHeight',400)
 let triggerTop=330
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){
  return this.classList.contains('menu-price-info-trigger')
   ? {top:triggerTop,bottom:triggerTop+44,left:280,right:324,width:44,height:44}
   : {top:0,bottom:140,left:0,right:300,width:300,height:140}
 })
 const w=mount(MenuPriceInfo,{props:{open:false,platform:{id:'PLAT01',name:'หน้าร้าน',gpPercent:0}}})
 try{
  await w.setProps({open:true});await flushPromises()
  expect(w.get('.menu-price-info-arrow').classes()).toContain('is-above')
  expect(w.get('.menu-price-info-arrow').element.style.visibility).toBe('visible')
  triggerTop=20;window.dispatchEvent(new Event('resize'));await flushPromises()
  expect(w.get('.menu-price-info-arrow').classes()).not.toContain('is-above')
  expect(w.get('[role="region"]').element.style.top).toBe('74px')
 }finally{w.unmount();vi.restoreAllMocks();vi.unstubAllGlobals()}
})
