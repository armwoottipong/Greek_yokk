import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CatalogOrderDialog from '../../src/components/catalog/CatalogOrderDialog.vue'
const items=[{id:'A',name:'เมนู A'},{id:'B',name:'เมนู B'},{id:'C',name:'เมนู C'}]
it('reorders with pointer dragging and stops dragging after release',async()=>{
 vi.stubGlobal('requestAnimationFrame',()=>1);vi.stubGlobal('cancelAnimationFrame',()=>{})
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(){
  if(this.classList.contains('order-list'))return {top:0,left:0,right:400,bottom:204,height:204,width:400}
  const index=[...(this.parentElement?.children||[])].indexOf(this)
  return {top:index*68,left:0,right:400,bottom:(index+1)*68,height:68,width:400}
 })
 const w=mount(CatalogOrderDialog,{props:{open:true,title:'จัดลำดับเมนู',items},global:{stubs:{teleport:true}}})
 try{
  await w.get('[data-order-handle="A"]').trigger('pointerdown',{button:0,clientX:30,clientY:30})
  window.dispatchEvent(new MouseEvent('pointermove',{clientX:30,clientY:100}));await flushPromises()
  expect(w.findAll('[data-order-item]').map(row=>row.attributes('data-order-item'))).toEqual(['B','A','C'])
  window.dispatchEvent(new MouseEvent('pointerup'));await flushPromises()
  expect(w.find('.is-moving').exists()).toBe(false)
  expect(w.emitted('save')).toBeUndefined()
 }finally{w.unmount();vi.restoreAllMocks();vi.unstubAllGlobals()}
})
it('supports keyboard ordering and submits only the explicit reordered IDs',async()=>{
 const w=mount(CatalogOrderDialog,{props:{open:true,title:'จัดลำดับเมนู',items,revision:'1'},global:{stubs:{teleport:true}}})
 try{
  await w.get('[data-order-handle="A"]').trigger('keydown',{key:'ArrowDown'})
  expect(w.findAll('[data-order-item]').map(row=>row.attributes('data-order-item'))).toEqual(['B','A','C'])
  expect(items.map(row=>row.id)).toEqual(['A','B','C'])
  await w.get('[data-order-save]').trigger('click')
  expect(w.emitted('save')[0]).toEqual([['B','A','C']])
 }finally{w.unmount()}
})
it('keeps a dirty draft from overwriting a changed source and can restart from the latest items',async()=>{
 const w=mount(CatalogOrderDialog,{props:{open:true,title:'จัดลำดับเมนู',items,revision:'1'},global:{stubs:{teleport:true}}})
 try{
  await w.get('[data-order-handle="A"]').trigger('keydown',{key:'ArrowDown'})
  await w.setProps({revision:'2',items:[items[2],items[1],items[0]]});await flushPromises()
  expect(w.get('[data-order-save]').attributes('disabled')).toBeDefined()
  await w.get('[data-order-restart]').trigger('click')
  expect(w.findAll('[data-order-item]').map(row=>row.attributes('data-order-item'))).toEqual(['C','B','A'])
  await w.get('[data-order-cancel]').trigger('click')
  expect(w.emitted('request-close')).toHaveLength(1);expect(w.emitted('save')).toBeUndefined()
 }finally{w.unmount()}
})
