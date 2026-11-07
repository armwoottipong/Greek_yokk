// @vitest-environment node
import {expect,it} from 'vitest'
import {planChannelCatalog,applyChannelDisplay} from '../../src/cloud/core/model/channelCatalog.js'
import {groupAvailability,encodeGroupAvailability} from '../../src/cloud/core/groupAvailability.js'

const catalog={platformIds:['P','Q'],platforms:{P:{active:true,revision:1,gpBasisPoints:1000},Q:{active:false,revision:2,gpBasisPoints:0}},menuIds:['M'],addonIds:['A'],groupIds:['G'],menus:{M:{pricesCents:{P:1500,Q:0},optionPrices:{P:{_:0},Q:{_:0}},recipe:{R:100}}},addons:{A:{pricesCents:{P:0,Q:500}}},groups:{G:{id:'G',optionIds:['A'],optionPrices:{P:{_:0},Q:{_:0,A:500}}}},addonPrices:{P:{_:0,A:0},Q:{_:0,A:500}}}
const shop={revision:5,catalogRevision:3,catalog},meta={opId:'op',uid:'admin'}
const add={id:'NEW',name:'Delivery',gpBasisPoints:2850,sourceId:'P'}
const plan=(input,root=shop)=>planChannelCatalog(root,{input,expectedRevision:root.revision},meta)

it('creates a paused channel with copied prices and removes a channel without recycling its history label',()=>{
 const added=plan(add),next=added.nextShop.catalog
 expect(next.platforms.NEW).toEqual({active:false,revision:1,gpBasisPoints:2850})
 expect(next.menus.M.pricesCents).toEqual({P:1500,Q:0,NEW:1500})
 expect(next.menus.M.recipe).toEqual({R:100})
 expect(next.addons.A.pricesCents.NEW).toBe(0)
 expect(next.groups.G.optionPrices.NEW).toEqual({_:0})
 const display={platforms:{P:{name:'Store'},Q:{name:'Old'}}}
 const withNew=applyChannelDisplay(display,shop.catalog.platformIds,add)
 const removal={id:'Q'},removed=plan(removal,added.nextShop)
 expect(removed.nextShop.catalog.platformIds).toEqual(['P','NEW'])
 expect(removed.nextShop.catalog.menus.M.pricesCents).toEqual({P:1500,NEW:1500})
 expect(applyChannelDisplay(withNew,next.platformIds,removal).platforms.Q.name).toBe('Old')
 expect(()=>applyChannelDisplay(withNew,next.platformIds,{...add,id:'Q'})).toThrow('CHANNEL_ID_USED')
})

it('retains unset prices after removing a channel and copying one with unset options',()=>{
 const groups={G:{description:'yoggie-option-availability:'+JSON.stringify({unpriced:{0:[0]}})}}
 const p=plan(add),display=applyChannelDisplay({groups,platforms:{}},catalog.platformIds,add)
 const r=plan({id:'Q'},p.nextShop)
 expect(groupAvailability({shop:r.nextShop,display},r.nextShop.catalog.groups.G).unpricedById.A).toEqual(['P','NEW'])
 const edited={...display,groups:{G:{description:encodeGroupAvailability({options:[{addonId:'A',unpricedPlatformIds:['NEW']}]},r.nextShop.catalog.platformIds,display.platformAvailabilityOrder)}}}
 expect(groupAvailability({shop:r.nextShop,display:edited},r.nextShop.catalog.groups.G).unpricedById.A).toEqual(['NEW'])
})

it('rejects a stale draft, a fifth channel and removal of the only active channel',()=>{
 expect(()=>planChannelCatalog(shop,{input:add,expectedRevision:4},meta)).toThrow('STALE_INVENTORY_DRAFT')
 const four=plan({...add,id:'NEW2'},plan(add).nextShop).nextShop
 expect(()=>plan({...add,id:'NEW3'},four)).toThrow('CHANNEL_LIMIT')
 expect(()=>plan({id:'P'})).toThrow('LAST_ACTIVE_CHANNEL')
})
