import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import GroupManager from '../../src/components/catalog/AddonGroupManager.vue'
import CatalogOrderDialog from '../../src/components/catalog/CatalogOrderDialog.vue'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'

async function setup(beforeExecute=()=>null){
 sessionStorage.clear()
 const f=summaryFixture()
 f.materials.forEach(m=>Object.assign(m,{name:m.id,unit:'กรัม'}))
 let data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{SIMPLE:{name:'เมนูหนึ่ง'},FRUIT:{name:'เมนูสอง'}},addons:{A0:{name:'ผลไม้หนึ่ง'},A1:{name:'ผลไม้สอง'}},groups:{},platforms:{P:{name:'หน้าร้าน'}}}}
 const commands=[]
 const model=createInventoryModel({getData:()=>data,loadServer:async()=>data,isReady:()=>true,isBlocked:()=>false,storageKey:'group-save-audit',execute:async command=>{
  commands.push(command)
  const blocked=await beforeExecute(command)
  if(blocked)return blocked
  const plan=planInventoryCommand(data.shop,data.materials,command)
  data={...data,shop:plan.nextShop,materials:data.materials.map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),display:plan.displayChange?applyCatalogDisplay(data.display,plan.displayChange):data.display}
  return {ok:true,value:{opId:command.opId,kind:command.kind}}
 }})
 expect(await model.saveAddonGroup({name:'ผลไม้',minSelections:0,maxSelections:2,allowRepeat:false,pricingMode:'extra',menuIds:['SIMPLE'],options:[{addonId:'A0',paused:true,prices:{},unpricedPlatformIds:['P']},{addonId:'A1',prices:{P:0}}]})).toMatchObject({ok:true})
 const group=model.addonGroups.find(g=>g.name==='ผลไม้')
 const wrapper=mount(GroupManager,{attachTo:document.body,global:{provide:{'cloud-inventory-model':model},stubs:{teleport:true}}})
 return {model,group,wrapper,commands,snapshot:()=>data,close(){wrapper.unmount();model.close()}}
}
const button=(w,text)=>w.findAll('button').find(b=>b.text()===text)
async function save(w){await button(w,'บันทึกกลุ่มตัวเลือก').trigger('click');await flushPromises()}
async function edit(w){await w.get('[aria-label="แก้ไขกลุ่ม ผลไม้"]').trigger('click')}
async function select(w,label,text){await w.get(`[role="combobox"][aria-label="${label}"]`).trigger('click');await w.findAll('[role="option"]').find(o=>o.text()===text).trigger('click')}
async function optionAction(w,index,text){await w.findAll('[data-group-addon]')[index].get('[aria-haspopup="dialog"]').trigger('click');await button(w.get('#group-option-settings'),text).trigger('click')}
async function finishOption(w){await button(w.get('#group-option-settings'),'เสร็จสิ้น').trigger('click')}

it('saves option ordering from the original Firebase group dialog with the opening revision',async()=>{
 const s=await setup()
 try{
  const before=JSON.parse(JSON.stringify(s.group.options))
  await s.wrapper.get('[aria-label="จัดลำดับตัวเลือก"]').trigger('click')
  await s.wrapper.get('[data-order-handle="A1"]').trigger('keydown',{key:'ArrowUp'})
  await s.wrapper.get('[data-order-save]').trigger('click');await flushPromises()
  expect(s.model.addonGroups.find(g=>g.id===s.group.id).options).toEqual([...before].reverse())
  expect(s.wrapper.getComponent(CatalogOrderDialog).props('open')).toBe(false)
 }finally{s.close()}
})

it('restarts option ordering at the latest revision after a remote group edit',async()=>{
 const s=await setup()
 try{
  await s.wrapper.get('[aria-label="จัดลำดับตัวเลือก"]').trigger('click')
  await s.wrapper.get('[data-order-handle="A1"]').trigger('keydown',{key:'ArrowUp'})
  expect(await s.model.saveAddonGroup({...s.group,name:'ชื่อจากเครื่องอื่น'})).toMatchObject({ok:true})
  await flushPromises()
  expect(s.wrapper.get('[data-order-save]').attributes('disabled')).toBeDefined()
  await s.wrapper.get('[data-order-restart]').trigger('click')
  await s.wrapper.get('[data-order-handle="A1"]').trigger('keydown',{key:'ArrowUp'})
  await s.wrapper.get('[data-order-save]').trigger('click');await flushPromises()
  expect(s.model.addonGroups.find(g=>g.id===s.group.id)).toMatchObject({name:'ชื่อจากเครื่องอื่น',options:[{addonId:'A1'},{addonId:'A0',paused:true}]})
  expect(s.wrapper.getComponent(CatalogOrderDialog).props('open')).toBe(false)
 }finally{s.close()}
})

it('renames and relinks a shared group without dropping free/unset prices, pause or other menu fields',async()=>{
 const s=await setup()
 try{
  const menuBefore=JSON.parse(JSON.stringify(s.model.menus.find(m=>m.id==='SIMPLE')))
  await edit(s.wrapper)
  await s.wrapper.get('#addon-group-name').setValue('ผลไม้ใหม่')
  await select(s.wrapper,'เชื่อมกับเมนู','เมนูสอง')
  await save(s.wrapper)
  let group=s.model.addonGroups.find(g=>g.id===s.group.id)
  expect(group).toMatchObject({name:'ผลไม้ใหม่',options:[{addonId:'A0',paused:true,unpricedPlatformIds:['P']},{addonId:'A1',prices:{P:0}}]})
  expect(s.snapshot().shop.catalog.groups[group.id].menuIds).toEqual(expect.arrayContaining(['SIMPLE','FRUIT']))
  expect(s.model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({recipe:menuBefore.recipe,prices:menuBefore.prices,addonGroupIds:[group.id]})
  await s.wrapper.get('[aria-label="แก้ไขกลุ่ม ผลไม้ใหม่"]').trigger('click')
  await s.wrapper.get('[aria-label="ยกเลิกการเชื่อม เมนูหนึ่ง"]').trigger('click')
  await save(s.wrapper)
  expect(s.model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual([])
  expect(s.model.menus.find(m=>m.id==='FRUIT').addonGroupIds).toEqual([group.id])
 }finally{s.close()}
})

it('saves existing recipe changes and a new option through the original group drawer',async()=>{
 const s=await setup()
 try{
  const ingredient=s.model.addons.find(a=>a.id==='A0').recipe[0]
  const before=JSON.parse(JSON.stringify(s.snapshot().materials))
  await edit(s.wrapper)
  await optionAction(s.wrapper,0,'แก้จำนวนต่อที่')
  await s.wrapper.get('[aria-label="จำนวนต่อที่"]').setValue(2.5)
  await finishOption(s.wrapper)
  await s.wrapper.get('[data-group-add-option]').trigger('click')
  await button(s.wrapper.get('#group-stock-picker'),'สร้างตัวเลือกเอง').trigger('click')
  await s.wrapper.get('[aria-label="ชื่อตัวเลือก"]').setValue('ไม่รับช้อน')
  await button(s.wrapper.get('#group-manual-option'),'เพิ่มตัวเลือก').trigger('click')
  await save(s.wrapper)
  const added=s.model.addons.find(a=>a.name==='ไม่รับช้อน')
  expect(added).toMatchObject({recipe:[]})
  expect(s.model.addonGroups.find(g=>g.id===s.group.id).options).toContainEqual({addonId:added.id,unpricedPlatformIds:['P']})
  expect(s.snapshot().shop.catalog.addons.A0.recipe[ingredient.materialId]).toBe(250)
  expect(s.snapshot().materials).toEqual(before)
 }finally{s.close()}
})

it('renames a shared option from the group drawer without changing its recipe or another group',async()=>{
 const s=await setup()
 try{
  expect(await s.model.saveAddonGroup({name:'กลุ่มอื่น',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'extra',options:[{addonId:'A0',paused:true,prices:{P:5}}]})).toMatchObject({ok:true})
  const before=JSON.parse(JSON.stringify(s.snapshot())),other=s.model.addonGroups.find(g=>g.name==='กลุ่มอื่น')
  await edit(s.wrapper)
  await optionAction(s.wrapper,0,'แก้ชื่อตัวเลือก')
  await s.wrapper.get('#group-option-name').setValue('  ผลไม้ชื่อใหม่  ')
  await finishOption(s.wrapper)
  expect(s.model.addons.find(a=>a.id==='A0').name).toBe('ผลไม้หนึ่ง')
  await save(s.wrapper)
  expect(s.model.addons.find(a=>a.id==='A0').name).toBe('ผลไม้ชื่อใหม่')
  const after=s.snapshot()
  expect(after.shop.catalog.addons.A0).toMatchObject({...before.shop.catalog.addons.A0,name:'ผลไม้ชื่อใหม่'})
  expect(after.shop.catalog.groups[other.id]).toEqual(before.shop.catalog.groups[other.id])
  expect(after.materials).toEqual(before.materials)
 }finally{s.close()}
})

it('changes paid, zero and unset prices and pauses only the selected group',async()=>{
 const s=await setup()
 try{
  expect(await s.model.saveAddonGroup({name:'กลุ่มอื่น',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'extra',options:[{addonId:'A0',paused:true,prices:{P:5}}]})).toMatchObject({ok:true})
  await edit(s.wrapper)
  await optionAction(s.wrapper,0,'ราคา')
  await s.wrapper.get('#group-price-A0-P').setValue(12.25)
  await finishOption(s.wrapper)
  await save(s.wrapper)
  expect(s.snapshot().shop.catalog.groups[s.group.id].optionPrices.P.A0).toBe(1225)
  await edit(s.wrapper)
  await optionAction(s.wrapper,0,'ราคา')
  await s.wrapper.get('#group-price-A0-P').setValue(0)
  await finishOption(s.wrapper);await save(s.wrapper)
  expect(s.model.addonGroups.find(g=>g.id===s.group.id).options[0].prices.P).toBe(0)
  await edit(s.wrapper)
  await optionAction(s.wrapper,0,'ราคา')
  await s.wrapper.get('#group-price-A0-P').setValue('')
  await finishOption(s.wrapper);await save(s.wrapper)
  expect(s.model.addonGroups.find(g=>g.id===s.group.id).options[0]).toMatchObject({unpricedPlatformIds:['P']})
  await s.wrapper.get('[aria-label="เปิดขาย ผลไม้หนึ่ง ในกลุ่มนี้"]').setValue(true);await flushPromises()
  expect(s.model.addonGroups.find(g=>g.id===s.group.id).options[0].paused).toBeUndefined()
  expect(s.model.addonGroups.find(g=>g.name==='กลุ่มอื่น').options[0]).toMatchObject({paused:true,prices:{P:5}})
 }finally{s.close()}
})

it('retires a shared group after confirmation and preserves its addons and stock',async()=>{
 const s=await setup()
 try{
  expect(await s.model.saveAddonGroup({...s.group,menuIds:['SIMPLE','FRUIT']})).toMatchObject({ok:true})
  expect(await s.model.saveAddonGroup({name:'อีกกลุ่มบนเมนูหนึ่ง',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'included',menuIds:['SIMPLE'],options:[{addonId:'A1'}]})).toMatchObject({ok:true})
  const remaining=s.model.addonGroups.find(g=>g.name==='อีกกลุ่มบนเมนูหนึ่ง')
  const before=JSON.parse(JSON.stringify(s.snapshot()))
  vi.spyOn(s.model,'confirmDialog').mockResolvedValue(true)
  await button(s.wrapper,'ลบกลุ่ม').trigger('click');await flushPromises()
  expect(s.model.addonGroups.some(g=>g.id===s.group.id)).toBe(false)
  expect(s.model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual([remaining.id])
  expect(s.model.menus.find(m=>m.id==='FRUIT').addonGroupIds).toEqual([])
  expect(s.snapshot().shop.catalog.groups[remaining.id].menuIds).toEqual(['SIMPLE'])
  expect(s.snapshot().shop.catalog.addons).toEqual(before.shop.catalog.addons)
  expect(s.snapshot().materials).toEqual(before.materials)
 }finally{s.close()}
})

it('keeps the group draft open and blocks duplicate submissions until server rejection is known',async()=>{
 let reject,blocked=false
 const s=await setup(()=>blocked?new Promise(resolve=>{reject=resolve}):null)
 try{
  const before=JSON.parse(JSON.stringify(s.snapshot()))
  await edit(s.wrapper)
  await s.wrapper.get('#addon-group-name').setValue('ชื่อที่ยังไม่ยืนยัน')
  blocked=true
  const send=vi.spyOn(s.model,'saveAddonGroup')
  const saveButton=()=>button(s.wrapper,'บันทึกกลุ่มตัวเลือก')
  await saveButton().trigger('click');await flushPromises()
  expect(send).toHaveBeenCalledTimes(1)
  expect(saveButton().attributes('aria-busy')).toBe('true')
  await saveButton().trigger('click');await flushPromises()
  expect(send).toHaveBeenCalledTimes(1)
  reject({ok:false,outcome:'not_submitted',message:'ยังยืนยันการเชื่อมต่อไม่ได้'})
  await flushPromises()
  expect(s.wrapper.get('#addon-group-name').element.value).toBe('ชื่อที่ยังไม่ยืนยัน')
  expect(s.wrapper.get('#addon-group-editor').text()).toContain('ยังยืนยันการเชื่อมต่อไม่ได้')
  expect(saveButton().attributes('aria-busy')).toBeUndefined()
  expect(s.snapshot()).toEqual(before)
  expect(s.model.hasCatalogDrafts).toBe(true)
  expect(s.model.hasStockDrafts).toBe(false)
 }finally{s.close()}
})

it('rejects a stale open group editor without overwriting another save or losing the entered draft',async()=>{
 const s=await setup()
 try{
  await edit(s.wrapper)
  await s.wrapper.get('#addon-group-name').setValue('ชื่อจากแบบร่างเก่า')
  expect(await s.model.saveAddonGroup({...s.group,name:'ชื่อจากเครื่องอื่น'})).toMatchObject({ok:true})
  const before=JSON.parse(JSON.stringify(s.snapshot()))
  await save(s.wrapper)
  expect(s.snapshot()).toEqual(before)
  expect(s.wrapper.get('#addon-group-name').element.value).toBe('ชื่อจากแบบร่างเก่า')
  expect(s.wrapper.get('#addon-group-editor').text()).toContain('ข้อมูลเมนูหรือสูตรถูกแก้จากเครื่องอื่น')
 }finally{s.close()}
})
