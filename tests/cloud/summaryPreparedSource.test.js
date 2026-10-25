// @vitest-environment node
import { expect,it } from 'vitest'
import { sourcePreparedFixture,projectMaterialMetadata } from '../firestore/summaryPreparedSource.js'
import { encodeLegacyId as key } from '../../src/cloud/paths.js'
function snapshot(){
  return {schemaVersion:4,revision:0,materials:Array.from({length:15},(_,i)=>({id:`M${i}`,name:`Material ${i}`,inventoryType:'ingredient',stock:1000,unitCost:0.2,lots:[{id:`L${i}`,qty:1000,isInUse:true}]})),
    menus:[{id:'MENU',name:'Menu',isActive:true,hasAddons:true,hasPackage:true,prices:{P:69},addonGroupIds:['G','H'],recipe:Array.from({length:15},(_,i)=>({materialId:`M${i}`,qty:1}))}],
    addons:[{id:'ADD',name:'Addon',isActive:true,prices:{P:2},recipe:[{materialId:'M0',qty:1}]}],
    addonGroups:[{id:'G',name:'Included',minSelections:3,maxSelections:3,allowRepeat:true,pricingMode:'included',options:[{addonId:'ADD'}]},
      {id:'H',name:'Extra',minSelections:1,maxSelections:3,allowRepeat:true,pricingMode:'extra',options:[{addonId:'ADD'}]}],
    platforms:[{id:'P',gpPercent:0,isActive:true}],orders:[],activityLogs:[],stockShortages:[],categories:{menu:[],material:[],addon:[]},gasApiUrl:''}
}
it('preserves optional material fields and legacy category records without changing source or inferring types',()=>{
  const raw=snapshot(),m=raw.materials[0]
  Object.assign(m,{category:'Packaging',packUnit:'  กล่อง  ',shelfLifeDays:1.25,isSubIngredient:false,unit:'g',emoji:'🥣',minAlert:1.25})
  raw.categories.material=[{id:'LEGACY',name:'Packaging',label:'Legacy label',icon:'📦',dateTrackingMode:'expiry_and_receive'}]
  const before=structuredClone(raw),f=sourcePreparedFixture(raw),saved=f.materials.find(row=>row.id===key(m.id))
  expect(saved).toMatchObject({category:'Packaging',packUnit:'  กล่อง  ',shelfLifeDays:1.25,isSubIngredient:false,unit:'g',emoji:'🥣',minAlertQ:125,inventoryType:'ingredient'})
  expect(f.shop.legacyMaterialCategories).toEqual(raw.categories.material);expect(f.nextShop.legacyMaterialCategories).toEqual(raw.categories.material)
  expect(f.nextMaterials.find(row=>row.id===saved.id).packUnit).toBe('  กล่อง  ')
  expect(Object.hasOwn(f.materials[1],'category')).toBe(false);expect(Object.hasOwn(f.materials[1],'shelfLifeDays')).toBe(false)
  expect(raw).toEqual(before)
})
it('keeps null, zero, empty and false metadata without coercion or fallback',()=>{
  expect(projectMaterialMetadata({category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false,minAlert:0})).toEqual({category:null,packUnit:'',shelfLifeDays:0,isSubIngredient:false,minAlertQ:0})
  expect(projectMaterialMetadata({shelfLifeDays:null})).toEqual({shelfLifeDays:null})
  expect(projectMaterialMetadata({})).toEqual({})
})
it('preserves dormant production definitions without enabling their recipes or changing source values',()=>{
  const raw=snapshot(),m=raw.materials[0]
  Object.assign(m,{hasSubRecipe:false,yieldQty:7.25,subRecipe:[{materialId:'M1',qty:1.25}]})
  const before=structuredClone(raw),f=sourcePreparedFixture(raw),saved=f.materials.find(row=>row.id===key(m.id))
  expect(saved.legacyInactiveProduction).toEqual({hasSubRecipe:false,yieldQty:7.25,subRecipe:[{materialId:'M1',qty:1.25}]})
  expect(Object.hasOwn(saved,'productionRecipe')).toBe(false);expect(f.shop.productionUsers[key('M1')]).toEqual([])
  expect(f.nextMaterials.find(row=>row.id===saved.id).legacyInactiveProduction).toEqual(saved.legacyInactiveProduction)
  expect(raw).toEqual(before)
})
it('preserves absent dormant fields and omits the dormant definition for an active recipe',()=>{
  expect(projectMaterialMetadata({hasSubRecipe:false})).toEqual({legacyInactiveProduction:{hasSubRecipe:false}})
  expect(projectMaterialMetadata({yieldQty:0,subRecipe:[]})).toEqual({legacyInactiveProduction:{yieldQty:0,subRecipe:[]}})
  expect(projectMaterialMetadata({hasSubRecipe:true,yieldQty:10,subRecipe:[]})).toEqual({})
})
it.each([{shelfLifeDays:'2'},{shelfLifeDays:100001},{isSubIngredient:null},{packUnit:5},{minAlert:0.001},{name:'n'.repeat(161)}])('stops unsupported source metadata explicitly %j',source=>{
  expect(()=>projectMaterialMetadata(source)).toThrow()
})
it('projects two source groups without merging their identities, prices or repeated units',()=>{
  const raw=snapshot(),before=structuredClone(raw),f=sourcePreparedFixture(raw),line=f.order.lines[0]
  expect(f.shop.catalog.menus[key('MENU')].groupIds).toEqual([key('G'),key('H')])
  expect(line.groupSelections).toEqual({[key('G')]:{_:0,[key('ADD')]:3},[key('H')]:{_:0,[key('ADD')]:1}})
  expect(line.optionQuantities).toEqual({_:0,[key('ADD')]:4})
  expect(f.order.subtotalCents).toBe(7100);expect(f.order.inventory.find(r=>r.materialId===key('M0')).needed).toBe(500)
  for(const g of Object.values(f.shop.catalog.groups)){expect(g.menuIds).toEqual([key('MENU')]);expect(g.multiMenuIds).toEqual([key('MENU')])}
  expect(raw).toEqual(before)
})
it('compiles the complete material registry and production reverse references from source',()=>{
  const raw=snapshot();raw.materials[0].hasSubRecipe=true;raw.materials[0].yieldQty=10;raw.materials[0].subRecipe=[{materialId:'M1',qty:1},{materialId:'M2',qty:2}]
  const f=sourcePreparedFixture(raw)
  expect(f.shop.materialIds).toEqual(f.materials.toSorted((a,b)=>a.costRank-b.costRank).map(m=>m.id))
  expect(f.shop.productionUsers[key('M1')]).toEqual([key('M0')]);expect(f.shop.productionUsers[key('M2')]).toEqual([key('M0')])
  expect(f.shop.productionUsers[key('M0')]).toEqual([])
  expect(f.nextShop.materialIds).toEqual(f.shop.materialIds)
})
it('projects an eleven-unit single group without truncating the source count',()=>{
  const raw=snapshot();raw.menus[0].addonGroupIds=['G'];raw.addonGroups[0].minSelections=11;raw.addonGroups[0].maxSelections=11
  const f=sourcePreparedFixture(raw)
  expect(f.order.lines[0].optionQuantities[key('ADD')]).toBe(11)
  expect(f.order.inventory.find(row=>row.materialId===key('M0')).needed).toBe(1200)
})
it('preserves the declared menu recipe and packaging opt-out alongside effective requirements',()=>{
  const raw=snapshot();raw.materials[14].inventoryType='packaging';raw.menus[0].hasPackage=false
  raw.addons[0].recipe.push({materialId:'M14',qty:1})
  const before=structuredClone(raw),f=sourcePreparedFixture(raw),menu=f.shop.catalog.menus[key('MENU')]
  expect(menu.rawRecipe[key('M14')]).toBe(100)
  expect(menu.hasPackage).toBe(false)
  expect(menu.recipe[key('M14')]||0).toBe(0)
  expect(menu.materialIds).toContain(key('M14'))
  expect(f.order.inventory.find(row=>row.materialId===key('M14')).needed).toBe(400)
  expect(raw).toEqual(before)
})
it('stops explicitly when a hidden declared material falls outside the protected profile',()=>{
  const raw=snapshot();raw.materials.push({...structuredClone(raw.materials[0]),id:'HIDDEN',inventoryType:'packaging',lots:[{id:'HIDDEN-LOT',qty:1000,isInUse:true}]})
  raw.menus[0].hasPackage=false;raw.menus[0].recipe.push({materialId:'HIDDEN',qty:1})
  expect(()=>sourcePreparedFixture(raw)).toThrow('Unsupported declared source material profile')
})
it.each(['third group','multi maximum','single maximum','raw price precision'])('rejects unsupported source %s explicitly',kind=>{
  const raw=snapshot()
  if(kind==='third group'){raw.addonGroups.push({...structuredClone(raw.addonGroups[1]),id:'J'});raw.menus[0].addonGroupIds.push('J')}
  if(kind==='multi maximum')raw.addonGroups[1].maxSelections=4
  if(kind==='single maximum'){raw.menus[0].addonGroupIds=['G'];raw.addonGroups[0].maxSelections=12}
  if(kind==='raw price precision')raw.addonGroups[0].options[0].prices={P:0.005}
  expect(()=>sourcePreparedFixture(raw)).toThrow(/Unsupported/)
})
