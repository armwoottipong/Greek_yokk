import {afterEach,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Sidebar from '../../src/components/layout/Sidebar.vue'
import UserPresencePanel from '../../src/components/layout/UserPresencePanel.vue'

let wrapper
afterEach(()=>{wrapper?.unmount();document.body.innerHTML='';vi.unstubAllGlobals()})
const users=[
 {uid:'a',email:'owner@example.com',displayName:'Owner',role:'admin',photoURL:'https://lh3.googleusercontent.com/a/photo'},
 {uid:'b',email:'manager@example.com',role:'manager'},
 {uid:'c',email:'viewer@example.com',role:'viewer'}
]
const model=()=>({role:'viewer',connected:true,account:'owner@example.com',activeUsers:users,currentTab:'dashboard',totalInventoryValuation:400,draftInventoryValuationDiff:0,switchTab:vi.fn()})

it('opens the phone roster above navigation, traps focus, closes with Escape and restores the opener',async()=>{
 vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 document.body.innerHTML='<div id="app"></div>'
 wrapper=mount(Sidebar,{attachTo:document.getElementById('app'),global:{stubs:{transition:false}},props:{mobileOpen:true,model:model(),items:[{id:'dashboard',label:'Dashboard'}]}})
 await flushPromises()
 expect(wrapper.find('.sidebar-valuation').exists()).toBe(false)
 expect(wrapper.get('.sidebar-footer').classes()).not.toContain('hidden')
 const opener=wrapper.get('.presence-trigger');opener.element.focus();await opener.trigger('click');await flushPromises()
 const drawer=document.querySelector('.dialog-frame-shell')
 expect(drawer.getAttribute('aria-modal')).toBe('true')
 expect(drawer.textContent).toContain('ผู้ใช้งาน Yoggie')
 for(const role of ['ผู้ดูแลระบบ','ผู้จัดการ','ดู Dashboard'])expect(drawer.textContent).toContain(role)
 expect(drawer.textContent).toContain('owner@example.com')
 expect(drawer.contains(document.activeElement)).toBe(true)
 expect(document.body.style.overflow).toBe('hidden')
 const close=drawer.querySelector('button')
 close.focus();close.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(drawer.querySelector('[role="region"]'))
 document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}))
 expect(document.activeElement).toBe(close)
 close.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}))
 await flushPromises()
 expect(wrapper.emitted('close')).toBeUndefined()
 await vi.waitFor(()=>expect(document.activeElement).toBe(opener.element))
 expect(opener.attributes('aria-expanded')).toBe('false')
 // The enclosing navigation remains open and keeps the page scroll locked.
 expect(document.body.style.overflow).toBe('hidden')
 await wrapper.setProps({mobileOpen:false});await flushPromises()
 expect(wrapper.get('aside').attributes('inert')).toBeDefined()
 expect(document.body.style.overflow).not.toBe('hidden')
})

it('preserves desktop avatar hover and reports empty or disconnected presence honestly',async()=>{
 wrapper=mount(UserPresencePanel,{attachTo:document.body,props:{users,connected:true}})
 expect(wrapper.find('.presence-trigger').exists()).toBe(false)
 await wrapper.get('.user-avatar').trigger('pointerenter')
 expect(document.querySelector('[role="tooltip"]').textContent).toBe('owner@example.com')
 await wrapper.setProps({users:[],connected:false})
 expect(wrapper.text()).toContain('ขาดการเชื่อมต่อ')
 expect(wrapper.text()).toContain('ยังไม่มีผู้ใช้งานออนไลน์')
})

it('provides a named tablet rail trigger and falls back to initials after photo failure',async()=>{
 wrapper=mount(UserPresencePanel,{attachTo:document.body,props:{users,connected:true,compact:true,rail:true}})
 expect(wrapper.get('.presence-trigger').attributes('aria-label')).toContain('3 คน')
 await wrapper.get('button').trigger('click');await flushPromises()
 const photo=document.querySelector('.presence-person img')
 photo.dispatchEvent(new Event('error'));await flushPromises()
 expect(document.querySelector('.presence-initials').textContent).toBe('OW')
 expect(document.querySelectorAll('.presence-person')).toHaveLength(3)
})
