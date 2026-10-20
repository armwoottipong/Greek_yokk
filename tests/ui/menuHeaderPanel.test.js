import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {Trash2} from 'lucide-vue-next'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

it('groups active identity and add/edit actions in one header panel',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  const header=w.get('[data-menu-header]')
  expect(header.get('[data-selected-menu-name]').text()).toBe(s.menus[0].name)
  expect(header.find('[data-catalog-add]').exists()).toBe(true)
  expect(header.find('[data-menu-edit]').exists()).toBe(true)
  expect(header.text()).toContain('เปิดขาย')
  await w.findAll('[data-menu-select]')[1].trigger('click')
  expect(header.get('[data-selected-menu-name]').text()).toBe(s.menus[1].name)
  await header.get('[data-menu-edit]').trigger('click')
  expect(s.modals.menuEdit).toMatchObject({isOpen:true,menuId:s.menus[1].id})
 }finally{w.unmount()}
})
it('exposes an accessible trash button directly in the header',()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  const header=w.get('[data-menu-header]'),button=header.get('button[data-menu-delete]')
  expect(button.attributes('aria-label')).toBe('ลบเมนู')
  expect(button.findComponent(Trash2).exists()).toBe(true)
  expect(header.find('[data-menu-more]').exists()).toBe(false)
  expect(s.menus).toHaveLength(4)
 }finally{w.unmount()}
})
it.each([true,false])('confirms the exact active menu before deletion (confirm=%s)',async approved=>{
 const s=createTestStore();s.resetDemoData();const confirm=vi.spyOn(s,'confirmDialog').mockResolvedValue(approved)
 const w=mount(Menu)
 try{
  await w.findAll('[data-menu-select]')[1].trigger('click');const menu=s.menus[1]
  await w.get('[data-menu-delete]').trigger('click');await flushPromises()
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({message:expect.stringContaining(menu.name),type:'danger'}))
  expect(s.menus.some(m=>m.id===menu.id)).toBe(!approved)
 }finally{w.unmount()}
})
it('keeps the add action available without an active menu',async()=>{
 const s=createTestStore();s.resetDemoData();s.menus=[];const w=mount(Menu)
 try{
  const header=w.get('[data-menu-header]')
  expect(header.text()).toContain('เมนูและสูตร')
  expect(header.find('[data-menu-edit]').exists()).toBe(false)
  expect(header.find('[data-menu-delete]').exists()).toBe(false)
  await header.get('[data-catalog-add]').trigger('click')
  expect(s.modals.menuEdit).toMatchObject({isOpen:true,menuId:null})
 }finally{w.unmount()}
})
