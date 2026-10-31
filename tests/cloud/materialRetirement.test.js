import {it,expect,vi} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {summaryMaterialArchive} from '../../src/cloud/core/model/materialAuthor.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
it('retires an unreferenced summary member while retaining its document for historical returns',()=>{
 const f=summaryFixture(),shop=materialRegistryShop(f.shop,f.materials),m=f.materials[0]
 shop.catalog.menus={};shop.catalog.addons={};shop.productionUsers[m.id]=[]
 const result=summaryMaterialArchive(shop,m,true)
 expect(result.next.deleted).toBe(true);expect(result.next.stock).toBe(m.stock)
 expect(result.nextShop.catalog.summaryMaterials).not.toContain(m.id)
 expect(result.nextShop.materialIds).toContain(m.id)
})
it('names hidden catalog references and retained-return history in deletion eligibility',()=>{
 sessionStorage.clear();const f=summaryFixture(),m=f.materials[0],shop=materialRegistryShop(f.shop,f.materials)
 shop.catalog.menus={OLD:{active:false,recipe:{[m.id]:100},rawRecipe:{[m.id]:100}}};shop.catalog.addons={};shop.returnMaterials={[m.id]:true}
 const data={shop,materials:f.materials,display:{menus:{OLD:{name:'เมนูเก่า',deleted:true}},addons:{}}}
 const model=createInventoryModel({getData:()=>data,loadServer:async()=>data,execute:vi.fn(),isReady:()=>true,isBlocked:()=>false,storageKey:'eligibility'})
 const eligibility=model.materialDeletionEligibility(m.id)
 expect(eligibility.blockers.join(' ')).toContain('เมนูเก่า');expect(eligibility.blockers.join(' ')).toContain('คืนบิล')
 model.close()
})
