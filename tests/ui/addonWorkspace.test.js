import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {createTestStore,material} from '../helpers/createStore'
import Addon from '../../src/components/catalog/OptionCatalog.vue'
import Editor from '../../src/components/modals/AddonEditModal.vue'

const showAnalysis=async ()=>{document.querySelector('[data-catalog-analysis="addon"]').click();await flushPromises()}

it('uses an active header, selectable list, all-platform analysis and recipe without a details popup',async()=>{
 const s=createTestStore();s.resetDemoData();const original=s.currentPlatformId,w=mount(Addon,{attachTo:document.body})
 try{
  await showAnalysis()
  expect(w.get('[data-addon-header] [data-selected-addon-name]').text()).toBe(s.addons[0].name)
  expect(w.findAll('[data-addon-select]')).toHaveLength(s.addons.length)
  expect(document.querySelectorAll('[data-menu-platform]')).toHaveLength(s.platforms.length)
  expect(w.find('[aria-label="ช่องทางที่แสดงราคา"]').exists()).toBe(false)
  expect(document.querySelector('[role=dialog]')).not.toBeNull()
  await w.findAll('[data-addon-select]')[1].trigger('click')
  expect(w.get('[data-selected-addon-name]').text()).toBe(s.addons[1].name)
  expect(w.find('[data-addon-recipe-panel]').exists()).toBe(true)
  await w.get('[data-addon-edit]').trigger('click')
  expect(s.modals.addonEdit).toMatchObject({isOpen:true,addonId:s.addons[1].id})
  expect(s.currentPlatformId).toBe(original)
 }finally{w.unmount()}
})
it.each([undefined,null,'',' ',0,'0',-1,'invalid'])('hides unpriced addon platforms in every chart mode (price=%s)',async price=>{
 const s=createTestStore();s.resetDemoData();s.addons[0].prices={PLAT01:price,PLAT02:20}
 const w=mount(Addon,{attachTo:document.body})
 try{
  await showAnalysis()
  for(const label of ['แท่ง','วงกลม','เส้น']){
   [...document.querySelectorAll('[role="dialog"] button')].find(b=>b.textContent===label).click();await flushPromises()
   expect(document.querySelector('[data-menu-platform=PLAT01]')).toBeNull()
   expect(document.querySelectorAll('[data-menu-platform]')).toHaveLength(1)
   expect(document.querySelector('[data-menu-platform=PLAT02] [data-menu-financial=price]').textContent).toContain('฿20.00')
   expect(w.get('[data-addon-header]').text()).toContain('1 ช่องทางที่ตั้งราคา')
   if(label==='เส้น')expect(document.querySelector('.line-platform-key').textContent).not.toContain(s.platforms.find(p=>p.id==='PLAT01').name)
   expect(document.querySelector('[role="dialog"]').textContent).not.toMatch(/NaN|Infinity/)
  }
 }finally{w.unmount()}
})
it('shows the price-setting empty state when an addon has no positive platform prices',async()=>{
 const s=createTestStore();s.resetDemoData();s.addons[0].prices={PLAT01:0,PLAT02:''}
 const w=mount(Addon,{attachTo:document.body})
 try{
  await showAnalysis()
  expect(document.querySelectorAll('[data-menu-platform]')).toHaveLength(0)
  expect(document.querySelector('[aria-label="รูปแบบกราฟ"]')).toBeNull()
  expect(document.querySelector('.overview-legend')).toBeNull()
  expect(document.querySelector('.overview-empty').textContent).toContain('แก้ไขตัวเลือกเสริม')
  expect(w.get('[data-addon-header]').text()).toContain('0 ช่องทางที่ตั้งราคา')
 }finally{w.unmount()}
})
it('does not invent zero material cost in the recipe or analysis',async()=>{
 const s=createTestStore();s.resetDemoData();s.materials.push(material('UNKNOWN',100,{unitCost:null}));s.addons[0].recipe=[{materialId:'UNKNOWN',qty:10}]
 const w=mount(Addon,{attachTo:document.body})
 try{await showAnalysis();expect(w.get('[data-addon-recipe-panel]').text()).toContain('ยังไม่ทราบต้นทุน');expect(document.querySelector('[data-menu-financial=cost]').textContent).toContain('ยังคำนวณไม่ได้')}finally{w.unmount()}
})
it('exposes direct trash deletion with exact confirmation',async()=>{
 const s=createTestStore();s.resetDemoData();const confirm=vi.spyOn(s,'confirmDialog').mockResolvedValue(false),w=mount(Addon)
 try{
  expect(w.get('[data-addon-header] button[data-addon-delete]').attributes('aria-label')).toBe('ลบตัวเลือกเสริม')
  expect(w.get('[data-addon-more]').attributes('aria-haspopup')).toBe('dialog')
  await w.get('[data-addon-delete]').trigger('click');await flushPromises()
  expect(confirm).toHaveBeenCalledWith(expect.objectContaining({message:expect.stringContaining(s.addons[0].id),type:'danger'}))
  expect(s.addons).toHaveLength(6)
 }finally{w.unmount()}
})
it('selects the successfully created addon while preserving the original editor',async()=>{
 const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 const w=mount(Addon),e=mount(Editor)
 try{
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  await e.get('#addon-name').setValue('New topping');await e.vm.submit();await flushPromises()
  expect(w.get('[data-selected-addon-name]').text()).toBe('New topping')
  expect(s.modals.addonEdit.isOpen).toBe(false)
 }finally{w.unmount();e.unmount()}
})

it('opens recipe editing at the recipe in the original popup',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Addon,{attachTo:document.body}),e=mount(Editor,{attachTo:document.body})
 try{
  await w.get('[data-addon-recipe-panel] button').trigger('click');await flushPromises()
  expect(s.modals.addonEdit.initialSection).toBe('recipe')
  expect(document.activeElement).toBe(e.get('[data-addon-recipe] button').element)
 }finally{w.unmount();e.unmount()}
})
it.each(['cancel','failure'])('does not change the active addon after new-item %s',async result=>{
 const s=createTestStore();s.resetDemoData();vi.spyOn(s,'confirmDialog').mockResolvedValue(true)
 if(result==='failure')vi.spyOn(s,'saveAddon').mockReturnValue({ok:false})
 const w=mount(Addon),e=mount(Editor),original=s.addons[0].name
 try{
  await w.get('[data-catalog-add]').trigger('click');await flushPromises()
  if(result==='cancel'){s.addons.push({...s.addons[0],id:'REMOTE-ADDON',name:'Unrelated addon'});e.vm.close()}
  else{await e.get('#addon-name').setValue('Failed topping');await e.vm.submit()}
  await flushPromises();expect(w.get('[data-selected-addon-name]').text()).toBe(original)
 }finally{w.unmount();e.unmount()}
})
it('keeps the add action and empty state usable with no addons or platforms',async()=>{
 const s=createTestStore();s.resetDemoData();s.addons=[];s.platforms=[]
 const w=mount(Addon)
 try{
  expect(w.find('[data-addon-edit]').exists()).toBe(false)
  expect(w.get('[data-addon-more]').attributes('aria-haspopup')).toBe('dialog')
  expect(w.get('[data-addon-header]').text()).toContain('จัดการตัวเลือกเสริม')
  await w.get('[data-catalog-add]').trigger('click')
  expect(s.modals.addonEdit).toMatchObject({isOpen:true,addonId:null})
 }finally{w.unmount()}
})

it('returns keyboard focus to the selected addon when going back to the list',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Addon,{attachTo:document.body})
 try{
  const selected=w.findAll('[data-addon-select]')[1]
  await selected.trigger('click')
  await w.get('.menu-back').trigger('click');await flushPromises()
  expect(document.activeElement).toBe(selected.element)
 }finally{w.unmount()}
})

it('uses Dashboard chart controls and places addon calculation notes in the shared info tooltip',async()=>{
 const s=createTestStore();s.resetDemoData();const w=mount(Addon,{attachTo:document.body})
 try{
  await showAnalysis()
  expect(document.querySelectorAll('.dashboard-segments button')).toHaveLength(3)
  expect(w.text()).not.toContain('ไม่รวมราคาเมนูหลัก')
  const info=document.querySelector('[data-addon-analysis-info]')
  info.click();await flushPromises()
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('ไม่รวมราคาเมนูหลัก ราคาเฉพาะกลุ่ม หรือรายการที่รวมฟรีในเมนู')
  expect(document.querySelector('[role="tooltip"]').textContent).toContain('ยังไม่หักค่าเช่า')
  info.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await flushPromises()
  expect(document.querySelector('[role="tooltip"]')).toBeNull()
 }finally{w.unmount()}
})
