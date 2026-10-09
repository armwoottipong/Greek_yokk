import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { reactive, nextTick } from 'vue'
const state=vi.hoisted(() => ({store:null}))
vi.mock('@/stores/posStore',()=>({usePosStore:()=>state.store,formatDisplayDate:x=>x}))
import Confirm from '../../src/components/modals/ConfirmModal.vue'

afterEach(()=>{document.body.innerHTML=''})
describe('safe dialog controls',()=>{
 it('Enter on Cancel does not trigger confirmation',async()=>{
  const cancel=vi.fn(), confirm=vi.fn()
  state.store=reactive({modals:{confirm:{isOpen:true,onCancel:cancel,onConfirm:confirm}}})
  const wrapper=mount(Confirm,{attachTo:document.body})
  const buttons=wrapper.findAll('button')
  buttons[0].element.focus()
  await buttons[0].trigger('keydown',{key:'Enter'})
  expect(confirm).not.toHaveBeenCalled()
  await buttons[0].trigger('click')
  expect(cancel).toHaveBeenCalledOnce()
  wrapper.unmount()
 })
 it('traps focus restores opener and emits Escape close',async()=>{
  const { default: ModalShell } = await import(/* @vite-ignore */ '../../src/components/ui/' + 'ModalShell.vue')
  const opener=document.createElement('button');document.body.append(opener);opener.focus()
  const wrapper=mount(ModalShell,{props:{open:true,labelledBy:'title'},slots:{default:'<h2 id="title">Title</h2><button>First</button><button>Last</button>'},attachTo:document.body})
  await nextTick();await nextTick()
  const buttons=wrapper.findAll('button');buttons[1].element.focus()
  await buttons[1].trigger('keydown',{key:'Tab'})
  expect(document.activeElement).toBe(buttons[0].element)
  await buttons[0].trigger('keydown',{key:'Escape'})
  expect(wrapper.emitted('request-close')).toHaveLength(1)
  await wrapper.setProps({open:false})
  expect(document.activeElement).toBe(opener)
  wrapper.unmount()
 })
})


it('makes the underlying dialog inert and restores its focus after nested close',async()=>{
 const {default:ModalShell}=await import('../../src/components/ui/ModalShell.vue')
 const outer=mount(ModalShell,{props:{open:true,label:'Outer'},slots:{default:'<button>Open inner</button>'},attachTo:document.body})
 await nextTick();await nextTick()
 const inner=mount(ModalShell,{props:{open:true,label:'Inner'},slots:{default:'<button>Cancel</button>'},attachTo:document.body})
 await nextTick();await nextTick()
 expect(outer.attributes('inert')).toBe('')
 expect(inner.attributes('inert')).toBeUndefined()
 await inner.setProps({open:false})
 expect(outer.attributes('inert')).toBeUndefined()
 expect(document.activeElement).toBe(outer.find('button').element)
 inner.unmount();outer.unmount()
})
