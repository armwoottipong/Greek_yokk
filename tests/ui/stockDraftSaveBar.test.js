import {it,expect,afterEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import Review from '../../src/components/inventory/StockDraftReview.vue'
let w;afterEach(()=>w?.unmount())
const items=[{id:'count-M',materialId:'M',name:'Milk',title:'ตรวจนับ',description:'แก้ยอด',delta:-25,unit:'g'}]
it('keeps save-all outside the detail popup and saves only on explicit action',async()=>{
 w=mount(Review,{attachTo:document.body,props:{hasDrafts:true,open:true,items,snapshot:[{id:'M',stock:100}],materials:[{id:'M',stock:75}]}})
 await flushPromises()
 const save=w.get('[data-save-stock-drafts]')
 expect(save.element.closest('#stock-draft-review')).toBeNull()
 expect(w.get('[data-discard-stock-drafts]').element.closest('#stock-draft-review')).toBeNull()
 expect(w.findAll('.draft-bar-actions button').map(b=>b.text())).toEqual(['รายละเอียด','ยกเลิกทั้งหมด','บันทึกทั้งหมด'])
 expect(document.querySelector('#stock-draft-review [data-save-stock-drafts]')).toBeNull()
 expect(document.getElementById('stock-draft-review').textContent).toContain('100 → 75 g')
 expect(w.emitted('commit')).toBeUndefined()
 await w.setProps({open:false});await save.trigger('click');expect(w.emitted('commit')).toHaveLength(1)
 await w.setProps({busy:true,saving:true});await save.trigger('click')
 expect(save.attributes('aria-busy')).toBe('true');expect(w.emitted('commit')).toHaveLength(1)
})
