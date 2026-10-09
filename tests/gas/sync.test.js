import {it,expect,vi} from 'vitest'
import * as client from '../../src/services/gasClient'
import {createTestStore} from '../helpers/createStore'
import {gasHarness} from '../helpers/gasHarness'
it('does not treat opaque or rejected responses as successful sync',async()=> {
 globalThis.fetch=vi.fn().mockResolvedValue({type:'opaque',ok:false})
 await expect(client.syncDatabase('https://example.test', {revision:1},{requestId:'R'})).rejects.toThrow()
 globalThis.fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'error',message:'Invalid action'})})
 await expect(client.syncDatabase('https://example.test',{revision:1},{requestId:'R'})).rejects.toThrow('Invalid action')
})
it('changed endpoint replaces failed pending request destination',async()=> {
 const s=createTestStore();s.saveGasUrl('https://old.example.test')
 globalThis.fetch=vi.fn().mockRejectedValue(new Error('offline'))
 await s.syncWithGas();s.saveGasUrl('https://new.example.test');await s.syncWithGas()
 expect(globalThis.fetch.mock.calls.map(c=>c[0])).toEqual(['https://old.example.test','https://new.example.test'])
})
it('requires matching committed acknowledgement and checksum',async()=> {
 const snapshot={schemaVersion:3,revision:1,materials:[],orders:[]}
 globalThis.fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'success',data:{requestId:'WRONG',revision:1,status:'committed',checksum:'wrong'}})})
 await expect(client.syncDatabase('https://example.test',snapshot,{requestId:'R'})).rejects.toThrow()
 const checksum=client.snapshotChecksum(snapshot)
 globalThis.fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'success',data:{requestId:'R',revision:1,status:'committed',checksum}})})
 const ack=await client.syncDatabase('https://example.test',snapshot,{requestId:'R'})
 expect(ack.revision).toBe(1);expect(ack.requestId).toBe('R')
 const body=JSON.parse(globalThis.fetch.mock.calls[0][1].body);expect(body.action).toBe('syncAll');expect(body.data.snapshot).toEqual(snapshot)
})
it('frontend snapshot round-trips through the actual backend contract',async()=> {
 const h=gasHarness(),s=createTestStore();s.saveGasUrl('https://test.example')
 globalThis.fetch=vi.fn(async(_url,options)=>{const payload=JSON.parse(options.body);const response=h.post(payload.action,payload.data,payload.requestId);return {ok:true,json:async()=>response}})
 expect((await s.syncWithGas()).ok).toBe(true)
 expect(h.get({action:'getSnapshot'}).data.snapshot).toEqual(s.exportDatabase())
 expect(s.lastSyncedRevision).toBe(s.databaseRevision)
})
it('sync queues the latest revision while a request is in flight',async()=> {
 const s=createTestStore();s.saveGasUrl('https://test.example')
 let release
 const ack=(options)=>{const p=JSON.parse(options.body);return {ok:true,json:async()=>({status:'success',data:{requestId:p.requestId,revision:p.data.snapshot.revision,status:'committed',checksum:client.snapshotChecksum(p.data.snapshot)}})}}
 globalThis.fetch=vi.fn((_url,options)=>globalThis.fetch.mock.calls.length===1?new Promise(resolve=>{release=()=>resolve(ack(options))}):Promise.resolve(ack(options)))
 const pending=s.syncWithGas();s.saveMenu({name:'latest',prices:{PLAT01:10},recipe:[]});await s.syncWithGas();release();await pending
 expect(globalThis.fetch.mock.calls).toHaveLength(2);expect(s.lastSyncedRevision).toBe(s.databaseRevision)
 expect(JSON.parse(globalThis.fetch.mock.calls[1][1].body).data.snapshot.menus[0].name).toBe('latest')
})
