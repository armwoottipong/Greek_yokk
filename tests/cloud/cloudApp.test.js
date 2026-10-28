import {it,expect,vi,beforeEach,afterEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CloudApp from '../../src/CloudApp.vue'
const h=vi.hoisted(()=>({sessions:[],client:vi.fn(()=>({auth:{},db:{}}))}))
vi.mock('../../src/cloud/firebaseClient.js',()=>({getFirebaseClient:h.client}))
vi.mock('../../src/cloud/session.js',()=>({createShopSession:vi.fn(options=>{
 const s={options,start:vi.fn(),signIn:vi.fn(async()=>({ok:true})),signOut:vi.fn(async()=>({ok:true})),dispose:vi.fn()};h.sessions.push(s);return s
})}))
vi.mock('../../src/composables/appStartup.js',()=>({finishAppStartup:vi.fn()}))
const connection={mode:'emulator',shopId:'greek-yogg',config:{projectId:'demo-greek-yogg'}}
let w
beforeEach(()=>{h.sessions.length=0;h.client.mockClear()})
afterEach(()=>w?.unmount())
const publish=async patch=>{h.sessions.at(-1).options.onState({phase:'signed_out',user:null,shop:null,serverReady:false,message:'',...patch});await flushPromises()}
it('starts the real session boundary and lets the user invoke Google login without mounting a local POS',async()=>{
 w=mount(CloudApp,{props:{connection}})
 await publish({phase:'signed_out'})
 expect(h.client).toHaveBeenCalledWith({mode:'emulator',config:connection.config})
 expect(h.sessions[0].start).toHaveBeenCalledOnce()
 await w.get('button[data-sign-in]').trigger('click')
 expect(h.sessions[0].signIn).toHaveBeenCalledOnce()
 expect(w.text()).toContain('Google');expect(w.find('[data-local-pos]').exists()).toBe(false)
 expect(w.find('[data-local-link]').exists()).toBe(false);expect(w.text()).not.toContain('ระบบเดิม')
})
it('disables duplicate login while the popup is pending and displays a recoverable error',async()=>{
 w=mount(CloudApp,{props:{connection}});await publish({phase:'signing_in'})
 expect(w.get('[data-sign-in]').attributes('disabled')).toBeDefined()
 await publish({message:'เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ'})
 expect(w.get('[role="alert"]').text()).toContain('บล็อก');expect(w.get('[data-sign-in]').attributes('disabled')).toBeUndefined()
})
it.each(['loading','ready','maintenance','importing','setup_required','error','access_denied'])('does not expose checkout from %s authentication readiness alone',async phase=>{
 w=mount(CloudApp,{props:{connection}})
 await publish({phase,user:{uid:'a',email:'cashier@example.test'},serverReady:phase==='ready',shop:phase==='ready'?{generation:'g1'}:null})
 expect(w.text()).toContain('cashier@example.test')
 expect(w.find('button[data-sign-in]').exists()).toBe(false)
 expect(w.text()).not.toContain('ชำระเงินและตัดสต็อก')
 expect(w.find('[data-checkout]').exists()).toBe(false)
 if(phase==='ready')expect(w.text()).toContain('ยังไม่เปิดขาย')
})
it('reconnects through a fresh session and ignores disposed callbacks',async()=>{
 w=mount(CloudApp,{props:{connection}});const old=h.sessions[0]
 await publish({phase:'error',user:{uid:'a'},message:'โหลดข้อมูลร้านไม่ได้'})
 await w.get('[data-reconnect]').trigger('click')
 expect(old.dispose).toHaveBeenCalledOnce();expect(h.sessions).toHaveLength(2)
 old.options.onState({phase:'ready',user:{email:'old@example.test'},serverReady:true});await flushPromises()
 expect(w.text()).not.toContain('old@example.test')
 expect(h.sessions[1].start).toHaveBeenCalledOnce()
})
it('signs out and disposes subscriptions on unmount',async()=>{
 w=mount(CloudApp,{props:{connection}});await publish({phase:'ready',user:{uid:'a'},serverReady:true})
 await w.get('[data-sign-out]').trigger('click');expect(h.sessions[0].signOut).toHaveBeenCalledOnce()
 w.unmount();expect(h.sessions[0].dispose).toHaveBeenCalledOnce();w=null
})
it('keeps an active cart workspace during cache loss, and removes it immediately on account change',async()=>{
 w=mount(CloudApp,{props:{connection},global:{stubs:{CoreWorkspace:{props:['state'],template:'<div data-workspace>{{ state.user.uid }}:{{ state.shop.generation }}:{{ state.serverReady }}</div>'}}}})
 await publish({phase:'ready',user:{uid:'a'},serverReady:true,shop:{generation:'g1',revision:1,catalog:{},materialIds:[]}})
 expect(w.get('[data-workspace]').text()).toBe('a:g1:true')
 await publish({phase:'loading',user:{uid:'a'},serverReady:false,shop:null})
 expect(w.get('[data-workspace]').text()).toBe('a:g1:false')
 await publish({phase:'loading',user:{uid:'b'},serverReady:false,shop:null})
 expect(w.find('[data-workspace]').exists()).toBe(false)
 await publish({phase:'ready',user:{uid:'b'},serverReady:true,shop:{generation:'g2',revision:1,catalog:{},materialIds:[]}})
 expect(w.get('[data-workspace]').text()).toBe('b:g2:true')
})
it('removes the mounted workspace immediately when email access is revoked',async()=>{
 w=mount(CloudApp,{props:{connection},global:{stubs:{CoreWorkspace:{template:'<div data-workspace />'}}}})
 await publish({phase:'ready',user:{uid:'a'},serverReady:true,shop:{generation:'g1',revision:1,catalog:{},materialIds:[]}})
 expect(w.find('[data-workspace]').exists()).toBe(true)
 await publish({phase:'access_denied',user:{uid:'a',email:'removed@example.test'}})
 expect(w.find('[data-workspace]').exists()).toBe(false)
 expect(w.text()).toContain('บัญชีนี้ยังเข้าร้านไม่ได้');expect(w.find('[data-sign-out]').exists()).toBe(true)
})
