// @vitest-environment jsdom
import {readFileSync} from 'node:fs'
import {webcrypto} from 'node:crypto'
import {beforeAll,beforeEach,afterEach,afterAll,it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {indexedDB} from 'fake-indexeddb'
import {doc,getDocFromServer,writeBatch,Timestamp} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {compileCoreImport} from '../../scripts/core-import.js'
import {coreSource} from '../fixtures/coreSource.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createCoreCommands} from '../../src/cloud/core/commands.js'
import {createCommandJournal} from '../../src/cloud/journal.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'
import MenuEdit from '../../src/components/modals/MenuEditModal.vue'

let env,api,other,data,model,journal,commands,wrapper,base,context
beforeAll(async()=>{
 vi.stubGlobal('crypto',webcrypto)
 env=await createRulesTest({rules:readFileSync('firestore.rules','utf8')})
})
beforeEach(async()=>{
 sessionStorage.clear();await env.clearFirestore()
 const source=coreSource()
 source.platforms=Array.from({length:4},(_,i)=>({id:`P${i}`,name:`Channel ${i}`,gpPercent:0,isActive:true}))
 const prices=Object.fromEntries(source.platforms.map(p=>[p.id,10]))
 source.menus.forEach(m=>{m.prices=prices})
 source.addons=[{id:'A',name:'Fruit',prices,recipe:[{materialId:'M0',qty:1}]}]
 source.addonGroups=['G','H'].map(id=>({id,name:`Group ${id}`,minSelections:1,maxSelections:1,allowRepeat:false,pricingMode:'included',options:[{addonId:'A'}]}))
 const imported=compileCoreImport(source,{shopId:'greek-yogg',generation:'g_trial_form',sourceSha256:'a'.repeat(64)})
 imported.shop.allowedEmails={'manager@example.com':true};imported.shop.userRoles={'manager@example.com':'manager'}
 base=`shops/greek-yogg/generations/${imported.shop.generation}`
 await env.withSecurityRulesDisabled(async c=>{
  const db=c.firestore(),b=writeBatch(db);b.set(doc(db,'shops/greek-yogg'),imported.shop)
  for(const d of imported.documents)b.set(doc(db,d.path),d.data)
  const path=base+'/display/catalog',display=imported.documents.find(d=>d.path===path).data
  b.set(doc(db,path),{...display,menuOrder:[...imported.shop.catalog.menuIds],menuOrderRevision:1,menuOrderUpdatedAt:new Timestamp(1793966533,352000000)})
  await b.commit()
 })
 context={projectId:'demo-greek-yogg',shopId:'greek-yogg',generation:imported.shop.generation,uid:'manager',deviceId:'browser-form',online:true,ready:true,protocolCertified:true}
 const auth={email:'manager@example.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}
 const db=env.authenticatedContext('manager',auth).firestore()
 api=createCoreTransport({db,getContext:()=>context})
 other=createCoreTransport({db:env.authenticatedContext('second-session',auth).firestore(),getContext:()=>({...context,uid:'second-session',deviceId:'other'})})
 const load=async()=>({...await api.snapshot(),display:(await getDocFromServer(doc(db,base+'/display/catalog'))).data()})
 data=await load();journal=createCommandJournal({indexedDB,dbName:'form-'+crypto.randomUUID()})
 commands=createCoreCommands({journal,transport:api,getContext:()=>context})
 model=createInventoryModel({getData:()=>data,loadServer:load,execute:async c=>{const result=await commands.execute(c);if(result.ok){data=await load();model.update(data)}return result},isReady:()=>context.ready&&context.online,isBlocked:()=>false,storageKey:'form-audit'})
 model.confirmDialog=async()=>true
 wrapper=mount(MenuEdit,{attachTo:document.body,global:{provide:{'cloud-inventory-model':model},stubs:{teleport:true}}})
 model.modals.menuEdit={isOpen:true,menuId:model.menus[0].id};await flushPromises()
})
afterEach(async()=>{wrapper?.unmount();model?.close();await journal?.close()})
afterAll(async()=>{await env?.cleanup();vi.unstubAllGlobals()})
async function pick(ids){
 await wrapper.get('[data-open-group-picker]').trigger('click')
 for(const row of wrapper.findAll('[data-picker-group] input'))await row.setValue(ids.includes(row.element.closest('[data-picker-group]').dataset.pickerGroup))
 await wrapper.findAll('#menu-group-picker button').find(b=>b.text()==='เสร็จสิ้น').trigger('click')
}
it('persists group selection from an initially disabled menu through original form, journal, transport and Rules',async()=>{
 const menuId=model.menus[0].id,group=model.addonGroups[0],before=await other.snapshot()
 expect(wrapper.vm.form.hasAddons).toBe(false)
 await pick([group.id]);await wrapper.vm.submit();await flushPromises()
 expect(model.modals.menuEdit.isOpen,model.toasts.map(t=>t.message).join('\n')).toBe(false)
 const saved=await other.snapshot()
 expect(saved.shop.catalog.menus[menuId].groupId).toBe(group.id)
 expect(saved.shop.catalog.groups[group.id].menuIds).toContain(menuId)
 expect(saved.materials.map(m=>[m.id,m.stock])).toEqual(before.materials.map(m=>[m.id,m.stock]))
 expect(await journal.listUnresolved(context)).toEqual([])
 model.modals.menuEdit={isOpen:true,menuId};await flushPromises()
 expect(wrapper.vm.form.addonGroupIds).toEqual([group.id])
 expect(wrapper.vm.form.hasAddons).toBe(true)
})
it('round trips two groups to one to none through the original editor and reverse references',async()=>{
 const menuId=model.menus[0].id,ids=model.addonGroups.map(g=>g.id)
 for(const selected of [ids,ids.slice(0,1),[]]){
  await pick(selected);await wrapper.vm.submit();await flushPromises()
  expect(model.modals.menuEdit.isOpen,model.toasts.map(t=>t.message).join('\n')).toBe(false)
  const saved=(await other.snapshot()).shop.catalog,menu=saved.menus[menuId]
  expect(menu.groupIds|| (menu.groupId?[menu.groupId]:[])).toEqual(selected)
  for(const id of ids)expect(saved.groups[id].menuIds.includes(menuId)).toBe(selected.includes(id))
  model.modals.menuEdit={isOpen:true,menuId};await flushPromises()
 }
})
it('sells a form-bound group, rejects its stale cart after unlinking, and cancels using the original stock evidence',async()=>{
 const menuId=model.menus[0].id,group=model.addonGroups[0],before=await other.snapshot()
 await pick([group.id]);await wrapper.vm.submit();await flushPromises()
 expect(model.modals.menuEdit.isOpen).toBe(false)
 const line={menuId,qty:1,selections:[{groupId:group.id,id:group.options[0].addonId,selectionQty:1}]}
 const command={kind:'sale',opId:'FORM-SALE',payload:{platformId:data.shop.catalog.platformIds[0],lines:[line],expectedCatalogRevision:data.shop.catalogRevision,approvedShortages:{}}}
 const sale=await api.commit(command)
 await expect(api.commit(command)).resolves.toMatchObject({opId:sale.opId})
 await expect(api.commit({...command,payload:{...command.payload,lines:[{...line,selections:[{...line.selections[0],groupId:'OTHER'}]}]}})).rejects.toMatchObject({code:'COMMAND_ID_COLLISION'})
 expect(sale.subtotalCents).toBe(1000)
 // Reload the real form model after another server-confirmed business command.
 const next=await api.snapshot();data={...data,...next};model.update(data)
 model.modals.menuEdit={isOpen:true,menuId};await flushPromises()
 await pick([]);await wrapper.vm.submit();await flushPromises()
 expect(model.modals.menuEdit.isOpen).toBe(false)
 await expect(api.commit(command)).resolves.toMatchObject({opId:sale.opId})
 await expect(api.commit({kind:'sale',opId:'STALE-FORM-SALE',payload:{platformId:data.shop.catalog.platformIds[0],lines:[line],approvedShortages:{}}})).rejects.toThrow('Invalid group selection')
 await api.commit({kind:'cancel',opId:'FORM-CANCEL',payload:{orderId:sale.opId}})
 const restored=await other.snapshot()
 for(const m of restored.materials){const old=before.materials.find(row=>row.id===m.id);expect(m.stock).toBe(old.stock);expect(m.lotQty).toEqual(old.lotQty)}
})
it('fences an unset-price change after cashier preview even when the total would be unchanged',async()=>{
 const menuId=model.menus[0].id,group=model.addonGroups[0]
 await pick([group.id]);await wrapper.vm.submit();await flushPromises()
 const platformId=data.shop.catalog.platformIds[0],before=await other.snapshot()
 const command={kind:'sale',opId:'UNSET-RACE',payload:{platformId,expectedCatalogRevision:data.shop.catalogRevision,subtotalCents:1000,lines:[{menuId,qty:1,selections:[{groupId:group.id,id:group.options[0].addonId,selectionQty:1}]}],approvedShortages:{}}}
 expect(await model.saveAddonGroup({...group,options:group.options.map(option=>({...option,prices:{},unpricedPlatformIds:[platformId]}))})).toMatchObject({ok:true})
 await expect(api.commit(command)).rejects.toMatchObject({code:'CATALOG_REVIEW_REQUIRED'})
 expect(await api.receipt('sale',command.opId)).toBeNull()
 for(const m of (await other.snapshot()).materials)expect(m.stock).toBe(before.materials.find(row=>row.id===m.id).stock)
})
it('keeps a mismatched same-ID receipt unresolved on initial execute, recover, reconcile and retry',async()=>{
 const menuId=model.menus[0].id,[g,h]=model.addonGroups
 await pick([h.id]);await wrapper.vm.submit();await flushPromises()
 const committed={kind:'sale',opId:'COLLIDING-SALE',payload:{platformId:data.shop.catalog.platformIds[0],expectedCatalogRevision:data.shop.catalogRevision,lines:[{menuId,qty:1,selections:[{groupId:h.id,id:h.options[0].addonId,selectionQty:1}]}],approvedShortages:{}}}
 await api.commit(committed)
 const before=await other.snapshot(),pending={...committed,payload:{...committed.payload,lines:[{menuId,qty:1,selections:[{groupId:g.id,id:g.options[0].addonId,selectionQty:1}]}]}}
 for(const run of [()=>commands.execute(pending),()=>commands.recover(pending),()=>commands.reconcile(),()=>commands.execute(pending)]){
  const result=await run();expect(result.ok).toBe(false);expect(result.causeCode||result.code).toBe('COMMAND_ID_COLLISION')
  expect(await journal.listUnresolved(context)).toHaveLength(1)
 }
 const after=await other.snapshot();expect(after.shop.revision).toBe(before.shop.revision)
 for(const m of after.materials)expect(m.stock).toBe(before.materials.find(row=>row.id===m.id).stock)
})
