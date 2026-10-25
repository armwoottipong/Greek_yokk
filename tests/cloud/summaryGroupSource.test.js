// @vitest-environment node
import { expect,it } from 'vitest'
import { sourceSummaryFixture } from '../firestore/summarySourceAdapter.js'
import { summarySale } from '../firestore/summarySale.js'
import { encodeLegacyId as key } from '../../src/cloud/paths.js'
function snapshot(mode='included'){
  return {schemaVersion:4,revision:0,materials:Array.from({length:15},(_,i)=>({id:`M${i}`,name:`Material ${i}`,inventoryType:'ingredient',stock:1000,unitCost:0.2,lots:[{id:`L${i}`,qty:1000,isInUse:true}]})),
    menus:[{id:'MENU',name:'Menu',isActive:true,hasAddons:true,hasPackage:true,prices:{P:69},addonGroupIds:['GROUP'],recipe:Array.from({length:15},(_,i)=>({materialId:`M${i}`,qty:1}))}],
    addons:Array.from({length:6},(_,i)=>({id:`ADD${i}`,name:`Addon ${i}`,isActive:true,prices:{P:i+1},recipe:[{materialId:`M${i}`,qty:1}]})),
    addonGroups:[{id:'GROUP',name:'Fruit choices',minSelections:3,maxSelections:3,allowRepeat:false,pricingMode:mode,options:Array.from({length:6},(_,i)=>({addonId:`ADD${i}`,...(i===0?{prices:{P:0}}:{})}))}],
    platforms:[{id:'P',gpPercent:0,isActive:true}],orders:[],activityLogs:[],stockShortages:[],categories:{menu:[],material:[],addon:[]},gasApiUrl:''}
}
it.each(['included','extra'])('preserves source %s group IDs, rules, sparse overrides and sale amounts',mode=>{
  const raw=snapshot(mode),before=structuredClone(raw),f=sourceSummaryFixture(raw),g=f.shop.catalog.groups[key('GROUP')]
  expect(g.optionIds).toHaveLength(6);expect(g.menuIds).toEqual([key('MENU')]);expect(g.min).toBe(3);expect(g.max).toBe(3)
  expect(g.optionPrices[key('P')]).toEqual({_:0,[key('ADD0')]:0})
  expect(f.order.lines[0].group).toEqual(g)
  const sale=summarySale(f.shop,f.materials,[{menuId:key('MENU'),qty:1,optionIds:[key('ADD0'),key('ADD1'),key('ADD2')]}],{platformId:key('P')})
  expect(sale.order.subtotalCents).toBe(mode==='included'?6900:7400)
  expect(sale.order.subtotalCents).toBe(f.order.subtotalCents);expect(raw).toEqual(before)
})
it('rejects unsupported raw override precision even when included pricing would hide it',()=>{
  const raw=snapshot();raw.addonGroups[0].options[0].prices.P=0.005
  expect(()=>sourceSummaryFixture(raw)).toThrow('Unsupported group price precision')
})
it('preserves a repeating source group and counts all three identical selections',()=>{
  const raw=snapshot('extra');raw.addonGroups[0].allowRepeat=true;raw.addonGroups[0].options=[{addonId:'ADD1'}]
  const before=structuredClone(raw),f=sourceSummaryFixture(raw)
  expect(f.shop.catalog.groups[key('GROUP')].allowRepeat).toBe(true)
  expect(f.order.lines[0].optionQuantities).toEqual({_:0,[key('ADD1')]:3})
  expect(f.order.subtotalCents).toBe(7500)
  expect(f.order.inventory.find(row=>row.materialId===key('M1')).needed).toBe(400)
  expect(raw).toEqual(before)
})
