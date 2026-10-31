import {it,expect} from 'vitest'
import {indexedDB} from 'fake-indexeddb'
import {createCommandJournal} from '../../src/cloud/journal.js'
import {createCoreCommands} from '../../src/cloud/core/commands.js'
it('treats a server stop receipt as rejection rather than applying the original stock mutation',async()=>{
 const scope={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB,dbName:crypto.randomUUID()}),api={receipt:async()=>null,commit:async c=>({opId:c.opId,kind:'command_abort',sourceKind:c.kind})}
 const commands=createCoreCommands({journal,transport:api,getContext:()=>scope})
 expect(await commands.execute({opId:'STOPPED',kind:'inventory',payload:{}})).toMatchObject({ok:true,value:{opId:'STOPPED',kind:'inventory',rejected:true,code:'COMMAND_STOPPED'}})
 expect(await commands.pending()).toEqual([]);await journal.close()
})
it('can stop a retained session sale even when its journal entry was evicted',async()=>{
 const scope={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB,dbName:crypto.randomUUID()}),api={abandonSale:async()=>({abandoned:true})}
 const commands=createCoreCommands({journal,transport:api,getContext:()=>scope})
 expect(await commands.abandon({opId:'SESSION-ONLY',kind:'sale',payload:{lines:[{menuId:'M',qty:1}]}})).toMatchObject({ok:true,value:{opId:'SESSION-ONLY',kind:'sale',abandoned:true}})
 await journal.close()
})
it('recovers a receipt already resolved by another tab without submitting again',async()=>{
 const scope={projectId:'demo',shopId:'shop',generation:'g1',uid:'u',deviceId:'d',online:true,ready:true,protocolCertified:true}
 const journal=createCommandJournal({indexedDB,dbName:crypto.randomUUID()}),envelope={opId:'DONE',kind:'sale',payload:{}}
 await journal.prepare(scope,envelope);await journal.resolve(scope,envelope.opId,{opId:'DONE',kind:'sale',result:{subtotalCents:100}})
 const commands=createCoreCommands({journal,transport:{},getContext:()=>scope})
 expect(await commands.recover(envelope)).toMatchObject({ok:true,value:{opId:'DONE',kind:'sale'}})
 await journal.close()
})
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
