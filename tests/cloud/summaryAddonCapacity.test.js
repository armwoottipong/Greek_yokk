import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryAddon,summaryMenu } from '../firestore/summaryCatalog.js'
import { summarySale } from '../firestore/summarySale.js'
it('adds a twelfth addon without deleting or reassigning existing entries',()=>{
  const base=summaryFixture(),f=summaryAddon(base.shop,base.materials,'TWELFTH',{recipe:{S0:250},pricesCents:{P:1200}})
  expect(f.nextShop.catalog.addonIds).toHaveLength(12)
  expect(f.nextShop.catalog.counterIds).toEqual(base.shop.catalog.counterIds)
  expect(f.nextMaterials[0].recipeIndex.addons.TWELFTH).toBe(250)
  const menu=structuredClone(f.nextShop.catalog.menus.SIMPLE);menu.optionIds.push('TWELFTH');menu.optionPrices.P.TWELFTH=1200
  const attached=summaryMenu(f.nextShop,f.nextMaterials,menu,{opId:'ATTACH'})
  const sale=summarySale(attached.nextShop,attached.nextMaterials,[{menuId:'SIMPLE',qty:2,optionIds:['TWELFTH']}])
  expect(sale.order.inventory[0].needed).toBe(3100)
  expect(sale.order.subtotalCents).toBe(16200)
})
it('reports more than eleven distinct selected addons across a whole bill',()=>{
  const base=summaryFixture(),f=summaryAddon(base.shop,base.materials,'TWELFTH',{recipe:{},pricesCents:{P:0}})
  const menu={...f.nextShop.catalog.menus.SIMPLE,optionIds:[...f.nextShop.catalog.addonIds],optionPrices:{P:{...f.nextShop.catalog.menus.SIMPLE.optionPrices.P,TWELFTH:0}}}
  const attached=summaryMenu(f.nextShop,f.nextMaterials,menu)
  expect(()=>summarySale(attached.nextShop,attached.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:base.shop.catalog.addonIds},{menuId:'SIMPLE',qty:1,optionIds:['TWELFTH']}])).toThrow('Unsupported distinct addons per sale')
})
