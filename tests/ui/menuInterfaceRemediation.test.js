import {it,expect} from 'vitest'
import {mount} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'

it.each([null,undefined,'',NaN,Infinity,-1])('shows unknown recipe cost instead of zero for invalid unit cost %s',unitCost=>{
 const s=createTestStore();s.resetDemoData();s.materials.push(material('AUDIT',100,{unitCost}));s.menus[0].recipe=[{materialId:'AUDIT',qty:10}]
 const w=mount(Menu)
 try{expect(w.get('[data-menu-recipe-panel] .recipe-item').text()).toContain('ยังไม่ทราบต้นทุน');expect(w.get('[data-menu-recipe-panel] .recipe-item b').text()).not.toContain('฿0.00')}finally{w.unmount()}
})
it.each([[0,'฿0.00'],[2,'฿20.00']])('preserves known recipe cost for unit price %s',(unitCost,want)=>{
 const s=createTestStore();s.resetDemoData();s.materials.push(material('AUDIT',100,{unitCost}));s.menus[0].recipe=[{materialId:'AUDIT',qty:10}]
 const w=mount(Menu)
 try{expect(w.get('[data-menu-recipe-panel] .recipe-item b').text()).toBe(want)}finally{w.unmount()}
})
it('does not invent a zero cost for a missing material or an unspecified recipe quantity',()=>{
 const s=createTestStore();s.resetDemoData();s.menus[0].recipe=[{materialId:'MISSING',qty:10},{materialId:s.materials[0].id,qty:0}]
 const w=mount(Menu)
 try{expect(w.findAll('[data-menu-recipe-panel] .recipe-item b').every(b=>b.text()==='ยังไม่ทราบต้นทุน')).toBe(true)}finally{w.unmount()}
})
