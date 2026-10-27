import {it,expect} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {planInventoryCommand} from '../../src/cloud/core/inventoryPlan.js'
const setup=()=>{const f=summaryFixture();return {...f,command:{kind:'platform_gp',opId:'GP-1',payload:{expectedRevision:f.shop.revision,rates:Object.fromEntries(f.shop.catalog.platformIds.map(id=>[id,2550]))}}}}
it('changes only GP/revisions and leaves prices and inventory intact',()=>{
 const {shop,materials,command}=setup(),before=structuredClone(shop),f=planInventoryCommand(shop,materials,command,'alice')
 expect(shop).toEqual(before);expect(f.nextMaterials).toEqual([])
 expect(f.nextShop.catalogRevision).toBe(shop.catalogRevision+1)
 expect(f.nextShop.catalog.menus).toEqual(shop.catalog.menus)
 expect(f.nextShop.catalog.addons).toEqual(shop.catalog.addons)
 for(const id of shop.catalog.platformIds)expect(f.nextShop.catalog.platforms[id]).toEqual({...shop.catalog.platforms[id],gpBasisPoints:2550,revision:shop.catalog.platforms[id].revision+1})
 expect(f.operation.rates).toEqual(command.payload.rates)
})
it('fences stale and missing revisions',()=>{for(const expectedRevision of [undefined,-1]){const f=setup();f.command.payload.expectedRevision=expectedRevision;expect(()=>planInventoryCommand(f.shop,f.materials,f.command)).toThrow()}})
it.each([-1,10000,1.5,'3000',null])('rejects malformed GP %s',value=>{const f=setup();f.command.payload.rates[f.shop.catalog.platformIds[0]]=value;expect(()=>planInventoryCommand(f.shop,f.materials,f.command)).toThrow('INVALID_GP_SETTINGS')})
it('rejects missing or foreign channel IDs',()=>{for(const change of [r=>delete r[Object.keys(r)[0]],r=>r.foreign=0]){const f=setup();change(f.command.payload.rates);expect(()=>planInventoryCommand(f.shop,f.materials,f.command)).toThrow('INVALID_GP_SETTINGS')}})
