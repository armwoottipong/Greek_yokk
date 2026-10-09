import {it,expect,vi} from 'vitest'
import * as client from '../../src/services/gasClient'
it('does not treat opaque or rejected responses as successful sync',async()=> {
 globalThis.fetch=vi.fn().mockResolvedValue({type:'opaque',ok:false})
 await expect(client.syncDatabase('https://example.test', {revision:1},{requestId:'R'})).rejects.toThrow()
 globalThis.fetch=vi.fn().mockResolvedValue({ok:true,json:async()=>({status:'error',message:'Invalid action'})})
 await expect(client.syncDatabase('https://example.test',{revision:1},{requestId:'R'})).rejects.toThrow('Invalid action')
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
