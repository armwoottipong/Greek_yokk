import {summaryMenuQuantity} from './model/recipe.js'
import {summaryCatalog,summaryAddon} from './model/catalog.js'
import {summaryPreparedMenu} from './model/catalogMenu.js'
import {summaryGroup} from './model/catalogGroup.js'
const fail=code=>Object.assign(new Error(code),{code})
const map=x=>x&&typeof x==='object'&&!Array.isArray(x)
const integer=(n,min=0,max=1000000000)=>Number.isSafeInteger(n)&&n>=min&&n<=max
const keys=(x,allowed)=>map(x)&&Object.keys(x).every(k=>allowed.includes(k))
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,200}$/.test(x)&&x!=='_'
const list=(x,allowed,max)=>Array.isArray(x)&&x.length<=max&&new Set(x).size===x.length&&x.every(k=>allowed.includes(k))
function prices(value,platforms){return map(value)&&Object.keys(value).length===platforms.length&&platforms.every(p=>integer(value[p]))}
function recipe(value,ids,materials){return map(value)&&Object.entries(value).every(([k,q])=>ids.includes(k)&&integer(q)&&!materials.find(m=>m.id===k)?.deleted)}
function validate(kind,input,c,materials,registry){
 const base=map(input)&&typeof input.active==='boolean'&&(!Object.hasOwn(input,'name')||typeof input.name==='string'&&input.name.trim().length>0&&input.name===input.name.trim()&&input.name.length<=120)
 if(!base)throw fail('INVALID_CATALOG_INPUT')
 if(kind==='addon'){
  if(!keys(input,['name','active','recipe','pricesCents','materialIds'])||!recipe(input.recipe,registry,materials)||!prices(input.pricesCents,c.platformIds))throw fail('INVALID_CATALOG_INPUT')
 }else if(kind==='menu'){
  if(!keys(input,['id','name','active','pricesCents','recipe','rawRecipe','hasPackage','optionIds','min','max','optionPrices','priceMode','groupId','groupIds'])||!id(input.id)||!recipe(input.recipe,registry,materials)||!prices(input.pricesCents,c.platformIds)||
   !list(input.optionIds,c.addonIds,45)||!integer(input.min,0,11)||!integer(input.max,input.min,11)||input.max>input.optionIds.length||!['addon','override'].includes(input.priceMode)||!map(input.optionPrices)||Object.keys(input.optionPrices).length!==c.platformIds.length||
   !c.platformIds.every(p=>keys(input.optionPrices[p],input.optionIds.concat('_'))&&Object.keys(input.optionPrices[p]).length===input.optionIds.length+1&&input.optionPrices[p]._===0&&Object.values(input.optionPrices[p]).every(q=>integer(q))))throw fail('INVALID_CATALOG_INPUT')
  if(Object.hasOwn(input,'rawRecipe')&&(!recipe(input.rawRecipe,registry,materials)||typeof input.hasPackage!=='boolean'))throw fail('INVALID_CATALOG_INPUT')
 }else if(kind==='group'){
  if(!keys(input,['id','name','active','min','max','allowRepeat','pricingMode','optionIds','optionPrices'])||!id(input.id)||typeof input.name!=='string'||!input.name.trim()||typeof input.allowRepeat!=='boolean'||!['included','extra'].includes(input.pricingMode)||
   !list(input.optionIds,c.addonIds,45)||input.optionIds.length===0||!integer(input.min,0,11)||!integer(input.max,1,input.allowRepeat?3:11)||input.min>input.max||!input.allowRepeat&&input.min>input.optionIds.length||
   !map(input.optionPrices)||Object.keys(input.optionPrices).length!==c.platformIds.length||!c.platformIds.every(p=>keys(input.optionPrices[p],input.optionIds.concat('_'))&&input.optionPrices[p]._===0&&Object.values(input.optionPrices[p]).every(q=>integer(q))))throw fail('INVALID_CATALOG_INPUT')
 }
}
export function planCatalogCommand(shop,materials,command,uid='preview'){
 const p=command.payload||{},c=shop.catalog
 if(p.expectedRevision!==undefined&&p.expectedRevision!==shop.revision)throw fail('STALE_INVENTORY_DRAFT')
 if(!['menu','addon','group'].includes(command.kind))throw fail('UNKNOWN_COMMAND')
 if(!Array.isArray(c?.summaryMaterials)||c.summaryMaterials.length>16)throw fail('INVALID_CATALOG_STATE')
 const registry=shop.materialIds||materials.map(m=>m.id)
 validate(command.kind,p.input,c,materials,registry)
 if(p.input.active&&['menu','group'].includes(command.kind)&&p.input.optionIds.some(id=>c.addons[id]?.active===false))throw fail('INACTIVE_ADDON')
 if(command.kind==='group'&&c.groups[p.input.id]?.multiMenuIds?.length&&p.input.max>3)throw fail('GROUP_MULTI_MENU_LIMIT')
 if(command.kind==='addon'&&p.input.active===false&&(Object.values(c.menus).some(m=>m.active&&m.optionIds.includes(p.entityId))||Object.values(c.groups).some(g=>g.active&&g.optionIds.includes(p.entityId))))throw fail('ADDON_STILL_REFERENCED')
 const entityId=command.kind==='addon'?p.entityId:p.input.id
 if(!id(entityId))throw fail('INVALID_CATALOG_INPUT')
 const display=p.display
 if(!keys(display,['name','emoji','category','description','deleted'])||!['name','emoji'].every(k=>typeof display[k]==='string')||!display.name.trim()||display.name.length>120||display.emoji.length>64||['category','description'].some(k=>Object.hasOwn(display,k)&&(typeof display[k]!=='string'||display[k].length>1000))||Object.hasOwn(display,'deleted')&&typeof display.deleted!=='boolean'||display.deleted&&p.input.active!==false||Object.hasOwn(p.input,'name')&&p.input.name!==display.name)throw fail('INVALID_CATALOG_DISPLAY')
 let f;const options={opId:command.opId,uid}
 if(command.kind==='menu')f=summaryPreparedMenu(shop,materials,p.input,options)
 else if(command.kind==='group')f=summaryGroup(shop,materials,p.input,options)
 else if(c.addons[entityId])f=summaryCatalog(shop,materials,catalog=>{catalog.addons[entityId]=structuredClone(p.input)},{...options,entity:{collection:'addons',key:entityId}})
 else f=summaryAddon(shop,materials,entityId,p.input,options)
 // Leaf recipe caches are no longer authoritative; admission witnesses prove
 // all declared material quantities against current warehouse records instead.
 f.nextMaterials=[]
 f.nextShop.catalog.recipeRegistryIds=[...registry]
 const entity=f.nextShop.catalog[command.kind==='menu'?'menus':command.kind==='group'?'groups':'addons'][entityId]
 if(command.kind==='menu')entity.baseMaterialIds=Object.keys(entity.rawRecipe||entity.recipe).filter(id=>summaryMenuQuantity(entity,materials.find(m=>m.id===id))>0)
 if(command.kind==='addon')entity.materialIds=Object.keys(entity.recipe).filter(id=>entity.recipe[id]>0)
 if((command.kind==='menu'?entity.baseMaterialIds:command.kind==='addon'?entity.materialIds:[]).length>16)throw fail('RECIPE_MATERIAL_LIMIT')
 f.operation.entitySnapshot=structuredClone(entity)
 f.operation.validationIds=Object.keys(p.input.rawRecipe||p.input.recipe||{}).sort()
 if(f.operation.validationIds.length>16)throw fail('RECIPE_MATERIAL_LIMIT')
 f.checkProofs=f.operation.kind==='addon'?[]:Array.from({length:8},(_,index)=>({index,data:{opId:command.opId}}))
 f.admittedProof={opId:command.opId}
 f.inputProof={opId:command.opId}
 f.operation.input=structuredClone(p.input);f.operation.display=structuredClone(display)
 f.displayChange={collection:command.kind==='group'?'groups':command.kind==='addon'?'addons':'menus',entityId,value:structuredClone(display)}
 return f
}
export function applyCatalogDisplay(display,change){
 const result=structuredClone(display||{});result[change.collection]??={};result[change.collection][change.entityId]=structuredClone(change.value);return result
}
