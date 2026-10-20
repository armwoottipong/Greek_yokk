import { it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestStore, material } from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Custom from '../../src/components/modals/CustomOrderModal.vue'

function setup() {
 const s=createTestStore();s.resetDemoData()
 s.materials=[material('BASE',1000,{unitCost:10}),...[4,7,10,15].map((unitCost,i)=>material(`F${i}`,1000,{unitCost}))]
 s.addons=[0,1,2,3].map(i=>({id:`A${i}`,name:`ผลไม้ ${i}`,recipe:[{materialId:`F${i}`,qty:1}],prices:{PLAT01:20}}))
 s.addonGroups=[{id:'G',name:'ฟรี 3 ชนิด',pricingMode:'included',minSelections:3,maxSelections:3,allowRepeat:false,options:s.addons.map(a=>({addonId:a.id}))}]
 s.menus=[{id:'M',name:'Trio',prices:{PLAT01:100},recipe:[{materialId:'BASE',qty:2}],hasAddons:true,addonGroupIds:['G']}]
 s.platforms[0].gpPercent=30
 return s
}
it('shows average and worst-case profit after GP in menu details',async()=>{
 setup();const w=mount(Menu,{attachTo:document.body})
 try {
  await w.get('[data-catalog-details]').trigger('click');await flushPromises()
  expect(document.querySelector('[data-menu-average-profit]').textContent).toContain('฿23.00')
  expect(document.querySelector('[data-menu-worst-profit]').textContent).toContain('฿18.00')
 } finally {w.unmount()}
})
it('updates POS actual selection cost and profit with fruit and bowl quantities',async()=>{
 const s=setup(),w=mount(Custom)
 try {
  s.modals.customOrder={isOpen:true,menuId:'M'};await flushPromises()
  const options=w.findAll('[data-group-option="G"]')
  await options[0].trigger('click');await options[1].trigger('click');await options[2].trigger('click')
  expect(w.get('[data-pos-selection-cost]').text()).toContain('฿41.00')
  expect(w.get('[data-pos-selection-profit]').text()).toContain('฿29.00')
  await w.get('[aria-label="เพิ่มจำนวนชาม"]').trigger('click')
  expect(w.get('[data-pos-selection-cost]').text()).toContain('฿82.00')
  expect(w.get('[data-pos-selection-profit]').text()).toContain('฿58.00')
 } finally {w.unmount()}
})
