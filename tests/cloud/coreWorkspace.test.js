import {it,expect,vi,beforeEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CoreWorkspace from '../../src/cloud/core/CoreWorkspace.vue'
const h=vi.hoisted(()=>({execute:vi.fn(),load:vi.fn(),pending:vi.fn(),preview:vi.fn()}))
vi.mock('../../src/cloud/core/workspace.js',()=>({createCoreWorkspace:()=>({load:h.load,previewSale:h.preview,previewInventory:()=>true,execute:h.execute,pending:h.pending,reconcile:async()=>({ok:true,value:null}),close:()=>{}})}))
const state={user:{uid:'u'},shop:{generation:'g1',revision:1},serverReady:true}
beforeEach(()=>{
 sessionStorage.clear();h.pending.mockResolvedValue([]);h.execute.mockImplementation(async c=>({ok:true,value:{opId:c.opId,kind:c.kind,result:{subtotalCents:6900}}}))
 h.preview.mockReturnValue({subtotalCents:6900,approvedShortages:{}})
 h.load.mockResolvedValue({shop:{generation:'g1',revision:1,catalog:{menus:{M:{id:'M',active:true,pricesCents:{P:6900},optionIds:[],min:0,max:0}},groups:{},platforms:{P:{active:true}},platformIds:['P']}},materials:[],display:{trial:true,sourceDate:'2026-10-20',menus:{M:{name:'โยเกิร์ต'}},addons:{},platforms:{P:{name:'หน้าร้าน'}}},orders:[]})
})
it('opens the trial workspace, retains cart after uncertain results, and only clears after a server receipt',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state}});await flushPromises()
 expect(w.text()).toContain('ข้อมูลทดสอบ');await w.get('[data-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);expect(w.text()).toContain('ยังไม่ทราบผล')
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);expect(w.text()).toContain('บันทึกสำเร็จ');w.unmount()
})
it('keeps the cart while server readiness is lost and disables checkout',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state}});await flushPromises()
 await w.get('[data-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 await w.setProps({state:{...state,serverReady:false}})
 expect(w.get('[data-checkout]').attributes('disabled')).toBeDefined();expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})
it('restores its own cart and immutable pending command after reload and clears only its matching receipt',async()=>{
 let w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state}});await flushPromises()
 await w.get('[data-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await w.get('[data-checkout]').trigger('click');await flushPromises()
 const command=h.execute.mock.calls.at(-1)[0];w.unmount()
 w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state}});await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toEqual(command);expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})
it('does not clear this tab’s cart when reconciling a sale started in another tab',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
 sessionStorage.setItem(key,JSON.stringify({cart:[{menuId:'M',qty:1,optionIds:[]}],platformId:'P'}))
 h.pending.mockResolvedValue([{envelope:{kind:'sale',opId:'OTHER-TAB',payload:{}}}])
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state}});await flushPromises()
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})
