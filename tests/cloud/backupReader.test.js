// @vitest-environment node
import {it,expect,vi} from 'vitest'
import {createBackupReader} from '../../src/cloud/core/backupReader.js'
import {verifyBusinessBackup} from '../../src/cloud/core/businessBackup.js'
function setup(){
 const context={projectId:'demo-test',shopId:'shop',generation:'g',uid:'u',online:true,ready:true},root={status:'active',generation:'g',revision:4,materialIds:['M']}
 const rows={materials:[{id:'M',stock:6,lotIds:['L'],lotQty:{L:6},billPreparations:{tmp:{needed:1}},billPreparationId:'tmp'}],display:[{id:'catalog',legacyOrderCount:1}],orders:[{id:'O',opId:'O'}],operations:[],legacyRecords:[{id:'header',kind:'header',index:0,json:'{}'},{id:'orders_0',kind:'orders',index:0,json:'{}'}]}
 const sdk={doc:(_db,path)=>({path}),collection:(_db,path)=>({path}),query:(source,...clauses)=>({...source,clauses}),documentId:()=>'__name__',orderBy:(...x)=>({orderBy:x}),limit:n=>({limit:n}),startAfter:r=>({after:r.id}),getDocFromServer:vi.fn(async()=>({exists:()=>true,data:()=>structuredClone(root)})),getDocsFromServer:vi.fn(async ref=>({docs:rows[ref.path.split('/').at(-1)].map(row=>({id:row.id,data:()=>structuredClone(row)}))}))}
 return {context,root,rows,sdk,reader:createBackupReader({db:{},getContext:()=>context},sdk)}
}
it('exports all business collections, explicitly omits transient cache and verifies its file',async()=>{
 const h=setup(),r=await h.reader.read();expect(await verifyBusinessBackup(r.text)).toBe(true)
 const p=JSON.parse(r.text).payload;expect(p.revision).toBe(4);expect(p.counts).toMatchObject({materials:1,orders:1,legacyRecords:2})
 expect(r.text).not.toContain('"tmp"');expect(p.exclusions.materialFields).toContain('billPreparations')
 expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(5)
})
it('paginates every collection by document ID beyond 250 and never drops the last page',async()=>{
 const h=setup();let n=0;h.sdk.getDocsFromServer.mockImplementation(async ref=>{
  const name=ref.path.split('/').at(-1);if(name!=='orders')return {docs:h.rows[name].map(r=>({id:r.id,data:()=>r}))}
  const page=n++===0?Array.from({length:250},(_,i)=>({id:`O${i}`})):[{id:'LAST'}];return {docs:page.map(r=>({id:r.id,data:()=>r}))}
 });const r=await h.reader.read();expect(JSON.parse(r.text).payload.counts.orders).toBe(251)
 expect(h.sdk.getDocsFromServer.mock.calls.find(([q])=>q.clauses.some(c=>c.after))).toBeTruthy()
})
it('rejects missing material/archive documents, inconsistent lots and server query failures',async()=>{
 for(const damage of [h=>h.rows.materials=[],h=>h.rows.legacyRecords=[],h=>h.rows.materials[0].stock=7,h=>h.sdk.getDocsFromServer.mockRejectedValue(new Error('permission-denied'))]){
  const h=setup();damage(h);await expect(h.reader.read()).rejects.toThrow()
 }
})
it('fences remote commits, offline/context changes and closed readers',async()=>{
 const h=setup();let n=0;h.sdk.getDocFromServer.mockImplementation(async()=>({exists:()=>true,data:()=>({...h.root,revision:n++})}))
 await expect(h.reader.read()).rejects.toThrow('BACKUP_BUSY')
 h.context.online=false;await expect(h.reader.read()).rejects.toThrow('NOT_READY');h.context.online=true
 h.sdk.getDocsFromServer.mockImplementation(async()=>{h.context.uid='other';return {docs:[]}});await expect(h.reader.read()).rejects.toThrow('CONTEXT_CHANGED')
 h.reader.close();await expect(h.reader.read()).rejects.toThrow('NOT_READY')
})
it('retries one raced snapshot and prevents a duplicate export from starting',async()=>{
 const h=setup();let n=0;h.sdk.getDocFromServer.mockImplementation(async()=>({exists:()=>true,data:()=>({...h.root,revision:n++===0?4:5})}))
 const first=h.reader.read();await expect(h.reader.read()).rejects.toThrow('BACKUP_IN_PROGRESS')
 expect((await first).revision).toBe(5);expect(h.sdk.getDocsFromServer).toHaveBeenCalledTimes(10)
})
it('never returns a partial file above the document limit',async()=>{
 const h=setup();h.sdk.getDocsFromServer.mockImplementation(async()=>({docs:Array.from({length:250},(_,i)=>({id:`M${i}`,data:()=>({value:i})}))}))
 await expect(h.reader.read()).rejects.toThrow('BACKUP_TOO_LARGE')
})
it('rejects missing archive header, interior gaps and damaged JSON',async()=>{
 for(const damage of [h=>h.rows.legacyRecords.shift(),h=>h.rows.legacyRecords.push({id:'activityLogs_1',kind:'activityLogs',index:1,json:'{}'}),h=>h.rows.legacyRecords[1].json='broken']){
  const h=setup();damage(h);await expect(h.reader.read()).rejects.toThrow('BACKUP_INCOMPLETE')
 }
})
it('rejects an archive order count that contradicts its declared manifest',async()=>{
 const h=setup();h.rows.display[0].legacyOrderCount=0
 await expect(h.reader.read()).rejects.toThrow('BACKUP_INCOMPLETE')
})
