import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Settings from '../../src/views/SettingsView.vue'
it('starts with backup controls and shows only the chosen settings group',async()=>{
 createTestStore()
 const wrapper=mount(Settings,{attachTo:document.body})
 expect(wrapper.get('[data-settings="backup"]').isVisible()).toBe(true)
 expect(wrapper.get('[data-settings="categories"]').isVisible()).toBe(false)
 await wrapper.get('button[aria-controls="settings-categories"]').trigger('click')
 expect(wrapper.get('[data-settings="categories"]').isVisible()).toBe(true)
 expect(wrapper.get('[data-settings="backup"]').isVisible()).toBe(false)
 await wrapper.get('button[aria-controls="settings-sheets"]').trigger('click')
 expect(wrapper.get('[data-settings="sheets"]').isVisible()).toBe(true)
 expect(wrapper.get('[data-settings="categories"]').isVisible()).toBe(false)
 expect(wrapper.text()).toContain('ข้อมูลหลักเก็บในเครื่องนี้')
 wrapper.unmount()
})
