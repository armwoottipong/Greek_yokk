import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

it('uses Dashboard segments and keeps bar geometry stable while highlighting and opening its shared tooltip',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu)
 try{
  expect(w.get('.dashboard-segments[aria-label="รูปแบบกราฟ"]').findAll('button')).toHaveLength(3)
  const mark=w.get('[data-platform-chart] [data-chart-segment]'),width=mark.attributes('style')
  await mark.trigger('mouseenter');expect(mark.classes()).toContain('is-active');expect(mark.attributes('style')).toBe(width)
  await mark.trigger('click');await flushPromises()
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('ต้นทุน')
  await mark.trigger('keydown',{key:'Escape'})
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
it.each([['วงกลม','[data-platform-donut] .dashboard-donut-slice'],['เส้น','[data-platform-lines] .dashboard-chart-point']])('uses Dashboard chart marks and tooltip for %s',async(label,selector)=>{
 const s=createTestStore();s.resetDemoData();const before=JSON.stringify(s.menus),w=mount(Menu)
 try{
  await w.get('.dashboard-segments').findAll('button').find(b=>b.text()===label).trigger('click')
  const mark=w.get(selector)
  await mark.trigger('focus');expect(mark.classes()).toContain('is-active')
  await mark.trigger('keydown',{key:'Enter'});await flushPromises()
  expect(document.querySelector('[role="tooltip"]')).not.toBeNull()
  expect(JSON.stringify(s.menus)).toBe(before)
  document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}));await flushPromises()
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
