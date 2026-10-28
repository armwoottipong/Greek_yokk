// @vitest-environment node
import {it,expect} from 'vitest'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {summaryMultiGroupSale} from '../../src/cloud/core/model/saleGroups.js'
import {summaryCancel} from '../../src/cloud/core/model/cancel.js'
const setup=()=>{const f=summaryFixture();f.shop=materialRegistryShop(f.shop,f.materials);const menu=Object.values(f.shop.catalog.menus).find(m=>m.min===0),packageId=f.materials.find(m=>m.inventoryType==='packaging').id;return {...f,menu,packageId,lines:[{menuId:menu.id,qty:1,optionIds:[]}]}}
it('overrides package quantity for this bill only and returns exact stock once cancelled',()=>{
 const f=setup(),packages={[f.packageId]:{quantity:300,reason:'separate_bag',note:''}},before=structuredClone(f.shop)
 const sale=summaryMultiGroupSale(f.shop,f.materials,f.lines,{platformId:'P',packages,opId:'PACK',uid:'u'})
 expect(sale.order.inventory.find(r=>r.materialId===f.packageId).needed).toBe(300)
 expect(sale.order.billOperands.packages).toEqual(packages);expect(f.shop).toEqual(before)
 const returned=summaryCancel(sale.nextShop,sale.nextMaterials,{...sale.order,status:'committed'},{opId:'RETURN',uid:'u'})
 for(const row of returned.nextMaterials)expect(row.stock).toBe(f.materials.find(m=>m.id===row.id).stock)
})
it('supports declined zero quantity and preserves legacy operands when no adjustment exists',()=>{
 const f=setup(),plain=summaryMultiGroupSale(f.shop,f.materials,f.lines,{platformId:'P'}),changed=summaryMultiGroupSale(f.shop,f.materials,f.lines,{platformId:'P',packages:{[f.packageId]:{quantity:0,reason:'customer_declined',note:''}}})
 expect(changed.order.inventory.find(r=>r.materialId===f.packageId).needed).toBe(0)
 expect(plain.order.billOperands).not.toHaveProperty('packages')
})
it('rejects ingredient overrides, invalid quantities and missing reasons',()=>{
 const f=setup(),ingredient=f.materials.find(m=>m.inventoryType==='ingredient').id
 for(const packages of [{[ingredient]:{quantity:0,reason:'other',note:'x'}},{[f.packageId]:{quantity:-1,reason:'other',note:'x'}},{[f.packageId]:{quantity:1,reason:'unknown',note:''}},{[f.packageId]:{quantity:1,reason:'other',note:''}}])expect(()=>summaryMultiGroupSale(f.shop,f.materials,f.lines,{platformId:'P',packages})).toThrow('INVALID_PACKAGE_ADJUSTMENT')
})
