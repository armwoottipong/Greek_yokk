import { describe, it, expect } from 'vitest'
import { material, createTestStore } from '../helpers/createStore'
import { getMaterialKind, buildMaterialUsage, matchesMaterialFilter } from '../../src/domain/materialClassification'

describe('inventory classification and usage', () => {
  it('classifies independently of legacy category names and role flags', () => {
    expect(getMaterialKind(material('M', 0, {category:'Packaging', isSubIngredient:true}))).toBe('normal')
    expect(getMaterialKind(material('O', 0, {hasSubRecipe:true, isSubIngredient:true}))).toBe('produced')
    expect(getMaterialKind(material('P', 0, {inventoryType:'packaging', hasSubRecipe:true}))).toBe('packaging')
  })
  it('marks production inputs immediately on recipe save, without stock changes', () => {
    const s=createTestStore()
    s.materials=[material('RAW'), material('OUT',0,{hasSubRecipe:true,subRecipe:[]})]
    s.menus=[]; s.addons=[]
    expect(s.materialUsageById.get('RAW').production).toEqual([])
    s.materials[1].subRecipe=[{materialId:'RAW',qty:20}]
    expect(s.materialUsageById.get('RAW').production).toEqual([{sourceId:'OUT',sourceName:'OUT',qty:20,unit:'g'}])
    expect(s.materials.map(m=>m.stock)).toEqual([100,0])
  })
  it('retains overlapping roles until their last recipe reference is removed', () => {
    const s=createTestStore()
    s.materials=[material('RAW'),material('O1',0,{hasSubRecipe:true,subRecipe:[{materialId:'RAW',qty:10}]}),material('O2',0,{hasSubRecipe:true,subRecipe:[{materialId:'RAW',qty:5}]})]
    s.addons=[{id:'A',name:'Extra',recipe:[{materialId:'RAW',qty:2}]}]
    s.menus=[{id:'M',name:'Direct',recipe:[{materialId:'RAW',qty:3}]}]
    expect(s.materialUsageById.get('RAW').addon[0].qty).toBe(2)
    expect(s.materialUsageById.get('RAW').menu[0].sourceName).toBe('Direct')
    s.materials[1].subRecipe=[]
    expect(s.materialUsageById.get('RAW').production).toHaveLength(1)
    s.materials[2].subRecipe=[]
    expect(s.materialUsageById.get('RAW').production).toEqual([])
    expect(s.materialUsageById.get('RAW').addon).toHaveLength(1)
  })
  it('counts direct addon usage, aggregates duplicate rows, and keeps inactive saved recipes', () => {
    const materials=[material('RAW'),material('OUT',0,{hasSubRecipe:true,subRecipe:[{materialId:'RAW',qty:10}]})]
    const index=buildMaterialUsage({materials,menus:[],addons:[{id:'A',name:'Extra',isActive:false,recipe:[{materialId:'OUT',qty:2},{materialId:'OUT',qty:3}]}]})
    expect(index.get('OUT').addon[0].qty).toBe(5)
    expect(index.get('RAW').addon).toEqual([])
  })
  it('ignores archived producers and safely skips missing recipe references', () => {
    const index=buildMaterialUsage({materials:[material('RAW'),material('OUT',0,{hasSubRecipe:true,isArchived:true,subRecipe:[{materialId:'RAW',qty:10}]})],menus:[],addons:[{id:'A',recipe:[{materialId:'MISSING',qty:3}]}]})
    expect(index.get('RAW').production).toEqual([])
    expect(index.has('MISSING')).toBe(false)
  })
  it('combines type and usage filters without treating usage as a type', () => {
    const m=material('RAW')
    const usage={production:[{}],addon:[{}],menu:[]}
    expect(matchesMaterialFilter(m,usage,{kind:'normal',role:'addon'})).toBe(true)
    expect(matchesMaterialFilter(m,usage,{kind:'produced',role:'addon'})).toBe(false)
    expect(matchesMaterialFilter(m,usage,{kind:'all',role:'menu'})).toBe(false)
  })
  it('requires a usable production recipe and output quantity before saving a produced item', () => {
    const s=createTestStore();s.materials=[material('RAW')]
    const before=JSON.stringify(s.materials)
    expect(s.saveMaterial(material('NEW',0,{hasSubRecipe:true,yieldQty:20,subRecipe:[]})).ok).toBe(false)
    expect(s.saveMaterial(material('NEW',0,{hasSubRecipe:true,yieldQty:0,subRecipe:[{materialId:'RAW',qty:10}]})).ok).toBe(false)
    expect(JSON.stringify(s.materials)).toBe(before)
  })
})
