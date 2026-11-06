import {it,expect,vi} from 'vitest'
import {createCatalogOrdering} from '../../src/cloud/core/catalogOrdering.js'
function setup(){
 const context={projectId:'demo',shopId:'shop',generation:'g',uid:'manager',online:true,ready:true,role:'manager'}
 const root={status:'active',generation:'g',catalogRevision:7,catalog:{menuIds:['A','B','OLD'],menus:{A:{},B:{},OLD:{}}}}
 const display={menus:{A:{name:'A'},B:{name:'B'},OLD:{deleted:true}},menuOrder:['A','B'],menuOrderRevision:2}
 const transaction={get:vi.fn(async ref=>({exists:()=>true,data:()=>ref.path.endsWith('/shop')?root:display})),update:vi.fn()}
 const sdk={doc:(_db,path)=>({path}),serverTimestamp:()=> 'server-time',runTransaction:vi.fn(async(_db,fn)=>fn(transaction)),onSnapshot:vi.fn(()=>vi.fn())}
 return {context,root,display,transaction,sdk,service:createCatalogOrdering({db:{},getContext:()=>context},sdk)}
}
it('saves order as one metadata write without changing recipes, prices, stock or journal commands',async()=>{
 const h=setup(),before=structuredClone(h.root)
 expect(await h.service.saveMenuOrder(['B','A'],{expectedOrderRevision:2,expectedCatalogRevision:7})).toMatchObject({menuOrder:['B','A','OLD'],menuOrderRevision:3})
 expect(h.transaction.update).toHaveBeenCalledTimes(1)
 expect(h.transaction.update.mock.calls[0][0].path).toBe('shops/shop/generations/g/display/catalog')
 expect(h.root).toEqual(before)
})
it.each([['A','A'],['A'],['B','UNKNOWN'],['A','B','OLD']])('rejects invalid/changed visible menu sets %j',async ids=>{
 const h=setup();await expect(h.service.saveMenuOrder(ids,{expectedOrderRevision:2,expectedCatalogRevision:7})).rejects.toThrow('INVALID_CATALOG_ORDER');expect(h.transaction.update).not.toHaveBeenCalled()
})
it.each([{expectedOrderRevision:1,expectedCatalogRevision:7},{expectedOrderRevision:2,expectedCatalogRevision:6}])('rejects a stale ordering transaction',async options=>{
 const h=setup();await expect(h.service.saveMenuOrder(['B','A'],options)).rejects.toThrow('CATALOG_ORDER_CHANGED');expect(h.transaction.update).not.toHaveBeenCalled()
})
it.each([{online:false},{ready:false},{role:'viewer'}])('blocks unavailable or unauthorized clients before writing',async change=>{
 const h=setup();Object.assign(h.context,change);await expect(h.service.saveMenuOrder(['B','A'],{expectedOrderRevision:2,expectedCatalogRevision:7})).rejects.toThrow();expect(h.sdk.runTransaction).not.toHaveBeenCalled()
})

it('only publishes server-confirmed order and stops listeners on close',()=>{
 const h=setup(),value=vi.fn(),error=vi.fn(),off=vi.fn()
 h.sdk.onSnapshot.mockReturnValue(off)
 h.service.watchMenuOrder(value,error)
 const callback=h.sdk.onSnapshot.mock.calls[0][2]
 callback({exists:()=>true,metadata:{fromCache:true},data:()=>h.display})
 expect(value).not.toHaveBeenCalled()
 callback({exists:()=>true,metadata:{fromCache:false},data:()=>h.display})
 expect(value).toHaveBeenCalledWith(expect.objectContaining({menuOrder:['A','B'],menuOrderRevision:2}))
 h.context.generation='next';callback({exists:()=>true,metadata:{fromCache:false},data:()=>h.display})
 expect(error.mock.calls[0][0].code).toBe('CONTEXT_CHANGED');expect(value).toHaveBeenCalledTimes(1)
 h.service.close();expect(off).toHaveBeenCalledTimes(1)
 expect(()=>h.service.watchMenuOrder(value,error)).toThrow('NOT_READY')
})
it('refuses a transaction whose account changes while server reads are pending',async()=>{
 const h=setup(),read=h.transaction.get.getMockImplementation()
 h.transaction.get.mockImplementation(async ref=>{const row=await read(ref);h.context.uid='another';return row})
 await expect(h.service.saveMenuOrder(['B','A'],{expectedOrderRevision:2,expectedCatalogRevision:7})).rejects.toThrow('CONTEXT_CHANGED')
 expect(h.transaction.update).not.toHaveBeenCalled()
})
