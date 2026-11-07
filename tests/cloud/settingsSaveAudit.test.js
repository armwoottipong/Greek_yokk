// @vitest-environment node
import {it,expect,vi} from 'vitest'
import {createBackupReader} from '../../src/cloud/core/backupReader.js'
import {createCatalogImages} from '../../src/cloud/core/catalogImages.js'
import {createCatalogOrdering} from '../../src/cloud/core/catalogOrdering.js'
import {createShopAccess} from '../../src/cloud/shopAccess.js'
import {Timestamp} from 'firebase/firestore'

const snapshot=data=>({exists:()=>true,data:()=>structuredClone(data)})

it('does not certify metadata combinations that never existed in one server snapshot',async()=>{
 const context={projectId:'demo-audit',shopId:'shop',generation:'g',uid:'admin',role:'admin',ready:true,online:true}
 const root={status:'active',generation:'g',revision:4,catalogRevision:1,materialIds:[],catalog:{menuIds:['A','B'],menus:{A:{},B:{}}}}
 const display={id:'catalog',menus:{A:{},B:{}},menuOrder:['A','B'],menuOrderRevision:0}
 const image={kind:'menus',entityId:'A',dataURL:'',revision:1,updatedBy:'admin',updatedAt:'before'}
 const rows={materials:[],display:[display],orders:[],operations:[],legacyRecords:[],catalogImages:[{id:'menus_A',...image}]}
 const history=[{order:['A','B'],image:1}]
 let injected=false
 const dataFor=path=>path==='shops/shop'?root:path.endsWith('/display/catalog')?display:rows.catalogImages[0]
 const apply=(ref,value)=>{
  Object.assign(dataFor(ref.path),value)
  history.push({order:[...display.menuOrder],image:rows.catalogImages[0].revision})
 }
 const sdk={
  doc:(_db,path)=>({path}),collection:(_db,path)=>({path}),query:source=>source,
  documentId:()=>'__name__',orderBy:()=>({}),limit:()=>({}),startAfter:()=>({}),serverTimestamp:()=> 'server-time',
  runTransaction:async(_db,run)=>run({get:async ref=>snapshot(dataFor(ref.path)),set:apply,update:apply}),
  getDocFromServer:vi.fn(async()=>snapshot(root)),
  getDocsFromServer:vi.fn(async ref=>{
   const name=ref.path.split('/').at(-1)
   if(name==='orders'&&!injected){
    injected=true
    await ordering.saveMenuOrder(['B','A'],{expectedOrderRevision:0,expectedCatalogRevision:1})
    await images.save('menus','A','data:image/jpeg;base64,/9j/2Q==',1)
   }
   return {docs:rows[name].map(row=>({id:row.id,data:()=>structuredClone(row)}))}
  })
 }
 const options={db:{},getContext:()=>context}
 const ordering=createCatalogOrdering(options,sdk),images=createCatalogImages(options,sdk)
 const result=await createBackupReader(options,sdk).read()
 const payload=JSON.parse(result.text).payload
 const order=payload.collections.display[0].data.mapValue.fields.menuOrder.arrayValue.values.map(value=>value.stringValue)
 const revision=Number(payload.collections.catalogImages[0].data.mapValue.fields.revision.integerValue)
 // A retry could return a coherent later state. The old-order/new-image pair
 // returned today never existed: the order save committed before the image save.
 expect(history.some(state=>JSON.stringify(state.order)===JSON.stringify(order)&&state.image===revision)).toBe(true)
 expect(order).toEqual(['B','A']);expect(revision).toBe(2)
 expect(root.revision).toBe(4)
 expect(sdk.getDocFromServer).toHaveBeenCalledTimes(6)
})

it('fences access saving when the authenticated account changes during its server read',async()=>{
 const owner='armwoottipong@gmail.com',other='other@example.com'
 let user={uid:'owner',email:owner}
 const root={revision:4,allowedEmails:{[owner]:true,[other]:true},userRoles:{[owner]:'admin',[other]:'admin'}}
 const tx={get:vi.fn(async()=>{user={uid:'other',email:other};return snapshot(root)}),update:vi.fn(),set:vi.fn()}
 const sdk={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,run)=>run(tx),serverTimestamp:()=> 'server-time'}
 const api=createShopAccess({db:{},shopId:'shop',getUser:()=>user},sdk)
 await expect(api.save(Object.keys(root.allowedEmails),root.allowedEmails,root.userRoles,root.userRoles)).rejects.toThrow('SESSION_CHANGED')
 expect(tx.update).not.toHaveBeenCalled()
})

function backupFixture(){
 const context={projectId:'demo-audit',shopId:'shop',generation:'g',uid:'admin',role:'admin',ready:true,online:true}
 const root={status:'active',generation:'g',revision:4,materialIds:[]}
 const rows={materials:[],display:[{id:'catalog',menuOrder:['A','B'],menuOrderRevision:1}],orders:[],operations:[],legacyRecords:[],catalogImages:[{id:'menus_A',revision:1,updatedAt:new Timestamp(123,456)}]}
 const sdk={doc:(_db,path)=>({path}),collection:(_db,path)=>({path}),query:source=>source,documentId:()=>'__name__',orderBy:()=>({}),limit:()=>({}),startAfter:()=>({}),getDocFromServer:vi.fn(async()=>snapshot(root)),getDocsFromServer:vi.fn(async ref=>({docs:rows[ref.path.split('/').at(-1)].map(row=>({id:row.id,data:()=>({...row})}))}))}
 return {root,rows,context,sdk,reader:createBackupReader({db:{},getContext:()=>context},sdk)}
}

it.each(['display','catalogImages'])('bounds retries when independent %s metadata keeps changing',async name=>{
 const h=backupFixture(),read=h.sdk.getDocsFromServer.getMockImplementation();let reads=0
 h.sdk.getDocsFromServer.mockImplementation(async ref=>{
  if(ref.path.endsWith('/'+name)&&++reads%2===0){const row=h.rows[name][0];if(name==='display')row.menuOrderRevision++;else row.revision++}
  return read(ref)
 })
 await expect(h.reader.read()).rejects.toThrow('BACKUP_BUSY')
 expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(16)
 expect(h.root.revision).toBe(4)
})

it('encodes equal server timestamps canonically despite metadata map key ordering',async()=>{
 const h=backupFixture(),read=h.sdk.getDocsFromServer.getMockImplementation();let reads=0
 h.sdk.getDocsFromServer.mockImplementation(async ref=>{
  const result=await read(ref)
  if(ref.path.endsWith('/catalogImages')&&++reads===2){
   result.docs=[{id:'menus_A',data:()=>({updatedAt:new Timestamp(123,456),revision:1,id:'menus_A'})}]
  }
  return result
 })
 const result=await h.reader.read(),image=JSON.parse(result.text).payload.collections.catalogImages[0].data.mapValue.fields
 expect(image.updatedAt.timestampValue).toEqual({seconds:123,nanoseconds:456})
 expect(h.sdk.getDocFromServer).toHaveBeenCalledTimes(3)
})

it('retries when the business root changes during metadata validation',async()=>{
 const h=backupFixture(),read=h.sdk.getDocsFromServer.getMockImplementation();let reads=0
 h.sdk.getDocsFromServer.mockImplementation(async ref=>{
  if(ref.path.endsWith('/catalogImages')&&++reads===2)h.root.revision++
  return read(ref)
 })
 expect((await h.reader.read()).revision).toBe(5)
 expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(16)
})

it('fences a closed backup during metadata validation',async()=>{
 const h=backupFixture(),read=h.sdk.getDocsFromServer.getMockImplementation();let reads=0
 h.sdk.getDocsFromServer.mockImplementation(async ref=>{
  if(ref.path.endsWith('/display')&&++reads===2)h.reader.close()
  return read(ref)
 })
 await expect(h.reader.read()).rejects.toThrow('NOT_READY')
})

it.each(['read','commit'])('does not report access save success when the service closes during %s',async phase=>{
 const owner='armwoottipong@gmail.com',user={uid:'owner',email:owner}
 const root={revision:4,allowedEmails:{[owner]:true},userRoles:{[owner]:'admin'}}
 let api
 const tx={get:vi.fn(async()=>{if(phase==='read')api.close();return snapshot(root)}),update:vi.fn(),set:vi.fn()}
 const sdk={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,run)=>{const result=await run(tx);if(phase==='commit')api.close();return result},serverTimestamp:()=> 'server-time'}
 api=createShopAccess({db:{},shopId:'shop',getUser:()=>user},sdk)
 await expect(api.save([owner],root.allowedEmails,root.userRoles,root.userRoles)).rejects.toThrow('SESSION_CHANGED')
 expect(tx.update).toHaveBeenCalledTimes(phase==='read'?0:1)
})

it('does not report access save success to an account that changed during commit',async()=>{
 const owner='armwoottipong@gmail.com';let user={uid:'owner',email:owner}
 const root={revision:4,allowedEmails:{[owner]:true},userRoles:{[owner]:'admin'}}
 const tx={get:async()=>snapshot(root),update:vi.fn(),set:vi.fn()}
 const sdk={doc:(_db,...parts)=>parts.join('/'),runTransaction:async(_db,run)=>{const result=await run(tx);user={uid:'other',email:'other@example.com'};return result},serverTimestamp:()=> 'server-time'}
 const api=createShopAccess({db:{},shopId:'shop',getUser:()=>user},sdk)
 await expect(api.save([owner],root.allowedEmails,root.userRoles,root.userRoles)).rejects.toThrow('SESSION_CHANGED')
 expect(tx.update).toHaveBeenCalledOnce()
})
