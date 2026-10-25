import { summaryGroupWithLimit } from './summaryGroup.js'
export function summaryPreparedGroup(shop,materials,input,options={}){
  const old=shop.catalog.groups?.[input.id],canonical=structuredClone(input)
  delete canonical.multiMenuIds
  if(old?.multiMenuIds)canonical.multiMenuIds=[...old.multiMenuIds]
  if(old?.multiMenuIds?.length&&input.max>3)throw new Error('Multi-group selection limit')
  return summaryGroupWithLimit(shop,materials,canonical,options,11)
}
