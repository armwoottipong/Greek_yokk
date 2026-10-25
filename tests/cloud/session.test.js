import {it,expect,vi} from 'vitest'
import {createShopSession} from '../../src/cloud/session.js'
function setup() {
 let authChanged,authError
 const snapshots=[],states=[]
 const sdk={onAuthStateChanged:vi.fn((_a,next,error)=>{authChanged=next;authError=error;return vi.fn()}),
  doc:vi.fn((_db,...parts)=>parts.join('/')),onSnapshot:vi.fn((ref,_opts,next,error)=>{const sub={ref,next,error,stop:vi.fn()};snapshots.push(sub);return sub.stop}),
  GoogleAuthProvider:class {},signInWithPopup:vi.fn(async()=>({user:{uid:'a'}})),signOut:vi.fn(async()=>{})}
 const session=createShopSession({auth:{},db:{},shopId:'main-shop',onState:state=>states.push(state)},sdk)
 const shop=(sub,data={status:'active',generation:'g1'},fromCache=false)=>sub.next({exists:()=>true,data:()=>data,metadata:{fromCache}})
 return {sdk,session,snapshots,states,auth:user=>authChanged(user),authError:e=>authError(e),shop,last:()=>states.at(-1)}
}
it('requires login but no profile, membership or role lookup',()=>{
 const h=setup();h.session.start();h.auth(null);expect(h.last().phase).toBe('signed_out');expect(h.snapshots).toHaveLength(0)
 h.auth({uid:'brand-new',email:'new@example.test'});expect(h.last().phase).toBe('loading')
 h.shop(h.snapshots[0]);expect(h.last()).toMatchObject({phase:'ready',serverReady:true,user:{uid:'brand-new'},shop:{generation:'g1'}})
 expect(h.sdk.doc).toHaveBeenCalledTimes(1);expect(h.snapshots[0].ref).toBe('shops/main-shop')
 expect(h.last()).not.toHaveProperty('role');expect(h.last()).not.toHaveProperty('canWrite')
})
it('does not treat cache data as server readiness',()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.shop(h.snapshots[0],undefined,true)
 expect(h.last().phase).toBe('loading');expect(h.last().serverReady).toBe(false)
 h.shop(h.snapshots[0]);expect(h.last().serverReady).toBe(true)
})
it('clears shop immediately on account switch and ignores late callbacks from the old account',()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});const old=h.snapshots[0];h.shop(old)
 h.auth({uid:'b'});expect(old.stop).toHaveBeenCalledOnce();expect(h.last().shop).toBe(null)
 h.shop(old,{status:'active',generation:'LEAK'});expect(h.last().shop).toBe(null)
 h.shop(h.snapshots[1]);expect(h.last().user.uid).toBe('b')
})
it('clears data before signOut resolves',async()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.shop(h.snapshots[0])
 let resolve;h.sdk.signOut.mockImplementation(()=>new Promise(r=>{resolve=r}))
 const pending=h.session.signOut();expect(h.last()).toMatchObject({phase:'signed_out',shop:null,user:null,serverReady:false})
 resolve();expect(await pending).toEqual({ok:true})
})
it.each(['importing','maintenance'])('shows %s without server-ready access',status=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.shop(h.snapshots[0],{status,generation:'g1'})
 expect(h.last().phase).toBe(status);expect(h.last().serverReady).toBe(false)
})
it('reports missing shop setup without inventing a role-approval step',()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.snapshots[0].next({exists:()=>false,metadata:{fromCache:false}})
 expect(h.last()).toMatchObject({phase:'setup_required',shop:null,serverReady:false})
})
it('deduplicates popup login and reports cancellation in Thai',async()=>{
 const h=setup();h.session.start();h.auth(null)
 let reject;h.sdk.signInWithPopup.mockImplementation(()=>new Promise((_r,j)=>{reject=j}))
 const a=h.session.signIn(),b=h.session.signIn();expect(h.sdk.signInWithPopup).toHaveBeenCalledTimes(1)
 reject({code:'auth/popup-closed-by-user'})
 expect(await a).toMatchObject({ok:false,code:'auth/popup-closed-by-user'});await b
 expect(h.last().message).toContain('ยกเลิก');expect(h.last().shop).toBe(null)
})
it('disposes all listeners and prevents future callbacks or login calls',async()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.session.dispose();const count=h.states.length
 h.shop(h.snapshots[0]);h.auth({uid:'b'});expect(h.states).toHaveLength(count)
 expect(h.snapshots[0].stop).toHaveBeenCalledOnce();expect(await h.session.signIn()).toMatchObject({ok:false,code:'DISPOSED'})
})
it('clears stale data on listener failure and does not mark cached stock writable',()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.shop(h.snapshots[0]);h.snapshots[0].error({code:'permission-denied'})
 expect(h.last()).toMatchObject({phase:'error',serverReady:false,shop:null,code:'permission-denied'})
})
it.each([
 ['auth/unauthorized-domain','โดเมน'],
 ['auth/operation-not-allowed','Google'],
 ['auth/invalid-api-key','การตั้งค่า'],
])('explains actionable login setup failures: %s',async(code,word)=>{
 const h=setup();h.session.start();h.auth(null);h.sdk.signInWithPopup.mockRejectedValue({code})
 expect(await h.session.signIn()).toMatchObject({ok:false,code})
 expect(h.last().message).toContain(word)
})
it('distinguishes successful login from denied database access',()=>{
 const h=setup();h.session.start();h.auth({uid:'a'});h.snapshots[0].error({code:'permission-denied'})
 expect(h.last()).toMatchObject({user:{uid:'a'},serverReady:false,phase:'error'})
 expect(h.last().message).toContain('เข้าสู่ระบบสำเร็จ')
 expect(h.last().message).toContain('ฐานข้อมูล')
})
