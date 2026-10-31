import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createCatalogBindings} from '../../src/cloud/core/catalogBindings.js'
import {applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {doc,setDoc} from 'firebase/firestore'
import {GENERATION} from './proofFixture.js'
let env,f
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({legacyTestAuth:true,shopId:'proof-shop'})})})
beforeEach(async()=>{await env.clearFirestore();f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials)})
afterAll(async()=>{await env?.cleanup()})
const api=()=>createCoreTransport({db:env.authenticatedContext('cashier').firestore(),getContext:()=>({projectId:'demo-greek-yogg',shopId:'proof-shop',generation:'g1',uid:'cashier',deviceId:'d',online:true,ready:true})})
function unreference(id){
 for(const m of Object.values(f.shop.catalog.menus)){delete m.recipe[id];if(m.rawRecipe)delete m.rawRecipe[id]}
 for(const a of Object.values(f.shop.catalog.addons))delete a.recipe[id]
 f.shop.productionUsers[id]=[]
}
it('archives and restores an unreferenced original summary material without dropping stock or history',async()=>{
 const id=f.materials[0].id;unreference(id);f.shop.returnMaterials={[id]:true};await seedSetCatalog(env,f)
 const transport=api(),before=await transport.snapshot()
 await transport.commit({opId:'ARCHIVE',kind:'material_archive',payload:{materialId:id,deleted:true,expectedRevision:f.shop.revision}})
 let after=await transport.snapshot();expect(after.shop.catalog.summaryMaterials).not.toContain(id)
 expect(after.materials.find(m=>m.id===id)).toMatchObject({deleted:true,stock:before.materials[0].stock})
 expect(after.shop.returnMaterials[id]).toBe(true)
 await transport.commit({opId:'RESTORE',kind:'material_archive',payload:{materialId:id,deleted:false,expectedRevision:after.shop.revision}})
 after=await transport.snapshot();expect(after.materials.find(m=>m.id===id).deleted).toBe(false)
})
it('still refuses retirement while a live or hidden declared recipe references the material',async()=>{
 await seedSetCatalog(env,f);const transport=api()
 await expect(transport.commit({opId:'BAD',kind:'material_archive',payload:{materialId:f.materials[0].id,deleted:true,expectedRevision:f.shop.revision}})).rejects.toThrow('Material still referenced')
 expect((await transport.snapshot()).shop.revision).toBe(f.shop.revision)
})
it('keeps original-lot cancellation valid after menus are deleted and a sold material is archived',async()=>{
 await seedSetCatalog(env,f)
 let display={menus:Object.fromEntries(f.shop.catalog.menuIds.map(id=>[id,{name:id,emoji:''}])),addons:Object.fromEntries(f.shop.catalog.addonIds.map(id=>[id,{name:id,emoji:''}])),groups:{},platforms:{P:{name:'Counter'}}}
 await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),`${GENERATION}/display/catalog`),display))
 const transport=api(),sale=await transport.commit({opId:'SALE-BEFORE-RETIRE',kind:'sale',payload:{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]}})
 const materialId=sale.inventory.find(row=>row.take>0).materialId,original=f.materials.find(m=>m.id===materialId)
 let current={...await transport.snapshot(),display}
 const bindings=createCatalogBindings({snapshot:()=>current,error:message=>({ok:false,message}),mutate:async entries=>{
  for(const c of entries){c.opId=crypto.randomUUID();c.payload.expectedRevision=current.shop.revision;await transport.commit(c);const collection=c.kind==='menu'?'menus':'addons',entityId=c.kind==='menu'?c.payload.input.id:c.payload.entityId;display=applyCatalogDisplay(display,{collection,entityId,value:c.payload.display});current={...await transport.snapshot(),display}}
  return {ok:true}
 }})
 for(const id of [...current.shop.catalog.menuIds]){const result=await bindings.deleteMenu(id);expect(result,JSON.stringify({id,...result})).toMatchObject({ok:true})}
 for(const [id,addon] of Object.entries(current.shop.catalog.addons))if(Object.hasOwn(addon.recipe,materialId))expect(await bindings.deleteAddon(id)).toMatchObject({ok:true})
 await transport.commit({opId:'ARCHIVE-SOLD',kind:'material_archive',payload:{materialId,deleted:true,expectedRevision:current.shop.revision}})
 await transport.commit({opId:'RETURN-AFTER-RETIRE',kind:'cancel',payload:{orderId:sale.opId}})
 const restored=(await transport.snapshot()).materials.find(m=>m.id===materialId)
 expect(restored.deleted).toBe(true);expect(restored.stock).toBe(original.stock);expect(restored.lotQty).toEqual(original.lotQty)
})
