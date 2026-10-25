import { serverTimestamp } from 'firebase/firestore'
import { groupFixture } from './summaryGroupFixture.js'

// Independent hand-built oracle; no platform planner is used here.
export function platformFixture({dense=false,platforms=1}={}){
  const base=groupFixture({mode:'extra',options:dense?45:6,platforms,fourLots:true}),c=base.shop.catalog
  if(dense){
    while(c.menuIds.length<64){const id=`PM${c.menuIds.length}`;c.menuIds.push(id);c.menus[id]={...structuredClone(c.menus.SIMPLE),id}}
    c.groups.G.menuIds=[...c.menuIds]
    while(c.addonIds.length<64){const id=`A${c.addonIds.length}`;c.addonIds.push(id);c.addons[id]=structuredClone(c.addons.A0);for(const p of c.platformIds)c.addonPrices[p][id]=c.addons[id].pricesCents[p]}
    while(c.groupIds.length<64){const id=`PG${c.groupIds.length}`;c.groupIds.push(id);c.groups[id]={...structuredClone(c.groups.G),id,menuIds:[]}}
    for(const m of base.materials){
      m.recipeIndex.menus={_:0,...Object.fromEntries(c.menuIds.map(id=>[id,c.menus[id].recipe[m.id]||0]))}
      m.recipeIndex.addons={_:0,...Object.fromEntries(c.addonIds.map(id=>[id,c.addons[id].recipe[m.id]||0]))}
    }
  }
  const id='DELIVERY',source='P',opId='NEW-PLATFORM',catalog=structuredClone(c)
  const platform={revision:1,active:true,gpBasisPoints:3250,name:'Delivery',emoji:'🛵'}
  catalog.platformIds.push(id);catalog.platforms[id]=platform;catalog.addonPrices[id]=structuredClone(c.addonPrices[source])
  for(const m of Object.values(catalog.menus)){m.pricesCents[id]=m.pricesCents[source];m.optionPrices[id]=structuredClone(m.optionPrices[source])}
  for(const a of Object.values(catalog.addons))a.pricesCents[id]=a.pricesCents[source]
  for(const g of Object.values(catalog.groups))g.optionPrices[id]=structuredClone(g.optionPrices[source])
  const nextShop={...structuredClone(base.shop),catalog,revision:base.shop.revision+1,lastOpId:opId,lastOpKind:'platform'}
  const nextMaterials=[]
  const operation={schemaVersion:2,kind:'platform',status:'committed',opId,uid:'cashier',createdAt:serverTimestamp(),entityId:id,create:true,sourcePlatformId:source,
    beforePlatform:{},entitySnapshot:structuredClone(platform),sourceCatalogRevision:base.shop.catalogRevision,shopRevision:nextShop.revision,materialIds:[]}
  return {base,f:{nextShop,nextMaterials,operation}}
}
