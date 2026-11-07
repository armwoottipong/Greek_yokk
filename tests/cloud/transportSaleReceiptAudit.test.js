// @vitest-environment node
import {beforeEach,it,expect,vi} from 'vitest'
import {groupFixture} from '../firestore/summaryGroupFixture.js'
import {multiGroupFixture} from '../firestore/summaryMultiGroupFixture.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'

const h=vi.hoisted(()=>({saved:null,shop:null,materials:[],transaction:vi.fn()}))
vi.mock('firebase/firestore',async original=>({...await original(),
 doc:(_db,path)=>({path}),collection:(_db,path)=>({path}),
 getDocFromServer:async ref=>({exists:()=>ref.path.includes('/orders/')?!!h.saved:true,data:()=>ref.path.includes('/orders/')?h.saved:h.shop}),
 getDocsFromServer:async()=>({docs:h.materials.map(m=>({data:()=>m}))}),runTransaction:(...args)=>h.transaction(...args)
}))
beforeEach(()=>{h.saved=null;h.transaction.mockReset();h.transaction.mockRejectedValue(new Error('SHOULD_NOT_WRITE'))})
function setup(multi=false){
 const f=multi?multiGroupFixture():groupFixture(),context={projectId:'demo-greek-yogg',shopId:'shop',generation:f.shop.generation,uid:'manager',deviceId:'device',online:true,ready:true}
 for(const group of Object.values(f.shop.catalog.groups)){group.min=0;group.max=3}
 h.shop=f.shop;h.materials=f.materials
 const line={menuId:'SIMPLE',qty:1,selections:[{groupId:'G',id:'A0',selectionQty:1}]}
 const command={kind:'sale',opId:'RECOVER',payload:{platformId:'P',lines:[line],expectedCatalogRevision:f.shop.catalogRevision,approvedShortages:{}}}
 h.saved=summaryMultiGroupSale(f.shop,f.materials,[line],{platformId:'P',opId:command.opId,uid:context.uid}).order
 return {api:createCoreTransport({db:{},getContext:()=>context}),command}
}
it('recovers a committed single-group selection after the catalog advances without another write',async()=>{
 const {api,command}=setup();h.shop.catalogRevision++
 await expect(api.commit(command)).resolves.toMatchObject({opId:command.opId})
 expect(h.transaction).not.toHaveBeenCalled()
})
it('rejects a reused single-group operation ID with a different group identity',async()=>{
 const {api,command}=setup();command.payload.lines[0].selections[0].groupId='OTHER'
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it('rejects extra groups in a reused two-group receipt instead of ignoring them',async()=>{
 const {api,command}=setup(true);command.payload.lines[0].selections.push({groupId:'OTHER',id:'A0',selectionQty:1})
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it('rejects duplicate selection identities in a reused operation ID',async()=>{
 const {api,command}=setup();command.payload.lines[0].selections.push({...command.payload.lines[0].selections[0]})
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it('fences catalog changes before any sale preparation even when price and shortages are unchanged',async()=>{
 const {api,command}=setup();h.saved=null;h.shop.catalogRevision++
 await expect(api.commit(command)).rejects.toMatchObject({code:'CATALOG_REVIEW_REQUIRED'})
 expect(h.transaction).not.toHaveBeenCalled()
})
it('validates the immutable envelope during a server-only recovery read',async()=>{
 const {api,command}=setup();command.payload.lines[0].selections[0].groupId='OTHER'
 await expect(api.receipt('sale',command.opId,command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it('does not recover a two-group receipt through aggregate legacy optionIds',async()=>{
 const {api,command}=setup(true);command.payload.lines=[{menuId:'SIMPLE',qty:1,optionIds:['A0']}]
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it.each(['subtotal','shortages'])('validates persisted %s evidence when supplied on receipt recovery',async field=>{
 const {api,command}=setup()
 if(field==='subtotal')command.payload.subtotalCents=h.saved.subtotalCents+1
 else command.payload.approvedShortages={S0:1}
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it.each([null,0,'mixed'])('rejects malformed grouped receipt operands %s',async value=>{
 const {api,command}=setup()
 if(value===null)command.payload.lines[0].selections=null
 else if(value===0)command.payload.lines[0].selections.push({groupId:'G',id:'_',selectionQty:0})
 else command.payload.lines[0].optionIds=['A0']
 await expect(api.commit(command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
})
it.each([false,true])('matches empty selections against legacy embedded options: selected=%s',async selected=>{
 const {api,command}=setup(),menu=h.shop.catalog.menus.SIMPLE
 delete menu.groupIds;delete menu.groupId
 Object.assign(menu,{optionIds:['A0'],min:0,max:1,priceMode:'addon'})
 h.shop.catalog.addonPrices.P.A0=0
 h.saved=summaryMultiGroupSale(h.shop,h.materials,[{menuId:'SIMPLE',qty:1,optionIds:selected?['A0']:[]}],{platformId:'P',opId:command.opId,uid:'manager'}).order
 command.payload.lines=[{menuId:'SIMPLE',qty:1,selections:[]}]
 if(selected)await expect(api.receipt('sale',command.opId,command)).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
 else await expect(api.receipt('sale',command.opId,command)).resolves.toMatchObject({opId:command.opId})
})
