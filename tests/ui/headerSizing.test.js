import {it,expect,vi} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import HeaderBar from '../../src/components/layout/HeaderBar.vue'

it('keeps sidebar image height in sync when the panel header grows and shrinks',()=>{
 let resize, measuredHeight=104
 const disconnect=vi.fn()
 vi.stubGlobal('ResizeObserver',class { constructor(callback){resize=callback} observe(){} disconnect(){disconnect()} })
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(()=>({height:measuredHeight}))
 createTestStore()
 const wrapper=mount(HeaderBar)
 try {
  expect(document.documentElement.style.getPropertyValue('--sidebar-header-height')).toBe('104px')
  measuredHeight=80;resize()
  expect(document.documentElement.style.getPropertyValue('--sidebar-header-height')).toBe('80px')
 } finally {
  wrapper.unmount()
  expect(disconnect).toHaveBeenCalled()
  vi.restoreAllMocks();vi.unstubAllGlobals()
 }
 expect(document.documentElement.style.getPropertyValue('--sidebar-header-height')).toBe('')
})
