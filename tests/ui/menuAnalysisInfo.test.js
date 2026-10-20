import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import Details from '../../src/components/catalog/MenuRecipeDetails.vue'

const props={menu:{id:'M1',name:'Bowl',prices:{P1:100},recipe:[]},platforms:[{id:'P1',name:'หน้าร้าน',gpPercent:0}],foodCost:20}
it('keeps calculation notes behind the header info and dismisses them with Escape or outside input',async()=>{
 const w=mount(Details,{props,attachTo:document.body})
 try{
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
it('opens notes on hover and closes them when leaving or selecting another menu',async()=>{
 const w=mount(Details,{props})
 try{
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
