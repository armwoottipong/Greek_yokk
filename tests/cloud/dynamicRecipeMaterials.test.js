import {it,expect} from 'vitest'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
function fixture(){
 const p=compileCoreImport(coreSource(),{generation:'g_trial_dynamic',sourceSha256:'a'.repeat(64)})
 const shop=p.shop,materials=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data)
 for(let i=16;i<20;i++){const m=structuredClone(materials[0]);m.id=`M${i}`;m.costRank=i;m.recipeIndex={catalogRevision:0,menus:{_:0},addons:{_:0}};materials.push(m);shop.materialIds.push(m.id);shop.productionUsers[m.id]=[]}
 return {shop,materials}
}
const sale=(shop,materials)=>summaryMultiGroupSale(shop,materials,[{menuId:shop.catalog.menuIds[0],qty:1,optionIds:[]}],{platformId:shop.catalog.platformIds[0]})
it('uses a new registered material even when its old zero cache is stale',()=>{
 const {shop,materials}=fixture(),menu=shop.catalog.menus[shop.catalog.menuIds[0]]
 menu.recipe={M16:100};menu.rawRecipe={M16:100};menu.materialIds=['M16']
 const f=sale(shop,materials)
 expect(f.order.materialIds).toContain('M16');expect(f.order.materialIds).toHaveLength(16)
 expect(f.order.inventory.find(row=>row.materialId==='M16').needed).toBe(100)
 expect(f.nextMaterials.find(m=>m.id==='M16').stock).toBe(materials.find(m=>m.id==='M16').stock-100)
})
it('accepts sixteen used ingredients while the shop has twenty registered materials',()=>{
 const {shop,materials}=fixture(),menu=shop.catalog.menus[shop.catalog.menuIds[0]]
 menu.recipe=Object.fromEntries(shop.materialIds.slice(4).map(id=>[id,100]));menu.rawRecipe={...menu.recipe}
 const f=sale(shop,materials)
 expect(f.order.materialIds).toHaveLength(16);expect(f.order.inventory.every(row=>row.needed===100)).toBe(true)
})
it('rejects a seventeen-material bill before changing any source inventory',()=>{
 const {shop,materials}=fixture(),before=JSON.stringify(materials),menu=shop.catalog.menus[shop.catalog.menuIds[0]]
 menu.recipe=Object.fromEntries(shop.materialIds.slice(0,17).map(id=>[id,100]));menu.rawRecipe={...menu.recipe}
 expect(()=>sale(shop,materials)).toThrow('SALE_MATERIAL_LIMIT')
 expect(JSON.stringify(materials)).toBe(before)
})
it('does not count zero quantities or disabled packaging as used ingredients',()=>{
 const {shop,materials}=fixture(),menu=shop.catalog.menus[shop.catalog.menuIds[0]]
 materials.find(m=>m.id==='M19').inventoryType='packaging'
 menu.rawRecipe={M16:100,M17:0,M19:100};menu.recipe={M16:100};menu.hasPackage=false
 const f=sale(shop,materials)
 expect(f.order.materialIds).toContain('M16');expect(f.order.materialIds).not.toContain('M19')
 expect(f.order.inventory.find(row=>row.materialId==='M16').needed).toBe(100)
})
