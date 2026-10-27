import {encodeLegacyId as key} from '../src/cloud/paths.js'
import {it,expect} from 'vitest'
import {compileCoreImport} from '../scripts/core-import.js'
import {coreSource} from './fixtures/coreSource.js'
import {planInventoryCommand} from '../src/cloud/core/inventoryPlan.js'
import {applyCatalogDisplay} from '../src/cloud/core/catalogPlan.js'
export function catalogBase(source=coreSource()){
 const f=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_catalog',sourceSha256:'a'.repeat(64)})
 return {shop:f.shop,materials:f.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data),display:f.documents.find(d=>d.path.endsWith('/display/catalog')).data}
}
export const addon=(id='NEW')=>({kind:'addon',opId:`ADD_${id}`,payload:{entityId:id,input:{name:id,active:true,recipe:{[key('M0')]:100},pricesCents:{[key('P')]:1000}},display:{name:id,emoji:'',category:'Fruit'}}})
export const group=id=>({kind:'group',opId:`GROUP_${id}`,payload:{input:{id,name:id,active:true,allowRepeat:false,pricingMode:'extra',min:0,max:3,optionIds:['NEW'],optionPrices:{[key('P')]:{_:0,NEW:100}}},display:{name:id,emoji:''}}})
export const menu=()=>({kind:'menu',opId:'MENU',payload:{input:{id:'NEW_MENU',name:'New menu',active:true,pricesCents:{[key('P')]:6900},rawRecipe:{[key('M0')]:100},hasPackage:true,recipe:{[key('M0')]:100},optionIds:[],min:0,max:0,priceMode:'addon',optionPrices:{[key('P')]:{_:0}},groupIds:['G','H']},display:{name:'New menu',emoji:'',description:'Two choices'}}})
export function advance(base,command){const f=planInventoryCommand(base.shop,base.materials,command,'cashier');return {shop:f.nextShop,materials:base.materials.map(m=>f.nextMaterials.find(n=>n.id===m.id)||m),display:applyCatalogDisplay(base.display,f.displayChange)}}
it('plans two bound groups without mutating input and refreshes every registry cache',()=>{
 const source=coreSource();source.materials.push({...source.materials[0],id:'IDLE',name:'Idle',lots:[{id:'IDLE_LOT',qty:1000,isInUse:true}]})
 let b=catalogBase(source),before=structuredClone(b)
 b=advance(b,addon());expect(before.shop.catalog.addonIds).toEqual([])
 for(const id of ['G','H'])b=advance(b,group(id))
 b=advance(b,menu());expect(b.shop.catalog.menus.NEW_MENU.groupIds).toEqual(['G','H'])
 expect(b.shop.catalog.groups.G.multiMenuIds).toEqual(['NEW_MENU'])
 expect(b.materials.every(m=>m.recipeIndex.catalogRevision===b.shop.catalogRevision)).toBe(true)
 expect(b.materials.find(m=>m.id===key('IDLE')).recipeIndex.menus.NEW_MENU).toBe(0)
 expect(b.display.menus.NEW_MENU.description).toBe('Two choices')
 const retire=addon();retire.payload.input.active=false;retire.payload.display.deleted=true
 expect(()=>advance(b,retire)).toThrow('ADDON_STILL_REFERENCED')
})
it('supports an addon beyond eleven legacy slots, immutable receipt data and stale draft fencing',()=>{
 let b=catalogBase();for(let i=0;i<12;i++)b=advance(b,addon(`A${i}`))
 const c=addon('A11');c.opId='EDIT';c.payload.input.pricesCents[key('P')]=1500;c.payload.expectedRevision=b.shop.revision
 const f=planInventoryCommand(b.shop,b.materials,c,'cashier');expect(f.operation.counterIndex).toBe(-1)
 expect(f.operation.input).toEqual(c.payload.input);expect(f.operation.display).toEqual(c.payload.display)
 expect(()=>planInventoryCommand({...b.shop,revision:b.shop.revision+1},b.materials,c)).toThrow('STALE_INVENTORY_DRAFT')
 c.payload.display.forged=true;expect(()=>planInventoryCommand(b.shop,b.materials,c)).toThrow('INVALID_CATALOG_DISPLAY')
})
