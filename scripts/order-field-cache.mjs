// Reuse repeated receipt expressions; retain all predicates and their order.
export const orderFieldCache=[
 ['orderMaterialCount','o.materialIds.size()'],
 ['orderAddonKeySet','o.addonKeys.keys().toSet()'],
 ['orderSelectedAddons',"o.addonKeys.values().removeAll(['_'])"],
 ['orderAddonValues','o.addonKeys.values()'],
 ['orderShortageKeys','o.approvedShortages.keys()'],
 ['orderLineCount','o.lines.size()'],
 ['orderRowCount','o.inventory.size()']
]
export function cacheOrderFields(body){
 const start=body.indexOf('return ')
 if(start<0)throw Error('Receipt validator return missing')
 let predicate=body.slice(start)
 const bindings=[]
 for(const [name,expression] of orderFieldCache){
  if(!predicate.includes(expression))continue
  predicate=predicate.split(expression).join(name)
  bindings.push(`let ${name}=${expression};`)
 }
 // The receipt already has two bindings (root and platform); Rules allow ten.
 if(bindings.length>8)throw Error('Receipt local binding limit')
 return body.slice(0,start)+bindings.join('\n')+'\n'+predicate
}
