import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {mount, flushPromises} from '@vue/test-utils'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {multiGroupFixture} from '../firestore/summaryMultiGroupFixture.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {summaryPreparedMenu} from '../../src/cloud/core/model/catalogMenu.js'
import {summaryCancel} from '../../src/cloud/core/model/cancel.js'
import {projectReceipt} from '../../src/cloud/core/productPresentation.js'
import {cloudPackageOperands, projectCloudPackages} from '../../src/cloud/core/packagePresentation.js'
import {encodeGroupAvailability} from '../../src/cloud/core/groupAvailability.js'
import CoreWorkspace from '../../src/cloud/core/CoreWorkspace.vue'
import CartPanel from '../../src/components/pos/CartPanel.vue'

const h=vi.hoisted(()=>({load:vi.fn(),preview:vi.fn(),execute:vi.fn()}))
vi.mock('../../src/cloud/core/workspace.js',()=>({createCoreWorkspace:()=>({images:{watch:(_kind,_id,cb)=>{cb({dataURL:'',revision:0});return ()=>{}},save:vi.fn()},load:h.load,previewSale:h.preview,execute:h.execute,pending:async()=>[],orders:async()=>[],history:async()=>[],report:async()=>({receipts:[],legacyOrders:[]}),close(){}})}))
vi.mock('../../src/cloud/firebaseClient.js',()=>({getFirebaseClient:()=>({db:{}})}))
vi.mock('../../src/cloud/shopAccess.js',async original=>({...await original(),createShopAccess:()=>({watch(){},watchInvitations(){},heartbeat:async()=>{},close(){}})}))

const choices=[{groupId:'G',id:'A0',selectionQty:2},{groupId:'G',id:'A2',selectionQty:1},{groupId:'H',id:'A0',selectionQty:1}]
function fixture(){const f=multiGroupFixture();f.shop.materialIds=f.materials.map(m=>m.id);f.shop.catalog.groups.G.allowRepeat=true;return f}
function viewData(f){return {...f,display:{menus:{SIMPLE:{name:'Yogurt'}},groups:{},addons:{A0:{name:'Fruit'},A2:{name:'Honey'}},platforms:{P:{name:'Counter'}}},orders:[]}}
const state={user:{uid:'u',email:'u@example.com'},shop:{generation:'g1',revision:1,allowedEmails:{'u@example.com':true},userRoles:{'u@example.com':'admin'}},serverReady:true}
let wrapper
beforeEach(()=>{sessionStorage.clear();h.execute.mockReset();h.load.mockReset();h.preview.mockReset()})
afterEach(()=>{wrapper?.unmount();wrapper=undefined})

// These assertions exercise production planners; fixture helpers supply input only.
describe('POS save audit: current source planners',()=>{
 it.each([0,1,2])('newly binds %i groups and charges/deducts the canonical selection',count=>{
  const f=fixture(),input={...f.shop.catalog.menus.SIMPLE,groupIds:['G','H'].slice(0,count)},edit=summaryPreparedMenu(f.shop,f.materials,input)
  const line=count===2?{menuId:'SIMPLE',qty:2,selections:choices}:{menuId:'SIMPLE',qty:2,optionIds:count===1?['A0','A0','A2']:[]}
  const sale=summaryMultiGroupSale(edit.nextShop,edit.nextMaterials,[line],{platformId:'P'})
  expect(sale.order.subtotalCents).toBe((edit.nextShop.catalog.menus.SIMPLE.pricesCents.P+(count===2?500:0))*2)
  for(const row of sale.order.inventory){const c=edit.nextShop.catalog;const selected=count===0?0:(count===2?3:2)*(c.addons.A0.recipe[row.materialId]||0)+(c.addons.A2.recipe[row.materialId]||0);expect(row.needed).toBe(2*((c.menus.SIMPLE.recipe[row.materialId]||0)+selected))}
  expect(sale.order.lines[0].catalog).toEqual(edit.nextShop.catalog.menus.SIMPLE)
 })
 it.each([
  [],
  [{groupId:'G',id:'A0',selectionQty:4}],
  [{groupId:'G',id:'A0',selectionQty:2},{groupId:'G',id:'A0',selectionQty:1}],
  [{groupId:'G',id:'A0',selectionQty:3},{groupId:'H',id:'A0',selectionQty:4}],
  [{groupId:'G',id:'A0',selectionQty:3},{groupId:'OTHER',id:'A0',selectionQty:1}],
 ])('rejects selections violating group identity/min/max: %j',selections=>{
  const f=fixture();expect(()=>summaryMultiGroupSale(f.shop,f.materials,[{menuId:'SIMPLE',qty:1,selections}])).toThrow()
 })
 it.each([0,1])('rejects stale two-group cart choices after rebinding to %i groups',count=>{
  const f=fixture();f.shop.catalog.groups.G.min=0
  const edited=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G'].slice(0,count)})
  expect(()=>summaryMultiGroupSale(edited.nextShop,edited.nextMaterials,[{menuId:'SIMPLE',qty:1,selections:choices}])).toThrow()
 })
 it('rejects repeated choices when repeat is disabled',()=>{
  const f=fixture();f.shop.catalog.groups.G.allowRepeat=false
  expect(()=>summaryMultiGroupSale(f.shop,f.materials,[{menuId:'SIMPLE',qty:1,selections:choices}])).toThrow('Invalid multi-group selection')
 })
 it('accepts explicit one-group selections with the same price and allocation as legacy optionIds',()=>{
  const f=fixture(),edit=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G']})
  const selected=summaryMultiGroupSale(edit.nextShop,edit.nextMaterials,[{menuId:'SIMPLE',qty:2,selections:choices.filter(c=>c.groupId==='G')}]).order
  const legacy=summaryMultiGroupSale(edit.nextShop,edit.nextMaterials,[{menuId:'SIMPLE',qty:2,optionIds:['A0','A0','A2']}]).order
  expect(selected.lines).toEqual(legacy.lines);expect(selected.inventory).toEqual(legacy.inventory)
  for(const selections of [null,[null],[{groupId:'H',id:'A0',selectionQty:3}],[{groupId:'G',id:'A0',selectionQty:3},{groupId:'G',id:'A0',selectionQty:1}]])expect(()=>summaryMultiGroupSale(edit.nextShop,edit.nextMaterials,[{menuId:'SIMPLE',qty:1,selections}])).toThrow()
 })
 it('keeps explicit zero different from a missing override that inherits addon price',()=>{
  const f=fixture(),group=f.shop.catalog.groups.H;group.optionPrices.P.A0=0
  const line={menuId:'SIMPLE',qty:1,selections:choices}
  const zero=summaryMultiGroupSale(f.shop,f.materials,[line]).order.subtotalCents
  delete group.optionPrices.P.A0
  expect(summaryMultiGroupSale(f.shop,f.materials,[line]).order.subtotalCents-zero).toBe(f.shop.catalog.addonPrices.P.A0)
 })
 it('cancels historical allocations and retains original totals after recipe, menu, group and price edits',()=>{
  const f=fixture(),sale=summaryMultiGroupSale(f.shop,f.materials,[{menuId:'SIMPLE',qty:2,selections:choices}],{opId:'OLD'})
  const oldLines=JSON.stringify(sale.order.lines),oldTotals=sale.order.subtotalCents
  const changed=structuredClone(sale.nextShop);changed.catalog.menus.SIMPLE.recipe={};changed.catalog.menus.SIMPLE.pricesCents.P=1;changed.catalog.menus.SIMPLE.name='New menu';changed.catalog.menus.SIMPLE.groupIds=[];changed.catalog.groups={};changed.catalog.addons={};changed.catalog.addonPrices.P={}
  const returned=summaryCancel(changed,sale.nextMaterials,sale.order,{opId:'RETURN'})
  for(const m of returned.nextMaterials){const before=f.materials.find(b=>b.id===m.id);expect(m.stock).toBe(before.stock);expect(m.lotQty).toEqual(before.lotQty)}
  expect(JSON.stringify(returned.nextOrder.lines)).toBe(oldLines);expect(returned.nextOrder.subtotalCents).toBe(oldTotals)
  expect(()=>summaryCancel(returned.nextShop,returned.nextMaterials,returned.nextOrder)).toThrow('Order already cancelled')
  const receipt=projectReceipt(sale.order,{...viewData(f),shop:changed})
  expect(receipt.subtotal).toBe(oldTotals/100);expect(receipt.items[0].selectedAddons.find(a=>a.groupId==='H').price).toBe(5)
 })
 it('preserves bill package adjustments and old package snapshot after catalog edits',()=>{
  const f=summaryFixture();f.shop.materialIds=f.materials.map(m=>m.id)
  const data=viewData(f),p=f.materials.find(m=>m.inventoryType==='packaging'),lines=[{menuId:'SIMPLE',qty:2,optionIds:[]}]
  p.name='Original bag';p.unit='piece';f.shop.catalog.menus.SIMPLE.recipe[p.id]=100
  const baseline=projectCloudPackages(data,lines).items.find(i=>i.materialId===p.id).baselineQty
  const adjustments=[{materialId:p.id,deltaQty:2,reason:'separate_bag',note:'keep'}],packages=cloudPackageOperands(data,lines,adjustments)
  const sale=summaryMultiGroupSale(f.shop,f.materials,lines,{packages})
  expect(sale.order.inventory.find(i=>i.materialId===p.id).needed).toBe((baseline+2)*100)
  p.name='Renamed';p.unitCost=999
  const receipt=projectReceipt(sale.order,data),row=receipt.packagePlan.find(i=>i.materialId===p.id)
  expect(row.requestedQty).toBe(baseline+2);expect(row.note).toBe('keep');expect(row.materialName).toBe('Original bag');expect(sale.order.billOperands.packageSnapshots[p.id].unitCost).not.toBe(999)
 })
})

async function mountRealPreview(data){
 h.load.mockResolvedValue(data);h.preview.mockImplementation(payload=>summaryMultiGroupSale(data.shop,data.materials,payload.lines,{platformId:payload.platformId,packages:payload.packages}).order)
 wrapper=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises();return wrapper
}
describe('POS save audit: original UI using real source preview',()=>{
 it('keeps single-group identity in newly generated operands while retaining canonical receipt shape',async()=>{
  const f=fixture();f.shop.catalog.groups.G.min=0
  const edited=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G']})
  const data=viewData({...f,shop:edited.nextShop,materials:edited.nextMaterials}),w=await mountRealPreview(data)
  await w.get('[data-pos-menu="SIMPLE"]').trigger('click');await w.findAll('.bowl-addon')[0].trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
  const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u']),line=JSON.parse(sessionStorage.getItem(key)).cart[0]
  expect(line.selections).toEqual([{groupId:'G',id:'A0',selectionQty:1}]);expect(line).not.toHaveProperty('optionIds')
  const sale=summaryMultiGroupSale(data.shop,data.materials,[line])
  expect(sale.order.lines[0].group.id).toBe('G');expect(sale.order.lines[0].optionQuantities.A0).toBe(1)
  expect(sale.order.lines[0]).not.toHaveProperty('selections');expect(sale.order.lines[0]).not.toHaveProperty('groupSelections')
  expect(projectReceipt(sale.order,data).items[0].selectedAddons[0]).toMatchObject({id:'A0',groupName:f.shop.catalog.groups.G.name,price:0})
  const rebound=summaryPreparedMenu(data.shop,data.materials,{...data.shop.catalog.menus.SIMPLE,groupIds:['H']})
  expect(()=>summaryMultiGroupSale(rebound.nextShop,rebound.nextMaterials,[line])).toThrow('Invalid group selection')
 })
 it('retains but blocks an existing single-group cart after rebinding to another group containing the same addon',async()=>{
  const f=fixture();f.shop.catalog.groups.G.min=0
  const edited=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G']})
  const data=viewData({...f,shop:edited.nextShop,materials:edited.nextMaterials}),w=await mountRealPreview(data)
  await w.get('[data-pos-menu="SIMPLE"]').trigger('click');await w.findAll('.bowl-addon')[0].trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
  const model=w.getComponent(CartPanel).props('model'),key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
  const before=JSON.parse(sessionStorage.getItem(key)).cart
  expect(model.cartSummary.subtotal).toBe(data.shop.catalog.menus.SIMPLE.pricesCents.P/100);expect(model.checkoutDisabled).toBe(false)
  const rebound=summaryPreparedMenu(data.shop,data.materials,{...data.shop.catalog.menus.SIMPLE,groupIds:['H']})
  const next={...data,shop:rebound.nextShop,materials:rebound.nextMaterials}
  h.preview.mockImplementation(payload=>summaryMultiGroupSale(next.shop,next.materials,payload.lines,{platformId:payload.platformId,packages:payload.packages}).order);h.load.mockResolvedValue(next)
  await w.setProps({state:{...state,shop:{...state.shop,revision:2}}});await flushPromises()
  expect(model.cart).toHaveLength(1);expect(model.checkoutDisabled).toBe(true)
  expect(model.cart[0].selectedAddons[0].groupId).toBe('G');expect(JSON.parse(sessionStorage.getItem(key)).cart).toEqual(before)
  expect(h.execute).not.toHaveBeenCalled()
 })
 it.each([0,1,2])('displays freshly bound %i groups and creates the expected cart operands',async count=>{
  const f=fixture(),edit=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G','H'].slice(0,count)})
  const w=await mountRealPreview(viewData({...f,shop:edit.nextShop,materials:edit.nextMaterials}))
  await w.get('[data-pos-menu="SIMPLE"]').trigger('click')
  expect(w.findAll('.bowl-options')).toHaveLength(count)
  if(count){const options=w.findAll('.bowl-options')[0].findAll('.bowl-addon');await options[0].trigger('click');await options[1].trigger('click');await options[2].trigger('click')}
  if(count===2)await w.findAll('.bowl-options')[1].findAll('.bowl-addon')[0].trigger('click')
  await w.get('form.line-form').trigger('submit');await flushPromises()
  const model=w.getComponent(CartPanel).props('model')
  expect(model.cart).toHaveLength(1);expect(model.cart[0].selectedAddons).toHaveLength(count===0?0:count===1?3:4)
  expect(model.checkoutDisabled).toBe(false);expect(model.cartSummary.subtotal).toBe((edit.nextShop.catalog.menus.SIMPLE.pricesCents.P+(count===2?500:0))/100)
 })
 it('blocks an explicitly unset platform price rather than silently using addon fallback',async()=>{
  const f=fixture();f.shop.catalog.groups.G.min=0;f.shop.catalog.groups.H.min=1
  const data=viewData(f),g=f.shop.catalog.groups.H
  data.display.groups.H={description:encodeGroupAvailability({options:g.optionIds.map(id=>({addonId:id,...(id==='A0'?{unpricedPlatformIds:['P']}:{})}))},['P'])}
  delete g.optionPrices.P.A0
  const w=await mountRealPreview(data);await w.get('[data-pos-menu="SIMPLE"]').trigger('click')
  const option=w.findAll('.bowl-options')[1].findAll('.bowl-addon')[0]
  expect(option.text()).toContain('ยังไม่ตั้งราคา')
  expect(option.attributes('disabled')).toBeDefined()
 })
 it('blocks a restored cart with an explicitly unset price before preview or checkout',async()=>{
  const f=fixture(),data=viewData(f),g=f.shop.catalog.groups.H
  data.display.groups.H={description:encodeGroupAvailability({options:g.optionIds.map(id=>({addonId:id,...(id==='A0'?{unpricedPlatformIds:['P']}:{})}))},['P'])}
  sessionStorage.setItem(JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u']),JSON.stringify({platformId:'P',cart:[{menuId:'SIMPLE',qty:1,selections:choices}]}))
  const w=await mountRealPreview(data),model=w.getComponent(CartPanel).props('model')
  expect(model.cart).toHaveLength(1);expect(model.checkoutDisabled).toBe(true)
  expect(model.cart[0].selectedAddons.find(a=>a.groupId==='H').prices).not.toHaveProperty('P')
  expect(h.preview.mock.calls.some(([payload])=>payload.lines.some(line=>line.menuId==='SIMPLE'))).toBe(false);expect(h.execute).not.toHaveBeenCalled()
 })
 it('keeps an explicitly zero-priced option selectable and free',async()=>{
  const f=fixture();f.shop.catalog.groups.G.min=0;f.shop.catalog.groups.H.optionPrices.P.A0=0
  const w=await mountRealPreview(viewData(f));await w.get('[data-pos-menu="SIMPLE"]').trigger('click')
  const option=w.findAll('.bowl-options')[1].findAll('.bowl-addon')[0]
  expect(option.attributes('disabled')).toBeUndefined();expect(option.text()).toContain('รวมในราคา')
  await option.trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
  expect(w.getComponent(CartPanel).props('model').cartSummary.subtotal).toBe(f.shop.catalog.menus.SIMPLE.pricesCents.P/100)
 })
 it('retains but blocks a restored legacy single-group cart whose original binding is unknowable',async()=>{
  const f=fixture();f.shop.catalog.groups.G.min=0
  const original=summaryPreparedMenu(f.shop,f.materials,{...f.shop.catalog.menus.SIMPLE,groupIds:['G']})
  const rebound=summaryPreparedMenu(original.nextShop,original.nextMaterials,{...original.nextShop.catalog.menus.SIMPLE,groupIds:['H']})
  const cart=[{menuId:'SIMPLE',qty:1,optionIds:['A0'],note:'keep old cart'}],key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
  sessionStorage.setItem(key,JSON.stringify({platformId:'P',cart}))
  const w=await mountRealPreview(viewData({...f,shop:rebound.nextShop,materials:rebound.nextMaterials})),model=w.getComponent(CartPanel).props('model')
  expect(model.cart).toHaveLength(1);expect(model.checkoutDisabled).toBe(true)
  const open=w.find('[data-cart-open]');if(open.exists())await open.trigger('click');await flushPromises()
  expect(w.text()).toContain('กรุณาเลือกตัวเลือกใหม่')
  expect(JSON.parse(sessionStorage.getItem(key)).cart).toEqual(cart)
  expect(h.preview.mock.calls.some(([payload])=>payload.lines.some(line=>line.menuId==='SIMPLE'))).toBe(false)
  expect(h.execute).not.toHaveBeenCalled()
 })
 it('keeps restored legacy embedded options working for an ungrouped menu',async()=>{
  const f=fixture(),menu=f.shop.catalog.menus.SIMPLE
  delete menu.groupIds;delete menu.groupId;Object.assign(menu,{optionIds:['A0'],min:0,max:1,priceMode:'addon'})
  const cart=[{menuId:'SIMPLE',qty:1,optionIds:['A0'],note:'legacy embedded option'}],key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
  sessionStorage.setItem(key,JSON.stringify({platformId:'P',cart}))
  const w=await mountRealPreview(viewData(f)),model=w.getComponent(CartPanel).props('model')
  expect(model.cart).toHaveLength(1);expect(model.checkoutDisabled).toBe(false)
  expect(model.cartSummary.subtotal).toBe((menu.pricesCents.P+f.shop.catalog.addonPrices.P.A0)/100)
  expect(JSON.parse(sessionStorage.getItem(key)).cart).toEqual(cart)
 })
})
