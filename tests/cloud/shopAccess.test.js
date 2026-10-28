import {it,expect,vi} from 'vitest'
import {createShopAccess,allowedEmailMap,googlePhoto} from '../../src/cloud/shopAccess.js'
function setup(){
 let next,fail,user={uid:'owner',email:'ARMWOOTTIPONG@gmail.com',displayName:'Owner',photoURL:'https://lh3.googleusercontent.com/a/photo'}
 const live={revision:7,allowedEmails:{'armwoottipong@gmail.com':true},userRoles:{'armwoottipong@gmail.com':'admin'}},tx={get:vi.fn(async()=>({exists:()=>true,data:()=>live})),update:vi.fn(),set:vi.fn()}
 const sdk={doc:(_db,...p)=>p.join('/'),collection:(_db,...p)=>p.join('/'),query:(...v)=>v,orderBy:vi.fn(),limit:vi.fn(),onSnapshot:vi.fn((_q,_opts,n,e)=>{next=n;fail=e;return stop}),setDoc:vi.fn(async()=>{}),serverTimestamp:()=>42,runTransaction:vi.fn((_db,fn)=>fn(tx))},stop=vi.fn(),presence=vi.fn(),errors=vi.fn()
 const api=createShopAccess({db:{},shopId:'shop',getUser:()=>user,onPresence:presence,onError:errors},sdk)
 return {api,sdk,tx,live,presence,errors,stop,snapshot:s=>next(s),fail:()=>fail({code:'permission-denied'}),user:v=>{user=v}}
}
it('normalizes valid emails and rejects duplicates, empty/oversized lists and invalid addresses',()=>{
 expect(allowedEmailMap([' A@example.com ','b@example.com'])).toEqual({'a@example.com':true,'b@example.com':true})
 for(const list of [[],['a@x'],['a@example.com','A@example.com'],Array(51).fill('a@example.com')])expect(()=>allowedEmailMap(list)).toThrow('INVALID_EMAILS')
 expect(googlePhoto('https://lh3.googleusercontent.com/a/photo')).toContain('googleusercontent')
 for(const url of ['javascript:alert(1)','https://googleusercontent.com.evil.test/a','https://evil.test/a'])expect(googlePhoto(url)).toBe('')
})
it('saves against the latest root revision and preserves all business fields',async()=>{
 const h=setup();const expected={...h.live.allowedEmails};h.live.revision=10
 const result=await h.api.save(['armwoottipong@gmail.com','staff@example.com'],expected)
 expect(result).toEqual({'armwoottipong@gmail.com':true,'staff@example.com':true})
 expect(h.tx.set).toHaveBeenCalledWith(expect.stringMatching(/^shops\/shop\/invitations\//),{email:'staff@example.com',role:'viewer',createdBy:'owner',createdAt:42,status:'pending'});expect(h.tx.update).toHaveBeenCalledWith('shops/shop',{allowedEmails:result,userRoles:{'armwoottipong@gmail.com':'admin','staff@example.com':'viewer'},revision:11,lastOpKind:'access',lastOpId:expect.any(String)})
})
it('rejects stale lists, self removal, duplicate submit and account changes before writing',async()=>{
 const h=setup();await expect(h.api.save(['other@example.com'],h.live.allowedEmails)).rejects.toThrow('KEEP_CURRENT_EMAIL')
 await expect(h.api.save(['armwoottipong@gmail.com'],{})).rejects.toThrow('ACCESS_CONFLICT');expect(h.tx.update).not.toHaveBeenCalled()
 let run;h.sdk.runTransaction.mockImplementation((_db,fn)=>new Promise(resolve=>{run=()=>resolve(fn(h.tx))}))
 const pending=h.api.save(['armwoottipong@gmail.com'],h.live.allowedEmails)
 await expect(h.api.save(['armwoottipong@gmail.com'],h.live.allowedEmails)).rejects.toThrow('ACCESS_BUSY')
 h.user({uid:'another',email:'armwoottipong@gmail.com'});run();await expect(pending).rejects.toThrow('SESSION_CHANGED');expect(h.tx.update).not.toHaveBeenCalled()
})
it('publishes only server-confirmed presence and clears listeners on close/error',()=>{
 const h=setup();h.api.watch();h.api.watch();expect(h.sdk.onSnapshot).toHaveBeenCalledTimes(1)
 h.snapshot({metadata:{fromCache:true},docs:[{id:'u',data:()=>({email:'old@example.com'})}]});expect(h.presence).toHaveBeenLastCalledWith([])
 h.snapshot({metadata:{fromCache:false},docs:[{id:'u',data:()=>({email:'a@example.com'})}]});expect(h.presence).toHaveBeenLastCalledWith([{uid:'u',email:'a@example.com'}])
 h.fail();expect(h.presence).toHaveBeenLastCalledWith([]);h.api.close();expect(h.stop).toHaveBeenCalledOnce()
 const calls=h.presence.mock.calls.length;h.snapshot({metadata:{fromCache:false},docs:[]});expect(h.presence).toHaveBeenCalledTimes(calls)
})
it('deduplicates heartbeats and uses the authenticated profile/server timestamp',async()=>{
 const h=setup();let resolve;h.sdk.setDoc.mockImplementation(()=>new Promise(r=>{resolve=r}))
 const pending=h.api.heartbeat();await h.api.heartbeat();expect(h.sdk.setDoc).toHaveBeenCalledTimes(1)
 expect(h.sdk.setDoc).toHaveBeenCalledWith('shops/shop/presence/owner',{email:'armwoottipong@gmail.com',displayName:'Owner',photoURL:'https://lh3.googleusercontent.com/a/photo',lastSeen:42})
 resolve();await pending;h.api.close();await h.api.heartbeat();expect(h.sdk.setDoc).toHaveBeenCalledTimes(1)
})

it('denies manager policy writes and stale role edits before mutating',async()=>{
 const h=setup();h.live.allowedEmails['manager@example.com']=true;h.live.userRoles={'manager@example.com':'manager'}
 h.user({uid:'manager',email:'manager@example.com'})
 await expect(h.api.save(Object.keys(h.live.allowedEmails),h.live.allowedEmails)).rejects.toThrow('ACCESS_DENIED')
 h.user({uid:'owner',email:'armwoottipong@gmail.com'})
 await expect(h.api.save(Object.keys(h.live.allowedEmails),h.live.allowedEmails,{'manager@example.com':'viewer'},{})).rejects.toThrow('ACCESS_CONFLICT')
 expect(h.tx.update).not.toHaveBeenCalled()
})
