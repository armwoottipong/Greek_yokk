import {beforeAll,beforeEach,afterAll,it,expect,vi} from 'vitest'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {summaryFixture} from './summaryFixture.js'
import {materialRegistryShop} from './summaryMaterialAuthor.js'
import {seedSetCatalog} from './setCatalogFixture.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
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
it('automatically detaches live menu recipes after confirmation, archives, and still returns original lots',async()=>{
 await seedSetCatalog(env,f)
 let display={menus:Object.fromEntries(f.shop.catalog.menuIds.map(id=>[id,{name:id,emoji:''}])),addons:Object.fromEntries(f.shop.catalog.addonIds.map(id=>[id,{name:id,emoji:''}])),groups:{},platforms:{P:{name:'Counter'}}}
 await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),`${GENERATION}/display/catalog`),display))
 const transport=api(),sale=await transport.commit({opId:'SALE-BEFORE-RETIRE',kind:'sale',payload:{platformId:'P',lines:[{menuId:'SIMPLE',qty:1,optionIds:[]}]}})
 const materialId=sale.inventory.find(row=>row.take>0).materialId,original=f.materials.find(m=>m.id===materialId)
 let current={...await transport.snapshot(),display}
 const storage=new Map();vi.stubGlobal('sessionStorage',{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)})
 let model
 try{
  model=createInventoryModel({getData:()=>current,loadServer:async()=>({...await transport.snapshot(),display}),isReady:()=>true,isBlocked:()=>false,storageKey:'native-archive',execute:async c=>{
   const receipt=await transport.commit(c)
   if(['menu','addon'].includes(c.kind))display=applyCatalogDisplay(display,{collection:c.kind==='menu'?'menus':'addons',entityId:c.kind==='menu'?c.payload.input.id:c.payload.entityId,value:c.payload.display})
   current={...await transport.snapshot(),display};model.update(current)
   return {ok:true,value:{opId:c.opId,kind:c.kind,result:receipt}}
  }})
  const task=model.softDeleteMaterial(materialId);expect(model.modals.confirm.confirmationValue).toBe('ยืนยัน');model.modals.confirm.onConfirm()
  const result=await task;expect(result,JSON.stringify(result)).toMatchObject({ok:true})
  for(const menu of Object.values(current.shop.catalog.menus)){expect(menu.active).toBe(true);expect(menu.rawRecipe||menu.recipe).not.toHaveProperty(materialId)}
 }finally{model?.close();vi.unstubAllGlobals()}
 await transport.commit({opId:'RETURN-AFTER-RETIRE',kind:'cancel',payload:{orderId:sale.opId}})
 const restored=(await transport.snapshot()).materials.find(m=>m.id===materialId)
 expect(restored.deleted).toBe(true);expect(restored.stock).toBe(original.stock);expect(restored.lotQty).toEqual(original.lotQty)
})
