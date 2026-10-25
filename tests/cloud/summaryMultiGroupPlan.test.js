import { expect,it } from 'vitest'
import { multiGroupFixture } from '../firestore/summaryMultiGroupFixture.js'
import { summaryMultiGroupSale } from '../firestore/summaryMultiGroupSale.js'
import { summaryPreparedMenu } from '../firestore/summaryPreparedMenu.js'
import { summaryPreparedGroup } from '../firestore/summaryPreparedGroup.js'
import { summaryCatalog } from '../firestore/summaryCatalog.js'
it('preserves group identities and aggregates the same addon across included and extra groups',()=>{
  const base=multiGroupFixture();base.shop.catalog.groups.G.allowRepeat=true
  const before=structuredClone(base.shop)
  const sale=summaryMultiGroupSale(base.shop,base.materials,[{menuId:'SIMPLE',qty:2,selections:[
    {groupId:'G',id:'A0',selectionQty:2},{groupId:'G',id:'A2',selectionQty:1},{groupId:'H',id:'A0',selectionQty:1},
  ]}])
  const l=sale.order.lines[0]
  expect(l.groupSelections).toEqual({G:{_:0,A0:2,A2:1},H:{_:0,A0:1}})
  expect(l.optionQuantities).toEqual({_:0,A0:3,A2:1})
  expect(l.groups).toEqual(base.shop.catalog.groups)
  expect(sale.order.subtotalCents).toBe(14800)
  expect(sale.order.addonCounts.A0).toBe(6)
  expect(sale.order.addonCounts.A1).toBe(2)
  for(const row of sale.order.inventory){const c=base.shop.catalog;expect(row.needed).toBe(2*((c.menus.SIMPLE.recipe[row.materialId]||0)+3*(c.addons.A0.recipe[row.materialId]||0)+(c.addons.A2.recipe[row.materialId]||0)))}
  expect(sale.order.proofMode).toBe('prepared');expect(base.shop).toEqual(before)
})
it('requires the structural menu command for a multi-group binding change',()=>{
  const base=multiGroupFixture()
  expect(()=>summaryCatalog(base.shop,base.materials,c=>{c.menus.SIMPLE.groupIds=['G']})).toThrow('Use menu command for group binding')
})
it('authors eleven-unit single groups but keeps multi-bound groups at three units',()=>{
  const base=multiGroupFixture(),input={...base.shop.catalog.groups.G,allowRepeat:true,max:11}
  expect(()=>summaryPreparedGroup(base.shop,base.materials,input)).toThrow('Multi-group selection limit')
  const clear=summaryPreparedMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupIds:[]})
  const f=summaryPreparedGroup(clear.nextShop,clear.nextMaterials,input)
  expect(f.nextShop.catalog.groups.G.max).toBe(11);expect(f.nextShop.catalog.groups.G.multiMenuIds).toEqual([])
})
it('unbinds and rebinds two groups while preserving exact reverse indexes',()=>{
  const base=multiGroupFixture()
  for(const g of Object.values(base.shop.catalog.groups))g.multiMenuIds=['SIMPLE']
  const clear=summaryPreparedMenu(base.shop,base.materials,{...base.shop.catalog.menus.SIMPLE,groupIds:[]})
  for(const g of Object.values(clear.nextShop.catalog.groups)){expect(g.menuIds).toEqual([]);expect(g.multiMenuIds).toEqual([])}
  const bound=summaryPreparedMenu(clear.nextShop,clear.nextMaterials,{...clear.nextShop.catalog.menus.SIMPLE,groupIds:['G','H']})
  expect(bound.nextShop.catalog.menus.SIMPLE.groupIds).toEqual(['G','H'])
  for(const g of Object.values(bound.nextShop.catalog.groups)){expect(g.menuIds).toEqual(['SIMPLE']);expect(g.multiMenuIds).toEqual(['SIMPLE'])}
})
