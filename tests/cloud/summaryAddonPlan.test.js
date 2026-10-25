import { expect,it } from 'vitest'
import { summaryAddon } from '../firestore/summaryCatalog.js'
import { addonVacancy } from '../firestore/summaryAddonFixture.js'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summarySale } from '../firestore/summarySale.js'

it('creates an addon in a vacant slot and rebuilds all material coefficients atomically',()=>{
  const base=addonVacancy(),before=structuredClone(base.shop)
  const f=summaryAddon(base.shop,base.materials,'NEW',{name:'New topping',recipe:{S0:250,S11:100},pricesCents:{P:1200}})
  expect(base.shop).toEqual(before)
  expect(f.nextShop.catalog.counterIds[14]).toBe('NEW')
  expect(f.nextShop.catalog.addonPrices.P.NEW).toBe(1200)
  expect(f.nextMaterials[0].recipeIndex.quantities[14]).toBe(250)
  expect(f.nextMaterials[11].recipeIndex.quantities[14]).toBe(100)
  expect(f.nextMaterials.every(m=>m.recipeIndex.catalogRevision===f.nextShop.catalogRevision)).toBe(true)
  expect(f.nextShop.catalog.menus).toEqual(base.shop.catalog.menus)
})
it('reports a full experimental profile instead of losing an existing addon',()=>{
  const base=summaryFixture()
  for(let i=11;i<64;i++){const id=`A${i}`;base.shop.catalog.addonIds.push(id);base.shop.catalog.addons[id]={recipe:{},pricesCents:{P:0}}}
  expect(()=>summaryAddon(base.shop,base.materials,'NEW',{recipe:{},pricesCents:{P:0}})).toThrow('Unsupported addon count')
})
it.each(['_','bad/id',''])('rejects invalid addon id %j',id=>{
  const base=addonVacancy()
  expect(()=>summaryAddon(base.shop,base.materials,id,{recipe:{},pricesCents:{P:0}})).toThrow('Invalid addon')
})
it('blocks inactive addon selections before preparing a sale',()=>{
  const base=summaryFixture();base.shop.catalog.addons.A0.active=false
  expect(()=>summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:1,optionIds:['A0']}])).toThrow('Invalid line')
})
