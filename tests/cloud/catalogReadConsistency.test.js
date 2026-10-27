import {it,expect,vi,beforeEach} from 'vitest'
const h=vi.hoisted(()=>({snapshot:vi.fn(),read:vi.fn()}))
vi.mock('firebase/firestore',async importOriginal=>({...await importOriginal(),doc:(_db,path)=>({path}),collection:(_db,path)=>({path}),getDocFromServer:h.read,getDocsFromServer:vi.fn(),query:vi.fn(),orderBy:vi.fn(),limit:vi.fn(),serverTimestamp:vi.fn()}))
vi.mock('../../src/cloud/firebaseClient.js',()=>({getFirebaseClient:()=>({db:{}})}))
vi.mock('../../src/cloud/journal.js',()=>({createCommandJournal:()=>({close(){}})}))
vi.mock('../../src/cloud/core/transport.js',()=>({createCoreTransport:()=>({snapshot:h.snapshot})}))
import {createCoreWorkspace} from '../../src/cloud/core/workspace.js'
const context={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true}
const state=revision=>({shop:{status:'active',generation:'g1',revision,catalogRevision:revision,materialIds:[]},materials:[]})
beforeEach(()=>{h.snapshot.mockReset();h.read.mockReset()})
it('retries if catalogue display belongs to a newer root revision than the material snapshot',async()=>{
 h.snapshot.mockResolvedValueOnce(state(1)).mockResolvedValue(state(2))
 h.read.mockImplementation(async ref=>({exists:()=>true,data:()=>ref.path.endsWith('display/catalog')?{menus:{M:{name:'New label'}}}:state(2).shop}))
 const api=createCoreWorkspace({connection:{},getContext:()=>context}),loaded=await api.load()
 expect(loaded.shop.revision).toBe(2);expect(h.snapshot).toHaveBeenCalledTimes(2);await api.close()
})
it('does not publish an inconsistent catalogue after repeated concurrent updates',async()=>{
 h.snapshot.mockResolvedValue(state(1));h.read.mockImplementation(async ref=>({exists:()=>true,data:()=>ref.path.endsWith('display/catalog')?{}:state(2).shop}))
 const api=createCoreWorkspace({connection:{},getContext:()=>context})
 await expect(api.load()).rejects.toThrow('SHOP_BUSY');expect(h.snapshot).toHaveBeenCalledTimes(3);await api.close()
})
