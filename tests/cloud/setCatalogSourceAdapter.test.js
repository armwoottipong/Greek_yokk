// @vitest-environment node
import { expect, it } from 'vitest'
import { sourceSetFixture } from '../firestore/setCatalogSourceAdapter.js'
import { normalizeDatabase } from '../../src/domain/database.js'
import { getEffectiveRequirements } from '../../src/domain/inventory.js'
import { encodeLegacyId } from '../../src/cloud/paths.js'
import { prepareStockMaterial } from '../firestore/setStockInFixture.js'

function snapshot({ duplicate = false, hasPackage = true } = {}) {
  return { schemaVersion:4,revision:0,
    materials: ['ingredient','packaging'].map((inventoryType,i) => ({ id:`M${i}`,name:`Material ${i}`,inventoryType,stock:100,unitCost:0.2,
      lots:[{id:`L${i}`,qty:100,isInUse:true}] })),
    menus:[{id:'MENU',name:'Menu',isActive:true,hasAddons:false,hasPackage,prices:{P:69},
      recipe:[{materialId:'M0',qty:1},...(duplicate ? [{materialId:'M0',qty:2}] : []),{materialId:'M1',qty:1}]}],
    addons:[],addonGroups:[],platforms:[{id:'P',gpPercent:0,isActive:true}],orders:[],activityLogs:[],stockShortages:[],
    categories:{menu:[],material:[],addon:[]},gasApiUrl:'',
  }
}

it.each([
  ['duplicate menu materials',{duplicate:true}],
  ['menu packaging opt-out',{hasPackage:false}],
])('preserves domain requirements for %s', (_,options) => {
  const raw = snapshot(options), original = structuredClone(raw)
  const normalized = normalizeDatabase(raw,{source:'import'}).value
  const expected = getEffectiveRequirements(normalized.menus[0],[],1,normalized.materials)
    .map(row => ({materialId:encodeLegacyId(row.materialId),needed:Math.round(row.qty*100)}))
  const f = sourceSetFixture(raw)
  expect(f.order.inventory.filter(row => row.needed > 0).map(({materialId,needed}) => ({materialId,needed}))).toEqual(expected)
  expect(raw).toEqual(original)
})

it.each(['menu','addon','legacy addon'])('rejects unsupported raw %s recipe precision before normalization rounds it', kind => {
  const raw = snapshot()
  if (kind === 'menu') raw.menus[0].recipe[0].qty = 0.005
  else if (kind === 'addon') raw.addons = [{id:'ADDON',name:'Addon',isActive:true,prices:{P:1},recipe:[{materialId:'M0',qty:0.005}]}]
  else { raw.schemaVersion = 3; raw.addons = [{id:'ADDON',name:'Addon',isActive:true,prices:{P:1},materialId:'M0',amountUsed:0.005}] }
  expect(() => sourceSetFixture(raw)).toThrow('Unsupported source precision')
})

it.each([200,undefined])('preserves original lot initial quantity %s independently from remaining stock',initialQty=>{
  const raw=snapshot()
  if(initialQty!==undefined)raw.materials[0].lots[0].initialQty=initialQty
  const f=sourceSetFixture(raw),m=prepareStockMaterial(f.materials[0])
  expect(m.lots[m.lotIds[0]].initialQtyQ).toBe((initialQty??0)*100)
})
