const clone=value=>JSON.parse(JSON.stringify(value))
const omitMaterial=(recipe,id)=>Object.fromEntries(Object.entries(recipe||{}).filter(([key])=>key!==id))
const fields=(row,keys)=>Object.fromEntries(keys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,clone(row[key])]))

// Edit canonical quantities directly: do not round-trip prices/options through
// the editor or retire the menu when removing a warehouse ingredient.
export function detachMaterialCommands(data,materialId){
 const entries=[]
 for(const collection of ['menus','addons'])for(const [id,row] of Object.entries(data.shop.catalog[collection]||{})){
  if(!Object.hasOwn(row.rawRecipe||row.recipe||{},materialId))continue
  const input=fields(row,collection==='menus'?['id','name','active','pricesCents','recipe','rawRecipe','hasPackage','optionIds','min','max','optionPrices','priceMode','groupId','groupIds']:['name','active','pricesCents','recipe','materialIds'])
  input.active=row.active!==false
  if(collection==='menus')input.id=id
  input.recipe=omitMaterial(input.recipe,materialId)
  if(Object.hasOwn(input,'rawRecipe'))input.rawRecipe=omitMaterial(input.rawRecipe,materialId)
  if(input.materialIds)input.materialIds=input.materialIds.filter(id=>id!==materialId)
  const old=data.display?.[collection]?.[id]||{},display={name:input.name||old.name||id,emoji:old.emoji||'',...clone(old)}
  if(Object.hasOwn(input,'name'))input.name=display.name
  entries.push({kind:collection==='menus'?'menu':'addon',payload:{...(collection==='addons'?{entityId:id}:{}),input,display}})
 }
 return entries
}
