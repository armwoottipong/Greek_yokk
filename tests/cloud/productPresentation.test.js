import {it,expect} from 'vitest'
import {projectMenus,projectMaterial,projectCart,projectReceipt} from '../../src/cloud/core/productPresentation.js'
import {catalogPlatforms} from '../../src/cloud/core/catalogPresentation.js'

it('preserves active flags and canonical labels at the shared management boundary',()=>{
 const d={shop:{catalog:{platformIds:['P','OFF'],platforms:{P:{active:true,gpBasisPoints:0},OFF:{active:false,gpBasisPoints:3000}},menus:{M:{id:'M',name:'Saved name',active:true,pricesCents:{P:100}}}}},display:{menus:{},platforms:{}}}
 expect(catalogPlatforms(d)).toMatchObject([{id:'P',isActive:true},{id:'OFF',isActive:false}])
 expect(projectMenus(d)[0].name).toBe('Saved name')
 d.display.menus.M={deleted:true}
 expect(projectMenus(d)).toEqual([])
})
it('retains a renderable cart when its menu has been removed on another device',()=>{
 const d={shop:{catalog:{menus:{},addons:{},groups:{},addonPrices:{}}},display:{menus:{},addons:{}}}
 expect(()=>projectCart([{menuId:'M',qty:1,selections:[{id:'A',groupId:'G'}]}],d)).not.toThrow()
})
it('uses frozen receipt group prices and names after the live catalog is changed',()=>{
 const d=structuredClone(data)
 d.display.platforms={P:{name:'Counter'}};d.materials=[]
 d.shop.catalog.groups.G.pricingMode='extra';d.shop.catalog.groups.G.optionPrices={P:{A:9900}}
 const receipt={opId:'SALE',platformId:'P',status:'committed',subtotalCents:8900,gpCents:0,netCents:8900,ingredientCostCents:100,grossProfitCents:8800,createdAt:{seconds:1},lines:[{menuId:'M',qty:1,totalCents:8900,catalog:{name:'Original bowl'},groupSelections:{G:{_:0,A:1}},groups:{G:{name:'Original group',pricingMode:'extra',optionPrices:{P:{A:2000}}}}}]}
 const row=projectReceipt(receipt,d)
 expect(row.items[0]).toMatchObject({menuName:'Original bowl',selectedAddons:[{price:20,groupName:'Original group'}]})
 d.shop.catalog.menus={};d.shop.catalog.groups={}
 expect(()=>projectReceipt(receipt,d)).not.toThrow()
 expect(projectReceipt(receipt,d).items[0].selectedAddons[0].price).toBe(20)
})
it('does not invent a historical addon price when the old receipt did not store it',()=>{
 const d=structuredClone(data);d.display.platforms={};d.materials=[]
 const receipt={opId:'OLD',platformId:'P',createdAt:{seconds:1},lines:[{menuId:'M',qty:1,totalCents:6900,catalog:{name:'Saved'},optionIds:['A']}]}
 expect(projectReceipt(receipt,d).items[0].selectedAddons[0].price).toBeNull()
})
it('projects a lot pack price from cents without replacing its explicit zero cost',()=>{
 const m={id:'I',stock:100,minAlertQ:0,unitCost:4,packSize:10,lotIds:['L'],lotQty:{L:100},lots:{L:{qty:100,unitCost:0,packCostCents:0}}}
 expect(projectMaterial(m).lots[0]).toMatchObject({qty:1,unitCost:0,packCost:0})
})
const data={shop:{catalog:{platforms:{P:{active:true}},menus:{M:{id:'M',active:true,pricesCents:{P:6900},groupId:'G'}},groups:{G:{id:'G',pricingMode:'included',optionIds:['A']}},addonPrices:{P:{A:1500}}}},display:{menus:{M:{name:'ชาม',emoji:'🥣'}},addons:{A:{name:'ผลไม้',emoji:'🍓'}}}}
it('projects catalogue labels with baht prices without modifying canonical cents',()=>{
 expect(projectMenus(data)[0]).toMatchObject({id:'M',name:'ชาม',emoji:'🥣',prices:{P:69},hasAddons:true})
 expect(data.shop.catalog.menus.M.pricesCents.P).toBe(6900)
})
it('converts material quantity, alerts and lot balances exactly once',()=>{
 const m={id:'I',stock:12345,minAlertQ:500,unitCost:.05,packSize:1000,packCostCents:5000,productionRecipe:{},lotIds:['L'],lots:{L:{id:'L',qty:12345,expiryDay:999999,receiveDay:20000}},lotQty:{L:12000}}
 expect(projectMaterial(m)).toMatchObject({stock:123.45,minAlert:5,packCost:50,hasSubRecipe:true,lots:[{qty:120,expiryDate:''}]})
 expect(m.stock).toBe(12345)
})
it('keeps included and repeated option prices consistent with canonical groups',()=>{
 const rows=projectCart([{menuId:'M',qty:2,optionIds:['A'],note:'x'}],data)
 expect(rows[0]).toMatchObject({menu:{name:'ชาม'},qty:2,note:'x',selectedAddons:[{id:'A',name:'ผลไม้',prices:{P:0},selectionQty:1}]})
 data.shop.catalog.menus.M.groupIds=['G','H'];data.shop.catalog.groups.H={id:'H',pricingMode:'extra',optionPrices:{P:{A:1000}}}
 const repeated=projectCart([{menuId:'M',qty:1,selections:[{groupId:'H',id:'A',selectionQty:2}]}],data)
 expect(repeated[0].selectedAddons[0]).toMatchObject({selectionQty:2,prices:{P:10}})
})
