// Canonical declarations remain references even when a menu/group is inactive
// or packaging is disabled. Old leaf caches are performance data, not authority.
export function hasDeclaredMaterial(shop,id){
 const c=shop.catalog
 return Object.values(c.menus).some(m=>Object.hasOwn(m.rawRecipe||m.recipe,id))||Object.values(c.addons).some(a=>Object.hasOwn(a.recipe,id))
}
