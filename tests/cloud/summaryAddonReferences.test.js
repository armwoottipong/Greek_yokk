import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryCatalog } from '../firestore/summaryCatalog.js'

it('refreshes every referencing menu when addon ingredient keys change',()=>{
  const base=summaryFixture(),before=structuredClone(base.shop.catalog.menus)
  const f=summaryCatalog(base.shop,base.materials,c=>{c.addons.A10.recipe={S14:450}})
  for(const id of ['SIMPLE','BANANA','CRUNCH']){
    const menu=f.nextShop.catalog.menus[id]
    expect(menu.choiceMaterials.A10).toEqual(['S14'])
    expect(menu.materialIds).toContain('S14')
    expect(menu.materialIds).toEqual(expect.arrayContaining(before[id].materialIds))
    expect(menu.pricesCents).toEqual(before[id].pricesCents)
    expect(menu.optionPrices).toEqual(before[id].optionPrices)
  }
  expect(f.nextShop.catalog.menus.FRUIT).toEqual(before.FRUIT)
  expect(base.shop.catalog.menus).toEqual(before)
})
