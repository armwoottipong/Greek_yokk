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
 } finally { wrapper.unmount(); vi.unstubAllGlobals() }
})
