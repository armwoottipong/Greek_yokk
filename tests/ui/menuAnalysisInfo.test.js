import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Details from '../../src/components/catalog/MenuRecipeDetails.vue'
import AnalysisInfo from '../../src/components/catalog/AnalysisInfo.vue'

const props={menu:{id:'M1',name:'Bowl',prices:{P1:100},recipe:[]},platforms:[{id:'P1',name:'หน้าร้าน',gpPercent:0}],foodCost:20}
it('keeps calculation notes behind the header info and dismisses them with Escape or outside input',async()=>{
 const w=mount(Details,{props,attachTo:document.body,global:{stubs:{teleport:true}}})
 try{
  await w.get('[data-catalog-analysis="menu"]').trigger('click');await flushPromises()
  const button=w.get('[data-menu-analysis-info]')
  expect(w.find('[role="tooltip"]').exists()).toBe(false)
  expect(w.text()).not.toContain('ยังไม่หักค่าเช่า')
  expect(w.text()).not.toContain('คำนวณทุกช่องทางจากราคาขาย')
  await button.trigger('click')
  const tooltip=w.get('[role="tooltip"]')
  expect(button.attributes('aria-describedby')).toBe(tooltip.attributes('id'))
  expect(tooltip.text()).toContain('สัดส่วนใต้ตัวเลขเทียบกับราคาขาย')
  expect(tooltip.text()).toContain('ยังไม่หักค่าเช่า ค่าแรง และค่าใช้จ่ายอื่น')
  expect(tooltip.text()).toContain('คำนวณทุกช่องทางจากราคาขาย หัก GP และต้นทุนสูตรเดียวกัน')
  await button.trigger('keydown',{key:'Escape'})
  expect(w.find('[role="tooltip"]').exists()).toBe(false)
  await button.trigger('focus')
  expect(w.find('[role="tooltip"]').exists()).toBe(true)
  document.body.dispatchEvent(new Event('pointerdown',{bubbles:true}))
  await w.vm.$nextTick()
  expect(w.find('[role="tooltip"]').exists()).toBe(false)
 }finally{w.unmount()}
})

it('keeps the calculation tooltip on screen with an arrow pointing to its trigger',async()=>{
 vi.stubGlobal('innerWidth',360);vi.stubGlobal('innerHeight',320)
 let triggerTop=260
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){
  return this.classList.contains('menu-analysis-info-trigger')
   ? {top:triggerTop,bottom:triggerTop+44,left:290,right:334,width:44,height:44}
   : {top:0,bottom:120,left:0,right:320,width:320,height:120}
 })
 const w=mount(AnalysisInfo,{slots:{default:'วิธีคำนวณ'},attachTo:document.body})
 try{
  await w.get('button').trigger('click');await flushPromises()
  expect(w.get('[role="tooltip"]').element.style.top).toBe('130px')
  expect(w.get('.menu-analysis-info-arrow').classes()).toContain('is-above')
  expect(w.get('.menu-analysis-info-arrow').element.style.visibility).toBe('visible')
  triggerTop=10;window.dispatchEvent(new Event('resize'));await flushPromises()
  expect(w.get('[role="tooltip"]').element.style.top).toBe('64px')
  expect(w.get('.menu-analysis-info-arrow').classes()).not.toContain('is-above')
 }finally{w.unmount();vi.restoreAllMocks();vi.unstubAllGlobals()}
})
it('opens notes on hover and closes them when leaving or selecting another menu',async()=>{
 const w=mount(Details,{props,global:{stubs:{teleport:true}}})
 try{
  await w.get('[data-catalog-analysis="menu"]').trigger('click');await flushPromises()
  const info=w.get('.menu-analysis-info')
  await info.trigger('mouseenter')
  expect(w.find('[role="tooltip"]').exists()).toBe(true)
  await info.trigger('mouseleave')
  expect(w.find('[role="tooltip"]').exists()).toBe(false)
  await w.get('[data-menu-analysis-info]').trigger('click')
  await w.setProps({menu:{...props.menu,id:'M2'}})
  expect(w.find('[role="tooltip"]').exists()).toBe(false)
 }finally{w.unmount()}
})
