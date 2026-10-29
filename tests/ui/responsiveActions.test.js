import {it,expect} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CatalogHeader from '../../src/components/catalog/CatalogHeader.vue'
import StockToolbar from '../../src/components/inventory/StockToolbar.vue'

it.each(['menu','addon'])('forwards %s More commands for the selected item and closes the drawer',async entity=>{
 const selected={id:'selected',name:'โยเกิร์ต',recipe:[]}
 const w=mount(CatalogHeader,{props:{entity,selected},attachTo:document.body})
 try{
  await w.get(`[data-${entity}-more]`).trigger('click');await flushPromises()
  const dialog=document.getElementById(`${entity}-header-actions`)
  expect(dialog.textContent).toContain('โยเกิร์ต')
  dialog.querySelector('[data-catalog-more-edit]').click();await flushPromises()
  expect(w.emitted('edit')).toEqual([['selected']])
  expect(w.get(`[data-${entity}-more]`).attributes('aria-expanded')).toBe('false')
 }finally{w.unmount()}
})

it('includes receive, stocktake and filters in stock More without changing commands',async()=>{
 const w=mount(StockToolbar,{props:{role:'all',kind:'all',kinds:[],deletedCount:0},attachTo:document.body})
 try{
  await w.get('[data-stock-more]').trigger('click');await flushPromises()
  document.querySelector('[data-stock-more-receive]').click();await flushPromises()
  expect(w.emitted('receive')).toHaveLength(1)
  await w.get('[data-stock-more]').trigger('click');await flushPromises()
  document.querySelector('[data-stock-more-filter]').click();await flushPromises()
  expect(document.getElementById('stock-filters')).toBeTruthy()
  expect(w.get('[data-stock-more]').attributes('aria-expanded')).toBe('false')
 }finally{w.unmount()}
})
