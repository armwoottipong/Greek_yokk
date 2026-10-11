import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Sidebar from '../../src/components/layout/Sidebar.vue'
import Header from '../../src/components/layout/HeaderBar.vue'
import Button from '../../src/components/ui/Button.vue'
it('uses an accessible rail on iPad without making its closed navigation inert',async()=>{
 vi.stubGlobal('matchMedia',query=>({matches:query.includes('1199'),addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 const store=createTestStore();store.resetDemoData()
 const w=mount(Sidebar)
 try{await flushPromises();expect(w.get('aside').classes()).toContain('is-tablet-rail');expect(w.get('aside').attributes('inert')).toBeUndefined();expect(w.findAll('aside button').some(b=>b.attributes('aria-label')==='จัดการเมนู 4 รายการ')).toBe(true)}finally{w.unmount();vi.unstubAllGlobals()}
})
it('keeps reset behind the more menu and still requires confirmation',async()=>{
 const store=createTestStore();const clear=vi.spyOn(store,'clearAllData')
 const w=mount(Header,{attachTo:document.body})
 try{
  expect(w.findAll('button').some(b=>b.text()==='ล้างข้อมูลทั้งหมด')).toBe(false)
  await w.get('[data-header-more]').trigger('click');await flushPromises()
  const reset=w.findAllComponents(Button).find(b=>b.text()==='ล้างข้อมูลทั้งหมด')
  expect(reset).toBeDefined();await reset.get('button').trigger('click')
  expect(store.modals.confirm.isOpen).toBe(true);expect(clear).not.toHaveBeenCalled()
  store.modals.confirm.onCancel();await flushPromises()
 }finally{w.unmount()}
})
