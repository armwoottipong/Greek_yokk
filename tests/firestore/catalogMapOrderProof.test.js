import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest'
import {doc,writeBatch} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {buildCorePolicy} from '../../scripts/core-policy.mjs'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {planCatalogCommand,applyCatalogDisplay} from '../../src/cloud/core/catalogPlan.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'

let env
beforeAll(async()=>{env=await createRulesTest({rules:buildCorePolicy({shopId:'proof-shop'})})})
beforeEach(async()=>env.clearFirestore())
afterAll(async()=>env?.cleanup())
it.each([false,true])('commits equal recipe maps across reads and recovers a previously prepared command (retry=%s)',async retry=>{
 const source=coreSource();source.addons=[{id:'A',name:'Option',prices:{P:10},recipe:[{materialId:'M0',qty:1},{materialId:'M1',qty:2}]}];source.menus[0].hasAddons=true
 const p=compileCoreImport(source,{shopId:'proof-shop',generation:'g_trial_map_order',sourceSha256:'a'.repeat(64)}),root=p.shop,c=root.catalog,id=c.menuIds[0],addon=c.addonIds[0],base=`shops/proof-shop/generations/${root.generation}`
 root.allowedEmails={'manager@example.com':true};root.userRoles={'manager@example.com':'manager'}
 const materials=p.documents.filter(d=>d.path.includes('/materials/')).map(d=>d.data),display=p.documents.find(d=>d.path.endsWith('/display/catalog')).data
 const old=c.menus[id],command={kind:'menu',opId:'MAP-ORDER',payload:{input:{id,name:display.menus[id].name,active:true,pricesCents:old.pricesCents,rawRecipe:old.rawRecipe||old.recipe,recipe:old.recipe,hasPackage:true,optionIds:[addon],min:0,max:1,priceMode:'addon',optionPrices:Object.fromEntries(c.platformIds.map(p=>[p,{_:0,[addon]:1000}]))},display:{name:display.menus[id].name,emoji:'🥣'}}}
 const first=planCatalogCommand(root,materials,command,'manager')
 if(retry)first.operation.entitySnapshot.choiceMaterials[addon].reverse()
 const other=structuredClone(root);other.catalog.addons[addon].recipe=Object.fromEntries(Object.entries(c.addons[addon].recipe).reverse())
 const final=planCatalogCommand(other,materials,command,'manager')
 // Firestore maps have equal values; only transport iteration order changed.
 expect(other.catalog.addons[addon].recipe).toEqual(c.addons[addon].recipe)
 await env.withSecurityRulesDisabled(async ctx=>{
  const db=ctx.firestore(),b=writeBatch(db);b.set(doc(db,'shops/proof-shop'),root)
  for(const d of p.documents)b.set(doc(db,d.path),d.data)
  const op=first.operation
  for(let i=0;i*4<op.validationIds.length;i++)b.set(doc(db,`${base}/recipeAdmissions/${command.opId}/parts/${i}`),{opId:command.opId,index:i,uid:'manager',sourceRevision:root.revision,kind:'menu',entityId:id,input:op.input,entitySnapshot:op.entitySnapshot,materialIds:op.validationIds.slice(i*4,i*4+4)})
  await b.commit()
 })
 const db=env.authenticatedContext('manager',{email:'manager@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore(),b=writeBatch(db)
 if(retry){
  const context={projectId:'demo-greek-yogg',shopId:'proof-shop',generation:root.generation,uid:'manager',deviceId:'device',online:true,ready:true}
  const api=createCoreTransport({db,getContext:()=>context})
  await expect(api.commit(command)).resolves.toMatchObject({kind:'menu',opId:command.opId});return
 }
 b.set(doc(db,'shops/proof-shop'),final.nextShop);b.set(doc(db,`${base}/operations/${command.opId}`),final.operation);b.set(doc(db,`${base}/display/catalog`),applyCatalogDisplay(display,final.displayChange))
 for(const proof of final.checkProofs)b.set(doc(db,`${base}/operations/${command.opId}/referenceProofs/check${proof.index}`),proof.data)
 for(const [key,value] of [['admitted',final.admittedProof],['input',final.inputProof],['shape',final.shapeProof]])b.set(doc(db,`${base}/operations/${command.opId}/referenceProofs/${key}`),value)
 await expect(b.commit()).resolves.toBeUndefined()
})
