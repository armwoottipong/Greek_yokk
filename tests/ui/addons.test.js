import { it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CustomOrder from '../../src/components/modals/CustomOrderModal.vue'
import {createTestStore,material} from '../helpers/createStore'
function orderStore(data){
 const store=createTestStore();store.resetDemoData()
 const {matMap,currentPlatform,...rest}=data
 Object.assign(store,rest)
 store.platforms=[{id:'P',...currentPlatform,gpPercent:0}]
 store.materials=Object.entries(matMap).map(([id,value])=>material(id,value.stock??100,value))
 return store
}
it('names same-emoji addons and exposes selection on native buttons',async()=>{
 orderStore({modals:{customOrder:{isOpen:true,menuId:'M'}}, menus:[{id:'M',name:'Yogurt',hasAddons:true,prices:{P:10}}], addons:[{id:'A',name:'Strawberry',emoji:'🍓',prices:{P:5},recipe:[]},{id:'B',name:'Berry jam',emoji:'🍓',prices:{P:6},recipe:[]}],currentPlatformId:'P',currentPlatform:{name:'Local'},matMap:{}})
 const wrapper=mount(CustomOrder)
 const button=wrapper.findAll('button').find(b=>b.text().includes('Strawberry'))
 expect(button).toBeDefined()
 expect(button.text()).toContain('+฿5')
 expect(wrapper.text()).toContain('Berry jam')
 await button.trigger('click')
 expect(button.attributes('aria-pressed')).toBe('true')
 wrapper.unmount()
})
it('includes each addon recipe row in active-lot depletion warnings',()=>{
 const store=createTestStore();store.resetDemoData()
 const lots=id=>[{id:`${id}-CURRENT`,qty:1,initialQty:1,unitCost:1,isInUse:true,receiveDate:'2026-10-01',expiryDate:'2099-01-01'},{id:`${id}-NEXT`,qty:100,initialQty:100,unitCost:1,isInUse:false,receiveDate:'2026-10-02',expiryDate:'2099-01-01'}]
 store.materials.push(material('FOOD',101,{lots:lots('FOOD')}),material('PACK',101,{inventoryType:'packaging',lots:lots('PACK')}))
 store.executeAddToCart({...store.menus[0],recipe:[]},[{...store.addons[0],recipe:[{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}]}],1)
 expect(store.cartLotWarnings.map(w=>({id:w.material.id,qty:w.neededQty}))).toEqual([{id:'FOOD',qty:25},{id:'PACK',qty:2}])
})
it('keeps cart lot warnings readable when a snapshotted addon recipe material disappears',()=>{
 const store=createTestStore();store.resetDemoData()
 store.executeAddToCart({...store.menus[0],recipe:[]},[{...store.addons[0],recipe:[{materialId:'MISSING',qty:2}]}],1)
 expect(()=>store.cartLotWarnings).not.toThrow()
 expect(store.cartLotWarnings).toEqual([])
})
it('shows recipe stock shortages at the selected quantity while customer price uses only prices',async()=>{
 orderStore({modals:{customOrder:{isOpen:true,menuId:'M'}},menus:[{id:'M',name:'Yogurt',hasAddons:true,prices:{P:10}}],addons:[{id:'A',name:'Fruit and sleeve',prices:{P:5},recipe:[{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}]},{id:'OFF',name:'Inactive',isActive:false,recipe:[]}],currentPlatformId:'P',currentPlatform:{name:'Local'},matMap:{FOOD:{name:'Fruit',unit:'g',stock:100},PACK:{name:'Sleeve',unit:'ใบ',stock:3,inventoryType:'packaging',unitCost:100}}})
 const wrapper=mount(CustomOrder)
 const button=wrapper.findAll('button').find(b=>b.text().includes('Fruit and sleeve'))
 expect(button.text()).toContain('25 g');expect(button.text()).toContain('2 ใบ')
 expect(wrapper.text()).not.toContain('Inactive')
 await button.trigger('click');expect(wrapper.vm.totalBowlPrice).toBe(15)
 await wrapper.get('[aria-label="เพิ่มจำนวนชาม"]').trigger('click')
 expect(button.text()).toContain('ของหมด');expect(wrapper.vm.totalBowlPrice).toBe(15)
 wrapper.unmount()
})
it('shows missing and archived recipe materials as unavailable',()=>{
 orderStore({modals:{customOrder:{isOpen:true,menuId:'M'}},menus:[{id:'M',name:'Yogurt',hasAddons:true,prices:{P:10}}],addons:[{id:'A',name:'Broken',recipe:[{materialId:'MISSING',qty:1}]},{id:'B',name:'Archived',recipe:[{materialId:'ARCH',qty:1}]}],currentPlatformId:'P',currentPlatform:{name:'Local'},matMap:{ARCH:{isArchived:true,stock:100}}})
 const wrapper=mount(CustomOrder)
 for(const name of ['Broken','Archived'])expect(wrapper.findAll('button').find(b=>b.text().includes(name)).text()).toContain('ของหมด')
 wrapper.unmount()
})
it('keeps a full independent recipe snapshot when the selected addon enters the cart',async()=>{
 const store=createTestStore();store.resetDemoData()
 store.materials.push(material('FOOD',100),material('PACK',100,{inventoryType:'packaging',unitCost:100}))
 const menu=store.menus[0];menu.recipe=[];menu.hasAddons=true;menu.prices[store.currentPlatformId]=10
 const addon=store.addons[0];addon.prices[store.currentPlatformId]=5;addon.recipe=[{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}]
 const wrapper=mount(CustomOrder);store.modals.customOrder={isOpen:true,menuId:menu.id};await wrapper.vm.$nextTick()
 await wrapper.findAll('button').find(b=>b.text().includes(addon.name)).trigger('click')
 await wrapper.findAll('button').find(b=>b.text().includes('เพิ่มลงตะกร้า')).trigger('click')
 expect(store.cart[0].selectedAddons[0].recipe).toEqual([{materialId:'FOOD',qty:25},{materialId:'PACK',qty:2}])
 addon.recipe[1].qty=9
 expect(store.cart[0].selectedAddons[0].recipe[1].qty).toBe(2)
 expect(store.cartSummary.subtotal).toBe(15)
 wrapper.unmount()
})
