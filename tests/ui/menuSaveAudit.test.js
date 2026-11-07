import {afterEach,expect,it,vi} from 'vitest'
import {mount,flushPromises,DOMWrapper} from '@vue/test-utils'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'
import Crop from '../../src/components/images/ImageCropDialog.vue'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'

const cleanups=[]
afterEach(()=>{for(const cleanup of cleanups.splice(0).reverse())cleanup()})
async function setup(imageService){
 sessionStorage.clear()
 const f=summaryFixture()
 for(const material of f.materials)material.name=material.id
 let data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{SIMPLE:{name:'เมนูทดสอบ',emoji:'🥣'}},addons:{},groups:{},platforms:{P:{name:'หน้าร้าน'}}}}
 const commands=[]
 let groupReload=null
 const model=createInventoryModel({getData:()=>data,loadServer:async()=>data,isReady:()=>true,isBlocked:()=>false,storageKey:'menu-save-audit',execute:async command=>{
  commands.push(command)
  const plan=planInventoryCommand(data.shop,data.materials,command)
  data={...data,shop:plan.nextShop,materials:data.materials.map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),display:plan.displayChange?applyCatalogDisplay(data.display,plan.displayChange):data.display}
  if(command.kind==='group'&&groupReload){const reload=groupReload;groupReload=null;await reload();model.update(data)}
  return {ok:true,value:{opId:command.opId,kind:command.kind}}
 }})
 cleanups.push(()=>model.close())
 expect(await model.saveMenu({...model.menus.find(m=>m.id==='SIMPLE'),hasAddons:false,addonGroupIds:[]})).toMatchObject({ok:true})
 for(const id of ['G1','G2','G3'])expect(await model.saveAddonGroup({id,name:`กลุ่ม ${id}`,minSelections:0,maxSelections:3,allowRepeat:false,pricingMode:'included',options:[{addonId:'A0'}]})).toMatchObject({ok:true})
 vi.spyOn(model,'confirmDialog').mockResolvedValue(true)
 commands.length=0
 const wrapper=mount(MenuEdit,{attachTo:document.body,global:{provide:{'cloud-inventory-model':model,...(imageService?{'catalog-images':imageService}:{})}}})
 cleanups.push(()=>wrapper.unmount())
 model.modals.menuEdit={isOpen:true,menuId:'SIMPLE'}
 await flushPromises()
 return {model,wrapper,commands,snapshot:()=>data,scheduleGroupReload(write){groupReload=async()=>{
  const remote=createInventoryModel({getData:()=>data,loadServer:async()=>data,isReady:()=>true,isBlocked:()=>false,storageKey:'remote-menu-save-audit',execute:async command=>{
   const plan=planInventoryCommand(data.shop,data.materials,command)
   data={...data,shop:plan.nextShop,materials:data.materials.map(m=>plan.nextMaterials.find(n=>n.id===m.id)||m),display:plan.displayChange?applyCatalogDisplay(data.display,plan.displayChange):data.display}
   return {ok:true,value:{opId:command.opId,kind:command.kind}}
  }})
  try{await write(remote)}finally{remote.close()}
 }}}
}
const body=()=>new DOMWrapper(document.body)
const button=(wrapper,text)=>wrapper.findAll('button').find(b=>b.text()===text)
async function openPicker(wrapper,ids){
 await wrapper.get('[data-open-group-picker]').trigger('click')
 for(const id of ids)await body().get(`[data-picker-group="${id}"] input`).setValue(true)
}
async function save(wrapper){
 await button(wrapper,'บันทึกข้อมูลเมนู').trigger('click')
 await flushPromises()
}
async function createGroup(name='สร้างจากเมนู'){
 await body().get('[data-create-group-from-menu]').trigger('click')
 await flushPromises()
 const editor=body().get('#addon-group-editor')
 await editor.get('#addon-group-name').setValue(name)
 await editor.get('[data-group-add-option]').trigger('click')
 await button(body().get('#group-stock-picker'),'สร้างตัวเลือกเอง').trigger('click')
 const manual=body().get('#group-manual-option')
 await manual.get('[aria-label="ชื่อตัวเลือก"]').setValue('ตัวเลือกสร้างใหม่')
 await button(manual,'เพิ่มตัวเลือก').trigger('click')
 await button(editor,'บันทึกกลุ่มตัวเลือก').trigger('click')
 await flushPromises()
}

it.each([[],['G1'],['G1','G2']].map(ids=>({ids})))('persists explicit $ids group choices from the original disabled-menu form',async({ids})=>{
 const {wrapper,model,snapshot}=await setup()
 const before=structuredClone(snapshot().shop.catalog.menus.SIMPLE)
 await openPicker(wrapper,ids)
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(false)
 expect(model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({hasAddons:ids.length>0,addonGroupIds:ids})
 expect(snapshot().shop.catalog.menus.SIMPLE.recipe).toEqual(before.recipe)
 expect(snapshot().shop.catalog.menus.SIMPLE.pricesCents).toEqual(before.pricesCents)
})

it('does not apply cancelled choices or permit a third selected group',async()=>{
 const {wrapper,model,commands}=await setup()
 await openPicker(wrapper,['G1','G2'])
 expect(body().get('[data-picker-group="G3"] input').element.disabled).toBe(true)
 await button(body().get('#menu-group-picker'),'ยกเลิก').trigger('click')
 expect(wrapper.find('[data-menu-group-summary]').exists()).toBe(false)
 await save(wrapper)
 expect(model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({hasAddons:false,addonGroupIds:[]})
 expect(commands).toHaveLength(0)
})

it('rejects a stale catalog revision and retains the edited form',async()=>{
 const {wrapper,model,snapshot,commands}=await setup()
 await wrapper.get('#menu-name').setValue('ชื่อที่ค้างอยู่')
 const before=snapshot().shop.catalogRevision
 expect(await model.saveAddon({...model.addons[0],name:'เปลี่ยนจากอีกหน้าจอ',expectedCatalogRevision:before})).toMatchObject({ok:true})
 commands.length=0
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(true)
 expect(wrapper.get('#menu-name').element.value).toBe('ชื่อที่ค้างอยู่')
 expect(wrapper.text()).toContain('ถูกแก้จากเครื่องอื่น')
 expect(commands).toHaveLength(0)
})

it('retries only the image after a group-binding save succeeds',async()=>{
 const jpg='data:image/jpeg;base64,/9j/2Q=='
 const service={watch:(_kind,_id,cb)=>{cb({dataURL:'',revision:0});return vi.fn()},save:vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({revision:1})}
 const {wrapper,model,commands}=await setup(service)
 await openPicker(wrapper,['G1'])
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 wrapper.findComponent(Crop).vm.$emit('apply',jpg)
 await flushPromises()
 expect(wrapper.vm.form.image).toBe(jpg)
 await save(wrapper)
 expect(service.save).toHaveBeenCalledTimes(1)
 expect(model.modals.menuEdit.isOpen).toBe(true)
 expect(wrapper.text()).toContain('รูปยังไม่สำเร็จ')
 expect(model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual(['G1'])
 expect(commands.filter(c=>c.kind==='menu')).toHaveLength(1)
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(false)
 expect(commands.filter(c=>c.kind==='menu')).toHaveLength(1)
 expect(service.save).toHaveBeenLastCalledWith('menus','SIMPLE',jpg,0)
})

it.each([true,false])('creates a group from the picker and binds it only after Finish=%s',async finish=>{
 const {wrapper,model}=await setup()
 await openPicker(wrapper,['G1'])
 await createGroup()
 const created=model.addonGroups.find(g=>g.name==='สร้างจากเมนู')
 expect(created).toBeDefined()
 expect(body().get(`[data-picker-group="${created.id}"] input`).element.checked).toBe(true)
 expect(model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual([])
 await button(body().get('#menu-group-picker'),finish?'เสร็จสิ้น':'ยกเลิก').trigger('click')
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(false)
 expect(model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual(finish?['G1',created.id]:[])
})

it('does not forgive a stale menu revision when creating a fresh picker group',async()=>{
 const {wrapper,model,commands}=await setup()
 await wrapper.get('#menu-name').setValue('ชื่อแบบร่างเก่า')
 expect(await model.saveMenu({...model.menus.find(m=>m.id==='SIMPLE'),name:'ชื่อจากอีกเครื่อง',recipe:[{materialId:'S0',qty:5}]})).toMatchObject({ok:true})
 await openPicker(wrapper,[])
 await createGroup()
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 commands.length=0
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(true)
 expect(wrapper.text()).toContain('ถูกแก้จากเครื่องอื่น')
 expect(model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({name:'ชื่อจากอีกเครื่อง',recipe:[{materialId:'S0',qty:5}]})
 expect(commands).toHaveLength(0)
})

it('retains the draft and new group when a second session edits the menu during group post-save reload',async()=>{
 const {wrapper,model,commands,scheduleGroupReload}=await setup()
 await wrapper.get('#menu-name').setValue('ชื่อแบบร่างเดิม')
 scheduleGroupReload(async remote=>{
  expect(await remote.saveMenu({...remote.menus.find(m=>m.id==='SIMPLE'),name:'ชื่อระหว่างโหลดผลกลุ่ม',recipe:[{materialId:'S0',qty:7}],prices:{P:91}})).toMatchObject({ok:true})
 })
 await openPicker(wrapper,[])
 await createGroup()
 const created=model.addonGroups.find(g=>g.name==='สร้างจากเมนู')
 expect(created).toBeDefined()
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 commands.length=0
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(true)
 expect(wrapper.get('#menu-name').element.value).toBe('ชื่อแบบร่างเดิม')
 expect(wrapper.get('[data-menu-group-summary]').text()).toContain(created.name)
 expect(wrapper.text()).toContain('ถูกแก้จากเครื่องอื่น')
 expect(model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({name:'ชื่อระหว่างโหลดผลกลุ่ม',recipe:[{materialId:'S0',qty:7}],prices:{P:91},addonGroupIds:[]})
 expect(commands).toHaveLength(0)
})

it('accepts reordered recipe keys and unrelated metadata changes during group post-save reload',async()=>{
 const {wrapper,model,scheduleGroupReload}=await setup()
 await wrapper.get('#menu-name').setValue('ชื่อแบบร่างที่บันทึกได้')
 scheduleGroupReload(async remote=>{
  const menu=remote.menus.find(m=>m.id==='SIMPLE')
  expect(await remote.saveMenu({...menu,recipe:[...menu.recipe].reverse(),prices:Object.fromEntries(Object.entries(menu.prices).reverse())})).toMatchObject({ok:true})
  expect(await remote.saveAddon({...remote.addons[0],name:'ชื่อของตัวเลือกอื่น'})).toMatchObject({ok:true})
 })
 await openPicker(wrapper,[])
 await createGroup()
 const created=model.addonGroups.find(g=>g.name==='สร้างจากเมนู')
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(false)
 expect(model.menus.find(m=>m.id==='SIMPLE')).toMatchObject({name:'ชื่อแบบร่างที่บันทึกได้',addonGroupIds:[created.id]})
 expect(model.addons[0].name).toBe('ชื่อของตัวเลือกอื่น')
})

it('treats a changed menu group order during post-save reload as a conflict',async()=>{
 const {wrapper,model,scheduleGroupReload}=await setup()
 model.modals.menuEdit.isOpen=false
 await flushPromises()
 expect(await model.saveMenu({...model.menus.find(m=>m.id==='SIMPLE'),hasAddons:true,addonGroupIds:['G1','G2']})).toMatchObject({ok:true})
 model.modals.menuEdit={isOpen:true,menuId:'SIMPLE'}
 await flushPromises()
 await wrapper.get('#menu-name').setValue('ชื่อในแบบร่าง')
 scheduleGroupReload(async remote=>{
  expect(await remote.saveMenu({...remote.menus.find(m=>m.id==='SIMPLE'),addonGroupIds:['G2','G1']})).toMatchObject({ok:true})
 })
 await openPicker(wrapper,[])
 await createGroup()
 await button(body().get('#menu-group-picker'),'เสร็จสิ้น').trigger('click')
 await save(wrapper)
 expect(model.modals.menuEdit.isOpen).toBe(true)
 expect(model.menus.find(m=>m.id==='SIMPLE').addonGroupIds).toEqual(['G2','G1'])
})
