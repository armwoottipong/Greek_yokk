import {it,expect} from 'vitest'
import {projectMenus,projectMaterial,projectCart} from '../../src/cloud/core/productPresentation.js'
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
