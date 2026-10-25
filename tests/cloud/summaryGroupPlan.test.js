import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { groupFixture } from '../firestore/summaryGroupFixture.js'
import { summarySale } from '../firestore/summarySale.js'
import { summaryGroup } from '../firestore/summaryGroup.js'
import { summaryMenu } from '../firestore/summaryCatalog.js'

it.each([['included',13800],['extra',15400]])('uses canonical %s group prices including explicit zero and absent overrides', (mode,total)=>{
  const base=groupFixture({mode}),sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:2,optionIds:['A0','A1','A2']}])
  expect(sale.order.subtotalCents).toBe(total)
  expect(sale.order.lines[0].group).toEqual(base.shop.catalog.groups.G)
})
it('follows a later addon price change for an absent group override',()=>{
  const base=groupFixture({mode:'extra'});base.shop.catalog.addonPrices.P.A2=900;base.shop.catalog.addons.A2.pricesCents.P=900
  const sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A2']}])
  expect(sale.order.subtotalCents).toBe(7800)
})
it('creates a group without mutating stock, recipes or the source state',()=>{
  const base=summaryFixture(),before=structuredClone(base.shop)
  const f=summaryGroup(base.shop,base.materials,{id:'G',name:'Fruit',min:3,max:3,allowRepeat:false,pricingMode:'included',optionIds:['A0','A1','A2'],optionPrices:{P:{A0:500}}})
  expect(base.shop).toEqual(before)
  expect(f.nextShop.catalog.groups.G.optionPrices.P).toEqual({_:0,A0:500})
  expect(f.nextShop.catalog.groups.G.menuIds).toEqual([])
  for(const m of f.nextMaterials){const old=base.materials.find(x=>x.id===m.id);expect(m.stock).toBe(old.stock);expect(m.recipeIndex.addons).toEqual(old.recipeIndex.addons)}
})
it('blocks archiving a bound group',()=>{
  const base=groupFixture()
  expect(()=>summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,active:false})).toThrow('Group is assigned to menus')
})
it('authors repeating groups and multiplies price and material requirements per selection',()=>{
  const base=groupFixture()
  const f=summaryGroup(base.shop,base.materials,{...base.shop.catalog.groups.G,allowRepeat:true,pricingMode:'extra'})
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:2,optionIds:['A0','A0','A2']}])
  expect(sale.order.subtotalCents).toBe(16400)
  expect(sale.order.addonCounts.A0).toBe(4)
  expect(sale.order.addonCounts.A1).toBe(2)
  for(const row of sale.order.inventory){
    const c=f.nextShop.catalog
    expect(row.needed).toBe(2*((c.menus.SIMPLE.recipe[row.materialId]||0)+2*(c.addons.A0.recipe[row.materialId]||0)+(c.addons.A2.recipe[row.materialId]||0)))
  }
})
it('binds another menu and updates only the reverse binding index',()=>{
  const base=groupFixture(),f=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.BANANA,groupId:'G'})
  expect(f.nextShop.catalog.groups.G.menuIds).toEqual(['SIMPLE','BANANA'])
  expect(f.nextShop.catalog.menus.BANANA.optionIds).toEqual([])
  expect(f.nextShop.catalog.groups.G.revision).toBe(1)
})
it('rebinds and unbinds a menu without leaving reverse references',()=>{
  const base=groupFixture();base.shop.catalog.groups.H={...structuredClone(base.shop.catalog.groups.G),id:'H',menuIds:[]};base.shop.catalog.groupIds.push('H')
  const f=summaryMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupId:'H'})
  expect(f.nextShop.catalog.groups.G.menuIds).toEqual([]);expect(f.nextShop.catalog.groups.H.menuIds).toEqual(['SIMPLE'])
  const clear=summaryMenu(f.nextShop,f.nextMaterials,{...f.nextShop.catalog.menus.SIMPLE,groupId:''})
  expect(clear.nextShop.catalog.groups.H.menuIds).toEqual([])
})
