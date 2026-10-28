import {it,expect,afterEach,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Avatars from '../../src/components/layout/UserAvatars.vue'
import AccessPanel from '../../src/cloud/core/CloudAccessPanel.vue'
let wrapper;afterEach(()=>{wrapper?.unmount();document.body.innerHTML=''})
it('shows real avatars, email tooltips on hover/focus and initials after image failure',async()=>{
 wrapper=mount(Avatars,{attachTo:document.body,props:{users:[{uid:'a',email:'owner@example.com',displayName:'Owner',photoURL:'https://lh3.googleusercontent.com/a/photo'},{uid:'b',email:'staff@example.com'}]}})
 await wrapper.findAll('button')[0].trigger('pointerenter');expect(document.querySelector('[role=tooltip]').textContent).toBe('owner@example.com')
 await wrapper.findAll('button')[0].trigger('pointerleave');expect(document.querySelector('[role=tooltip]')).toBeNull()
 await wrapper.findAll('button')[1].trigger('focus');expect(document.querySelector('[role=tooltip]').textContent).toBe('staff@example.com')
 await wrapper.findAll('button')[1].trigger('keydown',{key:'Escape'});expect(document.querySelector('[role=tooltip]')).toBeNull()
 await wrapper.get('img').trigger('error');expect(wrapper.find('img').exists()).toBe(false);expect(wrapper.text()).toContain('OW')
})
it('keeps the current account allowed and prevents duplicate saves while awaiting the server',async()=>{
 const saveEmails=vi.fn();wrapper=mount(AccessPanel,{props:{account:'owner@example.com',emails:{'owner@example.com':true},saveEmails}})
 await wrapper.get('textarea').setValue('staff@example.com');await wrapper.get('form').trigger('submit');expect(saveEmails).not.toHaveBeenCalled();expect(wrapper.get('[role=alert]').text()).toContain('กำลังใช้อยู่')
 let resolve;saveEmails.mockImplementation(()=>new Promise(r=>{resolve=r}))
 await wrapper.get('textarea').setValue('owner@example.com\nstaff@example.com');await wrapper.get('form').trigger('submit');await wrapper.get('form').trigger('submit')
 expect(saveEmails).toHaveBeenCalledTimes(1);expect(wrapper.get('textarea').element.disabled).toBe(true)
 resolve({'owner@example.com':true,'staff@example.com':true});await flushPromises();expect(wrapper.text()).toContain('บันทึกรายชื่อแล้ว')
})
it('retains a draft when another device changes permissions and requires reload before save',async()=>{
 const saveEmails=vi.fn();wrapper=mount(AccessPanel,{props:{account:'owner@example.com',emails:{'owner@example.com':true},saveEmails}})
 await wrapper.get('textarea').setValue('owner@example.com\ndraft@example.com')
 await wrapper.setProps({emails:{'owner@example.com':true,'remote@example.com':true}})
 expect(wrapper.get('textarea').element.value).toContain('draft@example.com');await wrapper.get('form').trigger('submit');expect(saveEmails).not.toHaveBeenCalled()
 await wrapper.findAll('button').find(b=>b.text()==='โหลดรายชื่อปัจจุบัน').trigger('click');expect(wrapper.get('textarea').element.value).toContain('remote@example.com')
})

it('provides a named keyboard focus target for scrolling a full allowlist',async()=>{
 const emails=Object.fromEntries(Array.from({length:50},(_,i)=>[`account${i}@example.com`,true]))
 wrapper=mount(AccessPanel,{attachTo:document.body,props:{emails,account:'account0@example.com',saveEmails:vi.fn()}})
 const list=wrapper.get('[role="region"][aria-label="รายชื่ออีเมลที่บันทึกแล้ว"]')
 expect(list.attributes('tabindex')).toBe('0');list.element.focus()
 expect(document.activeElement).toBe(list.element);expect(list.findAll('li')).toHaveLength(50)
})
