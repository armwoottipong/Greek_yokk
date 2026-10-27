import {it,expect,vi} from 'vitest'
import {createReportReader} from '../../src/cloud/core/reportReader.js'
function setup(count=2){
 const context={projectId:'demo-test',shopId:'shop',generation:'g',uid:'u',ready:true,online:true},root={status:'active',generation:'g',revision:4}
 const sdk={doc:vi.fn((_db,path)=>({path})),collection:(_db,path)=>({path}),where:(...args)=>({where:args}),orderBy:(...args)=>({orderBy:args}),limit:n=>({limit:n}),documentId:()=>'__name__',startAfter:d=>({after:d.id}),query:(source,...clauses)=>({...source,clauses}),Timestamp:{fromMillis:ms=>({ms})},getDocFromServer:vi.fn(async ref=>({exists:()=>true,data:()=>ref.path.endsWith('orders_0')?{json:JSON.stringify({orderId:'OLD'})}:root})),getDocsFromServer:vi.fn()}
 const pages=[Array.from({length:count},(_,i)=>({id:`N${i}`,data:()=>({opId:`N${i}`})}))]
 sdk.getDocsFromServer.mockImplementation(async()=>({docs:pages.shift()||[]}))
 const reader=createReportReader({db:{},getContext:()=>context},sdk)
 return {reader,sdk,context,root,pages}
}
it('pages beyond 100 with document-ID ties and Bangkok bounds instead of silently truncating',async()=>{
 const h=setup(250);h.pages.push([{id:'LAST',data:()=>({opId:'LAST'})}])
 const result=await h.reader.read({start:'2026-10-27',end:'2026-10-27'},{legacyOrderCount:1})
 expect(result.receipts).toHaveLength(251);expect(result.legacyOrders).toEqual([{orderId:'OLD'}])
 const clauses=h.sdk.getDocsFromServer.mock.calls[0][0].clauses
 expect(clauses).toContainEqual({orderBy:['__name__','asc']})
 expect(clauses).toContainEqual({where:['createdAt','>=',{ms:Date.parse('2026-10-26T17:00:00Z')}]})
 expect(h.sdk.getDocsFromServer.mock.calls[1][0].clauses).toContainEqual({after:'N249'})
})
it('caches immutable history and a same-revision range, but invalidates native data on root advancement',async()=>{
 const h=setup();await h.reader.read({start:null,end:null},{legacyOrderCount:1})
 await h.reader.read({start:null,end:null},{legacyOrderCount:1});expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(1)
 h.root.revision++;await h.reader.read({start:null,end:null},{legacyOrderCount:1})
 expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(2)
 expect(h.sdk.getDocFromServer.mock.calls.filter(([r])=>r.path.endsWith('orders_0'))).toHaveLength(1)
})
it('retries a changing root without returning the partial first attempt',async()=>{
 const h=setup();let rootReads=0
 h.sdk.getDocFromServer.mockImplementation(async()=>({exists:()=>true,data:()=>({...h.root,revision:++rootReads===1?4:5})}))
 h.pages.push([{id:'NEW',data:()=>({opId:'NEW'})}])
 const r=await h.reader.read({start:null,end:null},{legacyOrderCount:0})
 expect(r.shopRevision).toBe(5);expect(r.receipts).toEqual([{opId:'NEW'}])
})
it('rejects changed identities and offline reads instead of leaking a cached financial report',async()=>{
 const h=setup();h.sdk.getDocsFromServer.mockImplementationOnce(async()=>{h.context.uid='other';return {docs:[]}})
 await expect(h.reader.read({start:null,end:null},{legacyOrderCount:0})).rejects.toThrow('CONTEXT_CHANGED')
 h.context.online=false;await expect(h.reader.read({start:null,end:null},{legacyOrderCount:0})).rejects.toThrow('NOT_READY')
})
it('fails closed on missing archive, excessive manifest or query failure',async()=>{
 const h=setup();h.sdk.getDocFromServer.mockImplementation(async ref=>({exists:()=>!ref.path.includes('legacyRecords'),data:()=>h.root}))
 await expect(h.reader.read({start:null,end:null},{legacyOrderCount:1})).rejects.toThrow('REPORT_INCOMPLETE_HISTORY')
 await expect(h.reader.read({start:null,end:null},{legacyOrderCount:10001})).rejects.toThrow('REPORT_HISTORY_TOO_LARGE')
 h.sdk.getDocsFromServer.mockRejectedValue(new Error('permission-denied'))
 await expect(h.reader.read({start:null,end:null},{legacyOrderCount:0})).rejects.toThrow('permission-denied')
})

it('never returns truncated totals when native pages exceed the admission bound',async()=>{
 const h=setup(0);h.pages.length=0
 for(let p=0;p<40;p++)h.pages.push(Array.from({length:250},(_,i)=>({id:`N${p*250+i}`,data:()=>({opId:`N${p*250+i}`})})))
 h.pages.push([{id:'EXCESS',data:()=>({opId:'EXCESS'})}])
 await expect(h.reader.read({start:null,end:null})).rejects.toThrow('REPORT_TOO_LARGE')
 expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(41)
})
it('rejects continuously advancing roots and disposed readers',async()=>{
 const h=setup(0);let revision=0
 h.sdk.getDocFromServer.mockImplementation(async()=>({exists:()=>true,data:()=>({...h.root,revision:revision++})}))
 await expect(h.reader.read({start:null,end:null})).rejects.toThrow('REPORT_BUSY')
 h.reader.close();await expect(h.reader.read({start:null,end:null})).rejects.toThrow('NOT_READY')
})
