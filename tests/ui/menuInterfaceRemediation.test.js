import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Menu from '../../src/views/MenuView.vue'
import Editor from '../../src/components/modals/MenuEditModal.vue'

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

it('selects a saved new menu and clears a search that would hide it',async()=>{
 const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 const w=mount(Menu,{attachTo:document.body}),e=mount(Editor,{attachTo:document.body})
 try{
  await w.get('[aria-label="ค้นหาเมนู"]').setValue(s.menus[0].name)
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  await e.get('#menu-name').setValue('Created bowl');await e.vm.submit();await flushPromises()
  const saved=s.menus.find(m=>m.name==='Created bowl')
  expect(saved).toBeTruthy();expect(w.get('[data-selected-menu-name]').text()).toBe('Created bowl')
  expect(w.get(`[data-menu-select="${saved.id}"]`).attributes('aria-pressed')).toBe('true')
  expect(w.get('[aria-label="ค้นหาเมนู"]').element.value).toBe('')
  expect(w.classes()).toContain('is-mobile-detail')
 }finally{w.unmount();e.unmount()}
})
it.each(['cancel','failed save'])('retains selection and search after %s of a new menu',async action=>{
 const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 if(action==='failed save')vi.spyOn(s,'saveMenu').mockReturnValue({ok:false})
 const original=s.menus[0].name,w=mount(Menu),e=mount(Editor)
 try{
  await w.get('[aria-label="ค้นหาเมนู"]').setValue(original)
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  if(action==='cancel')e.vm.close()
  else{await e.get('#menu-name').setValue('Failed bowl');await e.vm.submit()}
  await flushPromises()
  expect(w.get('[data-selected-menu-name]').text()).toBe(original)
  expect(w.get('[aria-label="ค้นหาเมนู"]').element.value).toBe(original)
  expect(s.menus.some(m=>m.name==='Failed bowl')).toBe(false)
 }finally{w.unmount();e.unmount()}
})
it('does not select an unrelated new menu when the add dialog is canceled',async()=>{
 const s=createTestStore();s.resetDemoData();const original=s.menus[0].name,w=mount(Menu),e=mount(Editor)
 try{
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  s.menus.push({...s.menus[0],id:'REMOTE-MENU',name:'Unrelated synced bowl'})
  e.vm.close();await flushPromises()
  expect(w.get('[data-selected-menu-name]').text()).toBe(original)
 }finally{w.unmount();e.unmount()}
})
it('keeps the current search and selection after editing an existing menu',async()=>{
 const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 const original=s.menus[0].name,w=mount(Menu),e=mount(Editor)
 try{
  await w.get('[aria-label="ค้นหาเมนู"]').setValue(original)
  await w.get('[data-menu-edit]').trigger('click');await flushPromises()
  await e.get('#menu-description').setValue('Updated description');await e.vm.submit();await flushPromises()
  expect(w.get('[data-selected-menu-name]').text()).toBe(original)
  expect(w.get('[aria-label="ค้นหาเมนู"]').element.value).toBe(original)
 }finally{w.unmount();e.unmount()}
})

it.each([false,true])('opens recipe editing at its first usable control (empty=%s)',async empty=>{
 const s=createTestStore();s.resetDemoData();if(empty)s.menus[0].recipe=[]
 const w=mount(Menu,{attachTo:document.body}),e=mount(Editor,{attachTo:document.body})
 try{
  await w.get('[data-menu-recipe-panel] button').trigger('click');await flushPromises()
  expect(s.modals.menuEdit).toMatchObject({isOpen:true,menuId:s.menus[0].id,initialSection:'recipe'})
  expect(e.get('[data-menu-recipe]').attributes('open')).toBeDefined()
  expect(document.activeElement).toBe(e.get('[data-menu-recipe] button').element)
  expect(e.get('#menu-name').element.value).toBe(s.menus[0].name)
 }finally{w.unmount();e.unmount()}
})
it('keeps identity entry and name validation in the original popup',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Menu,{attachTo:document.body}),e=mount(Editor,{attachTo:document.body})
 try{
  await w.get('[data-menu-edit]').trigger('click');await flushPromises()
  expect(document.activeElement).toBe(e.get('#menu-name').element)
  await e.get('#menu-name').setValue('');await e.vm.submit();await flushPromises()
  expect(document.activeElement).toBe(e.get('#menu-name').element)
  expect(e.get('#menu-name').attributes('aria-invalid')).toBe('true')
  const description=e.get('#menu-description')
  expect(e.get('label[for="menu-description"]').text()).toBe('คำอธิบายสั้น')
  expect(description.attributes('aria-label')).toBeUndefined()
 }finally{w.unmount();e.unmount()}
})

it.each([['',10],[1,0]])('does not publish profit when a recipe row is indeterminate (%s, %s)',(unitCost,qty)=>{
 const s=createTestStore();s.resetDemoData();s.materials.push(material('AUDIT',100,{unitCost}));s.menus[0].recipe=[{materialId:'AUDIT',qty}]
 const w=mount(Menu)
 try{
  expect(w.get('[data-menu-recipe-panel] .recipe-item b').text()).toContain('ยังไม่ทราบต้นทุน')
  expect(w.get('[data-menu-financial=cost]').text()).toContain('ยังคำนวณไม่ได้')
  expect(w.get('[data-menu-financial=profit]').text()).toContain('ยังคำนวณไม่ได้')
  expect(w.find('[data-platform-chart]').exists()).toBe(false)
 }finally{w.unmount()}
})
it('keeps financial analysis available when only excluded packaging has an unknown cost',()=>{
 const s=createTestStore();s.resetDemoData();s.materials.push(material('BAD-PACK',100,{inventoryType:'packaging',unitCost:null}))
 s.menus[0].hasPackage=false;s.menus[0].recipe.push({materialId:'BAD-PACK',qty:1})
 const w=mount(Menu)
 try{expect(w.get('[data-menu-financial=profit]').text()).toContain('฿');expect(w.find('[data-platform-chart]').exists()).toBe(true)}finally{w.unmount()}
})
