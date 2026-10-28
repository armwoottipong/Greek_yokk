import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Settings from '../../src/views/SettingsView.vue'
it('starts with backup controls and shows only the chosen settings group',async()=>{
 createTestStore()
 const wrapper=mount(Settings,{attachTo:document.body})
 expect(wrapper.get('[data-settings="backup"]').isVisible()).toBe(true)
 expect(wrapper.find('[data-settings="categories"]').exists()).toBe(false)
 await wrapper.get('button[aria-controls="settings-sheets"]').trigger('click')
 expect(wrapper.get('[data-settings="sheets"]').isVisible()).toBe(true)
 expect(wrapper.get('[data-settings="backup"]').isVisible()).toBe(false)
 expect(wrapper.text()).toContain('ข้อมูลหลักเก็บในเครื่องนี้')
 wrapper.unmount()
})

it('opens cloud users first, keeps access drafts across navigation and exposes server status',async()=>{
 const {reactive}=await import('vue')
 const model=reactive({cloud:true,connected:true,account:'owner@example.com',allowedEmails:{'owner@example.com':true},saveAllowedEmails:async()=>({}),platforms:[],materials:[],menus:[],addons:[],orders:[]})
 const cloud=mount(Settings,{props:{model},attachTo:document.body})
 expect(cloud.get('#settings-access').isVisible()).toBe(true)
 expect(cloud.get('[aria-controls="settings-access"]').attributes('aria-current')).toBe('page')
 await cloud.get('input[type="email"]').setValue('staff@example.com');await cloud.get('#settings-access form').trigger('submit')
 await cloud.get('[aria-controls="settings-firebase"]').trigger('click')
 expect(cloud.get('#settings-access').isVisible()).toBe(false)
 await cloud.get('[aria-controls="settings-access"]').trigger('click')
 expect(cloud.get('#settings-access ul').text()).toContain('staff@example.com')
 model.connected=false
 await cloud.vm.$nextTick()
 expect(cloud.get('.settings-shop-status').text()).toContain('พักการบันทึก')
 await cloud.get('#settings-category').setValue('backup')
 expect(cloud.get('#settings-backup').isVisible()).toBe(true)
 cloud.unmount()
})
