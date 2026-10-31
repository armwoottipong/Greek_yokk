import {it,expect} from 'vitest'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {planCatalogCommand} from '../../src/cloud/core/catalogPlan.js'
it('makes menu admission and final entity snapshots identical for equal recipe maps',()=>{
 const source=coreSource();source.addons=[{id:'A',name:'Option',prices:{P:10},recipe:[{materialId:'M0',qty:1},{materialId:'M1',qty:2}]}]
 const p=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_order',sourceSha256:'a'.repeat(64)}),shop=p.shop,c=shop.catalog,id=c.menuIds[0],addon=c.addonIds[0],materials=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data),old=c.menus[id]
 const command={kind:'menu',opId:'ORDER',payload:{input:{id,name:'Menu',active:true,pricesCents:old.pricesCents,rawRecipe:old.recipe,recipe:old.recipe,hasPackage:true,optionIds:[addon],min:0,max:1,priceMode:'addon',optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,{_:0,[addon]:1000}]))},display:{name:'Menu',emoji:'🥣'}}}
 const second=structuredClone(shop);second.catalog.addons[addon].recipe=Object.fromEntries(Object.entries(c.addons[addon].recipe).reverse())
 expect(planCatalogCommand(shop,materials,command).operation.entitySnapshot).toEqual(planCatalogCommand(second,materials,command).operation.entitySnapshot)
})
