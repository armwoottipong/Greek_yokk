import {it,expect} from 'vitest'
import {indexedDB} from 'fake-indexeddb'
import {createCommandJournal} from '../../src/cloud/journal.js'
import {createCoreCommands} from '../../src/cloud/core/commands.js'
it('retains a lost response through reload, resolves the same receipt and never sends a second sale',async()=>{
 const scope={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB,dbName:crypto.randomUUID()}),receipts=new Map();let writes=0
 const api={receipt:async(k,id)=>receipts.get(id)||null,commit:async c=>{writes++;receipts.set(c.opId,{opId:c.opId,kind:'sale_set',createdAt:{toMillis:()=>1}});throw new Error('response lost')}}
 const commands=createCoreCommands({journal,transport:api,getContext:()=>scope}),envelope={opId:'ONE',kind:'sale',payload:{lines:[]}}
 expect((await commands.execute(envelope)).ok).toBe(false)
 expect((await commands.pending())[0].envelope).toEqual(envelope)
 const reloaded=createCoreCommands({journal,transport:api,getContext:()=>scope})
 expect((await reloaded.reconcile()).ok).toBe(true);expect(await reloaded.pending()).toEqual([]);expect(writes).toBe(1)
 await journal.close()
})
it('maps inventory commands and resolves an explicitly abandoned sale without calling it a completed sale',async()=>{
 const scope={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB,dbName:crypto.randomUUID()});let kind
 const api={receipt:async()=>null,commit:async c=>{kind=c.kind;return {opId:c.opId,kind:'stock_in'}},abandonSale:async()=>({abandoned:true})}
 const c=createCoreCommands({journal,transport:api,getContext:()=>scope})
 expect((await c.execute({opId:'IN',kind:'inventory',payload:{}})).ok).toBe(true);expect(kind).toBe('receive')
 await journal.prepare(scope,{opId:'SALE',kind:'sale',payload:{}})
 expect((await c.abandon()).value.abandoned).toBe(true);expect(await c.pending()).toEqual([])
 await journal.close()
})
