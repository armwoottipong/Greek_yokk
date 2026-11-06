import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore.js'
import {loadDatabase} from '../../src/services/localDatabase.js'
import MenuView from '../../src/views/MenuView.vue'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'
it('opens menu ordering from its icon, saves and retains the selection and all menu fields',async()=>{
 const s=createTestStore();s.resetDemoData();const before=JSON.parse(JSON.stringify(s.menus))
 const w=mount(MenuView,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  await w.get('[aria-label="จัดลำดับเมนู"]').trigger('click')
  await w.get(`[data-order-handle="${before[1].id}"]`).trigger('keydown',{key:'ArrowUp'})
  await w.get('[data-order-save]').trigger('click');await flushPromises()
  const expected=[before[1],before[0],...before.slice(2)]
  expect(loadDatabase(localStorage).value.menus).toEqual(expected)
  expect(w.findAll('[data-menu-select]').map(row=>row.attributes('data-menu-select'))).toEqual(expected.map(m=>m.id))
  expect(w.get('[data-selected-menu-name]').text()).toBe(before[0].name)
 }finally{w.unmount()}
})
it('orders only the options inside the selected group and retains prices and availability',async()=>{
 const s=createTestStore();s.resetDemoData()
 const options=[{addonId:s.addons[0].id,paused:true,prices:{PLAT01:0}},{addonId:s.addons[1].id,prices:{PLAT01:20},unpricedPlatformIds:['PLAT02']}]
 s.addonGroups=[{id:'G',name:'ผลไม้',minSelections:0,maxSelections:2,allowRepeat:false,pricingMode:'extra',options},{id:'OTHER',name:'อีกกลุ่ม',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'included',options:[{addonId:s.addons[2].id}]}]
 const w=mount(GroupManager,{attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  await w.get('[aria-label="จัดลำดับตัวเลือก"]').trigger('click')
  await w.get(`[data-order-handle="${options[1].addonId}"]`).trigger('keydown',{key:'ArrowUp'})
  await w.get('[data-order-save]').trigger('click');await flushPromises()
  const saved=loadDatabase(localStorage).value.addonGroups
  expect(saved.map(g=>g.id)).toEqual(['G','OTHER'])
  expect(saved[0].options).toEqual([...options].reverse())
  expect(saved[1].options).toEqual([{addonId:s.addons[2].id}])
 }finally{w.unmount()}
})
