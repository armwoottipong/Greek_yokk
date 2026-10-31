import {it,expect,vi} from 'vitest'
import {createCatalogImages} from '../../src/cloud/core/catalogImages.js'
function setup(){
 const context={projectId:'demo-test',shopId:'greek-yogg',generation:'g',uid:'u',role:'manager',online:true,ready:true}
 const rows={root:{status:'active',generation:'g'},entity:{id:'M'},image:{revision:2,dataURL:'data:image/jpeg;base64,/9j/2Q=='}}
 const transaction={get:vi.fn(async ref=>({exists:()=>true,data:()=>ref.path.endsWith('/greek-yogg')?rows.root:ref.path.includes('/catalogImages/')?rows.image:rows.entity})),set:vi.fn()}
 const sdk={doc:(_db,path)=>({path}),serverTimestamp:()=> 'server-time',runTransaction:vi.fn(async(_db,fn)=>fn(transaction)),onSnapshot:vi.fn(()=>vi.fn())}
 return {context,rows,sdk,transaction,service:createCatalogImages({db:{},getContext:()=>context},sdk)}
}
it('confirms image writes in a transaction without changing business documents',async()=>{
 const h=setup(),url='data:image/jpeg;base64,/9j/2Q=='
 const result=await h.service.save('materials','M',url,2)
 expect(result.revision).toBe(3);expect(h.transaction.set).toHaveBeenCalledTimes(1)
 expect(h.transaction.set.mock.calls[0][0].path).toBe('shops/greek-yogg/generations/g/catalogImages/materials_M')
})
it('blocks disconnected and Viewer writes before contacting Firebase',async()=>{
 for(const change of [{online:false},{ready:false},{role:'viewer'}]){
  const h=setup();Object.assign(h.context,change)
  await expect(h.service.save('materials','M','',2)).rejects.toThrow()
  expect(h.sdk.runTransaction).not.toHaveBeenCalled()
 }
})
it('rejects a stale picture revision and changed shop generation',async()=>{
 const h=setup();await expect(h.service.save('materials','M','',1)).rejects.toThrow('IMAGE_CONFLICT')
 h.rows.root.generation='other';await expect(h.service.save('materials','M','',2)).rejects.toThrow('SHOP_NOT_READY')
 expect(h.transaction.set).not.toHaveBeenCalled()
})
it('fences changed identities and closed sessions',async()=>{
 const h=setup();h.transaction.get.mockImplementation(async()=>{h.context.uid='other';return {exists:()=>true,data:()=>h.rows.root}})
 await expect(h.service.save('materials','M','',2)).rejects.toThrow('CONTEXT_CHANGED')
 h.service.close();await expect(h.service.save('materials','M','',2)).rejects.toThrow()
 expect(h.transaction.set).not.toHaveBeenCalled()
})
