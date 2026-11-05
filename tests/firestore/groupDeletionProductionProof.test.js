import {afterAll,beforeAll,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import {doc,getDocFromServer,writeBatch} from 'firebase/firestore'
import {createRulesTest} from './helpers.js'
import {decodeRehearsalValue} from '../../scripts/backup-rehearsal.js'
import {createCoreTransport} from '../../src/cloud/core/transport.js'
import {createInventoryModel} from '../../src/cloud/core/inventoryModel.js'

const backupPath=process.env.GY_FIREBASE_BACKUP
let env
const storage=new Map()
beforeAll(async()=>{
 if(!backupPath)return
 vi.stubGlobal('sessionStorage',{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)})
 env=await createRulesTest({rules:readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')})
})
afterAll(async()=>{await env?.cleanup();vi.unstubAllGlobals()})
it.skipIf(!backupPath)('deletes every linked group using the production policy and the exported shop structure',async()=>{
 const {payload}=JSON.parse(readFileSync(backupPath,'utf8'))
 const source=decodeRehearsalValue(payload.root)
 const root='shops/'+payload.shopId,base=root+'/generations/'+payload.generation
 for(const groupId of source.catalog.groupIds){
  storage.clear();await env.clearFirestore()
  const rows=[{path:root,data:source}]
  for(const collection of ['materials','display','operations']){
   for(const row of payload.collections[collection]||[])rows.push({path:base+'/'+collection+'/'+row.id,data:decodeRehearsalValue(row.data)})
  }
  await env.withSecurityRulesDisabled(async ctx=>{
   const db=ctx.firestore()
   for(let i=0;i<rows.length;i+=200){const batch=writeBatch(db);for(const row of rows.slice(i,i+200))batch.set(doc(db,row.path),row.data);await batch.commit()}
  })
  const db=env.authenticatedContext('audit-owner',{email:'armwoottipong@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com'}}).firestore()
  const context={projectId:'demo-greek-yogg',shopId:payload.shopId,generation:payload.generation,uid:'audit-owner',deviceId:'audit',online:true,ready:true,role:'admin'}
  const api=createCoreTransport({db,getContext:()=>context})
  const load=async()=>({...await api.snapshot(),display:(await getDocFromServer(doc(db,base+'/display/catalog'))).data()})
  let data=await load(),model
  model=createInventoryModel({getData:()=>data,loadServer:load,execute:async command=>{
   const receipt=await api.commit(command)
   data=await load();model.update(data)
   return {ok:true,value:{opId:command.opId,kind:command.kind,result:receipt}}
  },isReady:()=>true,isBlocked:()=>false,storageKey:'production-group-delete'})
  try{
   const currentGroup=model.addonGroups.find(group=>group.id===groupId)
   if(currentGroup?.maxSelections<=3){
    const menu=model.menus.find(menu=>menu.addonGroupIds?.includes(groupId))
    if(menu){
     expect(await model.saveAddonGroup({name:'Temporary second group',minSelections:0,maxSelections:1,allowRepeat:false,pricingMode:'included',options:[currentGroup.options[0]]})).toMatchObject({ok:true})
     const extra=model.addonGroups.find(group=>group.name==='Temporary second group')
     expect(await model.saveMenu({...menu,addonGroupIds:[groupId,extra.id]})).toMatchObject({ok:true})
     const detach=await model.deleteAddonGroup(extra.id)
     expect(detach,detach.message).toMatchObject({ok:true})
     expect(model.menus.find(item=>item.id===menu.id).addonGroupIds).toEqual([groupId])
    }
   }
   const result=await model.deleteAddonGroup(groupId)
   expect(result,result.message).toMatchObject({ok:true})
   const final=await api.snapshot()
   expect(final.shop.catalog.groups[groupId].active).toBe(false)
   expect(Object.values(final.shop.catalog.menus).every(menu=>menu.groupId!==groupId&&!menu.groupIds?.includes(groupId))).toBe(true)
  }finally{model.close()}
 }
},120000)
