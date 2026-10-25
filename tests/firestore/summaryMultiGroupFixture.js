import { groupFixture } from './summaryGroupFixture.js'
export function multiGroupFixture(options={}){
  const base=groupFixture({...options,mode:options.mode||'included'}),c=base.shop.catalog
  c.groups.G.max=3
  c.groups.H={...structuredClone(c.groups.G),id:'H',name:'Extra choices',pricingMode:'extra',min:0,max:3,allowRepeat:true}
  c.groupIds.push('H');for(const g of Object.values(c.groups))g.multiMenuIds=['SIMPLE']
  delete c.menus.SIMPLE.groupId;c.menus.SIMPLE.groupIds=['G','H']
  return base
}
