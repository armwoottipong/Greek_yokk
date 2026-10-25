import { expect,it } from 'vitest'
import { summaryFixture } from '../firestore/summaryFixture.js'
import { summaryMenu } from '../firestore/summaryCatalog.js'
import { summarySale } from '../firestore/summarySale.js'
it('adds a fifth menu without repurposing existing addon counter slots',()=>{
  const base=summaryFixture(),menu={...structuredClone(base.shop.catalog.menus.SIMPLE),id:'FIFTH',name:'New menu',recipe:{S0:1700,S12:5000,S13:100,S14:100}}
  const f=summaryMenu(base.shop,base.materials,menu)
  expect(f.nextShop.catalog.menuIds).toHaveLength(5)
  expect(f.nextShop.catalog.counterIds).toEqual(base.shop.catalog.counterIds)
  const sale=summarySale(f.nextShop,f.nextMaterials,[{menuId:'FIFTH',qty:2,optionIds:['A0']}])
  expect(sale.order.inventory.find(row=>row.materialId==='S0').needed).toBe(3600)
  expect(sale.order.inventory.find(row=>row.materialId==='S12').needed).toBe(10000)
  expect(sale.order.addonKeys.A0).toBe('A0')
  expect(sale.order.addonCounts.A0).toBe(2)
})
it('increments menu revisions for edits and archives',()=>{
  const base=summaryFixture(),menu={...structuredClone(base.shop.catalog.menus.SIMPLE),name:'Updated',active:false}
  const f=summaryMenu(base.shop,base.materials,menu)
  expect(f.operation.entitySnapshot.revision).toBe(menu.revision+1)
  expect(f.nextMaterials.every(m=>m.recipeIndex.catalogRevision===f.nextShop.catalogRevision)).toBe(true)
  expect(()=>summarySale(f.nextShop,f.nextMaterials,[{menuId:'SIMPLE',qty:1,optionIds:[]}])).toThrow('Invalid line')
})

it('rebuilds derived menu references and verifies the extensible recipe cache',()=>{
  const base=summaryFixture(),menu={...structuredClone(base.shop.catalog.menus.SIMPLE),id:'FIFTH',materialIds:[],choiceMaterials:{A0:['S14']},recipe:{S0:1700}}
  const f=summaryMenu(base.shop,base.materials,menu)
  expect(f.operation.entitySnapshot.choiceMaterials.A0).toEqual(Object.keys(base.shop.catalog.addons.A0.recipe))
  expect(f.operation.entitySnapshot.materialIds).toContain('S0')
  expect(f.nextMaterials[0].recipeIndex.menus.FIFTH).toBe(1700)
})

it('binds six cached calculation operands to the actual receipt lines',()=>{
  const base=summaryFixture(),sale=summarySale(base.shop,base.materials,[{menuId:'SIMPLE',qty:2,optionIds:['A0']}])
  expect(sale.order.lineMenuIds).toEqual(['SIMPLE','_','_','_','_','_'])
  expect(sale.order.lineQtys).toEqual([2,0,0,0,0,0])
  expect(sale.order.lineOptionQuantities).toEqual({L0:{_:0,A0:1},L1:{_:0},L2:{_:0},L3:{_:0},L4:{_:0},L5:{_:0}})
  sale.order.lines[0].optionIds.push('A1')
  expect(sale.order.lineOptionQuantities.L0).toEqual({_:0,A0:1})
})
