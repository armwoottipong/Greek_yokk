import {it,expect,afterEach,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Avatars from '../../src/components/layout/UserAvatars.vue'
import AccessPanel from '../../src/cloud/core/CloudAccessPanel.vue'
let wrapper;afterEach(()=>{wrapper?.unmount();document.body.innerHTML=''})
it('shows real avatars, email tooltips on hover/focus and initials after image failure',async()=>{
 wrapper=mount(Avatars,{attachTo:document.body,props:{users:[{uid:'a',email:'owner@example.com',displayName:'Owner',photoURL:'https://lh3.googleusercontent.com/a/photo'},{uid:'b',email:'staff@example.com'}]}})
 await wrapper.findAll('button')[0].trigger('pointerenter');expect(wrapper.findAll('button')[0].classes()).toContain('is-active');expect(document.querySelector('[role=tooltip]').textContent).toBe('owner@example.com')
 await wrapper.findAll('button')[0].trigger('pointerleave');expect(wrapper.findAll('button')[0].classes()).not.toContain('is-active');expect(document.querySelector('[role=tooltip]')).toBeNull()
 await wrapper.findAll('button')[1].trigger('focus');expect(wrapper.findAll('button')[1].classes()).toContain('is-active');expect(document.querySelector('[role=tooltip]').textContent).toBe('staff@example.com')
 await wrapper.findAll('button')[1].trigger('keydown',{key:'Escape'});expect(document.querySelector('[role=tooltip]')).toBeNull()
 await wrapper.get('img').trigger('error');expect(wrapper.find('img').exists()).toBe(false);expect(wrapper.text()).toContain('OW')
})
const addEmail=async email=>{await wrapper.get('input[type="email"]').setValue(email);await wrapper.get('form').trigger('submit')}
const saveButton=()=>wrapper.findAll('button').find(b=>b.text()==='บันทึกรายชื่อ')
it('keeps the current account allowed, validates additions and prevents duplicate saves',async()=>{
 const saveEmails=vi.fn();wrapper=mount(AccessPanel,{props:{account:'owner@example.com',emails:{'owner@example.com':true},saveEmails}})
 expect(wrapper.get('[aria-label="นำ owner@example.com ออก"]').element.disabled).toBe(true)
 await addEmail('invalid');expect(wrapper.get('[role=alert]').text()).toContain('ถูกต้อง');expect(saveEmails).not.toHaveBeenCalled()
 await addEmail('owner@example.com');expect(wrapper.get('[role=alert]').text()).toContain('อยู่ในรายชื่อแล้ว')
 let resolve;saveEmails.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await addEmail('staff@example.com');await saveButton().trigger('click');await saveButton().trigger('click')
 expect(saveEmails).toHaveBeenCalledTimes(1);expect(saveEmails).toHaveBeenCalledWith(['owner@example.com','staff@example.com'],{'owner@example.com':true})
 expect(wrapper.get('input').element.disabled).toBe(true)
 resolve({'owner@example.com':true,'staff@example.com':true});await flushPromises();expect(wrapper.text()).toContain('บันทึกรายชื่อแล้ว')
})
it('retains a draft when another device changes permissions and requires reload before save',async()=>{
 const saveEmails=vi.fn();wrapper=mount(AccessPanel,{props:{account:'owner@example.com',emails:{'owner@example.com':true},saveEmails}})
 await addEmail('draft@example.com');await wrapper.setProps({emails:{'owner@example.com':true,'remote@example.com':true}})
 expect(wrapper.get('ul').text()).toContain('draft@example.com');await saveButton().trigger('click');expect(saveEmails).not.toHaveBeenCalled()
 await wrapper.findAll('button').find(b=>b.text()==='โหลดรายชื่อปัจจุบัน').trigger('click');expect(wrapper.get('ul').text()).toContain('remote@example.com');expect(wrapper.get('ul').text()).not.toContain('draft@example.com')
})
it('stages removals and restores the saved list on cancel without a request',async()=>{
 const saveEmails=vi.fn();wrapper=mount(AccessPanel,{props:{account:'owner@example.com',emails:{'owner@example.com':true,'staff@example.com':true},saveEmails}})
 await wrapper.get('[aria-label="นำ staff@example.com ออก"]').trigger('click');expect(wrapper.get('ul').text()).not.toContain('staff@example.com')
 await wrapper.findAll('button').find(b=>b.text()==='ยกเลิกการแก้ไข').trigger('click');expect(wrapper.get('ul').text()).toContain('staff@example.com');expect(saveEmails).not.toHaveBeenCalled()
})

it('provides a named keyboard focus target for scrolling a full allowlist',async()=>{
 const emails=Object.fromEntries(Array.from({length:50},(_,i)=>[`account${i}@example.com`,true]))
 wrapper=mount(AccessPanel,{attachTo:document.body,props:{emails,account:'account0@example.com',saveEmails:vi.fn()}})
 const list=wrapper.get('[role="region"][aria-label="รายชื่ออีเมลที่อนุญาต"]')
 expect(list.attributes('tabindex')).toBe('0');list.element.focus()
 expect(document.activeElement).toBe(list.element);expect(list.findAll('li')).toHaveLength(50)
})
