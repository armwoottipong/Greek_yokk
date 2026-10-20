import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Toolbar from '../../src/components/catalog/CatalogToolbar.vue'
import Prices from '../../src/components/catalog/PlatformPriceSummary.vue'
import Filter from '../../src/components/ui/FilterDropdown.vue'
it('keeps filter drafts separate and resets to all categories and first platform',async()=>{
 const w=mount(Toolbar,{props:{id:'test-catalog',label:'เมนู',category:'Unknown',platform:'B',platforms:[{id:'A',name:'ร้าน'},{id:'B',name:'ส่ง'}],categories:['Unknown']}})
 await w.get('[data-catalog-filter]').trigger('click');await flushPromises()
 const f=w.getComponent(Filter);f.vm.draft.category='Other';f.vm.$emit('close');await flushPromises()
 expect(w.emitted('apply-filters')).toBeUndefined()
 await w.get('[data-catalog-filter]').trigger('click');await flushPromises();f.vm.reset();f.vm.apply()
 expect(w.emitted('apply-filters')[0][0]).toEqual({category:'ทั้งหมด',platform:'A'});w.unmount()
})
it('shows every admin platform without changing checkout and removes stale platform rows',async()=>{
 const store=createTestStore();store.resetDemoData();const setPlatform=vi.spyOn(store,'setPlatform')
 const w=mount(Menu)
 try{
  expect(w.findAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(setPlatform).not.toHaveBeenCalled()
  const removed=store.platforms[1].id
  store.platforms.splice(1,1);await flushPromises()
  expect(w.find(`[data-menu-platform="${removed}"]`).exists()).toBe(false)
  expect(w.findAll('[data-menu-platform]')).toHaveLength(store.platforms.length)
  expect(setPlatform).not.toHaveBeenCalled()
 }finally{w.unmount()}
})
it('distinguishes zero, missing prices and unknown platform',()=>{
 const w=mount(Prices,{props:{prices:{A:0},platforms:[{id:'A',name:'ร้าน'},{id:'B',name:'ส่ง'}],selectedId:'A'}})
 expect(w.text()).toContain('฿0');expect(w.text()).toContain('ยังไม่กำหนดราคา');w.unmount()
 const unknown=mount(Prices,{props:{prices:{},platforms:[],selectedId:'GONE'}});expect(unknown.text()).toContain('ไม่มีช่องทางขาย');unknown.unmount()
})
