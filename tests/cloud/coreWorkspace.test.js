import {it,expect,vi,beforeEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CoreWorkspace from '../../src/cloud/core/CoreWorkspace.vue'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
const h=vi.hoisted(()=>({abandon:vi.fn(),execute:vi.fn(),load:vi.fn(),pending:vi.fn(),preview:vi.fn(),orders:vi.fn(),history:vi.fn()}))
vi.mock('../../src/cloud/core/workspace.js',()=>({createCoreWorkspace:()=>({load:h.load,previewSale:h.preview,previewInventory:()=>true,execute:h.execute,abandon:h.abandon,pending:h.pending,reconcile:async()=>({ok:true,value:null}),orders:h.orders,history:h.history,close:()=>{}})}))
const state={user:{uid:'u'},shop:{generation:'g1',revision:1},serverReady:true}
beforeEach(()=>{
 sessionStorage.clear();h.abandon.mockReset();h.orders.mockResolvedValue([]);h.history.mockResolvedValue([]);h.execute.mockClear();h.pending.mockResolvedValue([]);h.execute.mockImplementation(async c=>({ok:true,value:{opId:c.opId,kind:c.kind,result:{subtotalCents:6900}}}))
 h.preview.mockReturnValue({subtotalCents:6900,approvedShortages:{}})
 h.load.mockResolvedValue({shop:{generation:'g1',revision:1,catalog:{summaryMaterials:Array.from({length:15},(_,i)=>`M${i}`),menus:{M:{id:'M',active:true,pricesCents:{P:6900},optionIds:[],min:0,max:0}},groups:{},platforms:{P:{active:true}},platformIds:['P']}},materials:[],display:{trial:true,sourceDate:'2026-10-20',menus:{M:{name:'โยเกิร์ต'}},addons:{},platforms:{P:{name:'หน้าร้าน'}}},orders:[]})
})
it('shows the four-line limit for a sixteen-material shop and prevents creating a fifth line',async()=>{
 const d=await h.load();d.shop.catalog.summaryMaterials.push('M15');h.load.mockResolvedValue(d)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click')
 for(let i=0;i<4;i++){if(i)await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')}
 await w.get('[data-pos-menu="M"]').trigger('click')
 expect(w.findAll('[data-cart-line]')).toHaveLength(4);expect(w.text()).toContain('สูงสุด 4 รายการ');expect(w.get('[data-add-line]').attributes('disabled')).toBeDefined();w.unmount()
})
it('opens the trial workspace, retains cart after uncertain results, and only clears after a server receipt',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 expect(w.text()).toContain('ข้อมูลทดสอบ');await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);expect(w.text()).toContain('ยังไม่ทราบผล')
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);expect(w.text()).toContain('บันทึกสำเร็จ');w.unmount()
})
it('keeps the cart while server readiness is lost and disables checkout',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 await w.setProps({state:{...state,serverReady:false}})
 expect(w.get('[data-checkout]').attributes('disabled')).toBeDefined();expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})
it('restores its own cart and immutable pending command after reload and clears only its matching receipt',async()=>{
 let w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await w.get('[data-checkout]').trigger('click');await flushPromises()
 const command=h.execute.mock.calls.at(-1)[0];w.unmount()
 w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-cart-open]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toEqual(command);expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})
it('does not clear this tab’s cart when reconciling a sale started in another tab',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
 sessionStorage.setItem(key,JSON.stringify({cart:[{menuId:'M',qty:1,optionIds:[]}],platformId:'P'}))
 h.pending.mockResolvedValue([{envelope:{kind:'sale',opId:'OTHER-TAB',payload:{}}}])
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 await w.get('[data-cart-open]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})

it('uses the original product navigation, catalogue and cart without creating a local POS store',async()=>{
 const before=Object.keys(localStorage).sort()
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 expect(w.find('.brand-sidebar').exists()).toBe(true)
 expect(w.findAll('.brand-navigation button').map(b=>b.find('div span').text())).toEqual(['ภาพรวม & งบต้นทุน','แคชเชียร์ (POS)','จัดการเมนู','จัดการ Add-on','คลังวัตถุดิบ & Package','ตั้งค่า & ระบบ API'])
 expect(w.find('.brand-navigation button[title^="จัดการเมนู"] .font-number').text()).toBe('1 รายการ')
 expect(w.find('.brand-sidebar').text()).toContain('สถานะคลัง & ต้นทุน')
 expect(w.find('.brand-sidebar').text()).toContain('Firebase')
 expect(w.find('.cloud-sidebar-status').exists()).toBe(false)
 expect(w.find('.pos-catalog').exists()).toBe(true)
 expect(w.find('.pos-menu-card').exists()).toBe(true)
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
 await w.get('[data-cart-open]').trigger('click');await flushPromises()
 expect(w.find('.cart-body').exists()).toBe(true)
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 expect(Object.keys(localStorage).filter(k=>!before.includes(k))).toEqual(['gy-cloud-device-v1'].filter(k=>!before.includes(k)))
 w.unmount()
})
it('locks original cart quantity and platform controls while a server result is uncertain',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await w.get('[data-cart-open]').trigger('click');await flushPromises()
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.get('button[aria-label="เพิ่มจำนวน โยเกิร์ต"]').attributes('disabled')).toBeDefined()
 expect(w.get('[role="tab"]').attributes('disabled')).toBeDefined()
 expect(w.get('[data-pos-menu="M"]').attributes('disabled')).toBeDefined()
 expect(w.find('[data-package-review]').exists()).toBe(false)
 w.unmount()
})

it('stages receiving with the original stock UI and only sends Firebase on original draft confirmation',async()=>{
 const f=summaryFixture(),m=f.materials[0];m.name='นม';m.unit='มล.';m.packSize=1000;m.packUnit='กล่อง';m.packCostCents=6000
 const d={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{},addons:{},platforms:{}},orders:[]};h.load.mockResolvedValue(d)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('.brand-navigation button[title="คลังวัตถุดิบ & Package"]').trigger('click');await flushPromises()
 expect(w.find('.desktop-material-table').exists()).toBe(true);expect(w.get('.stock-row-cost').text()).toContain('฿60')
 await w.get('button[aria-label="รับเข้า นม"]').trigger('click');await flushPromises()
 await w.get('input[aria-label="จำนวนแพ็คที่รับเข้า"]').setValue('1');await w.get('input[aria-label="ราคาซื้อ"]').setValue('60')
 await w.get('#StockInModal .receipt-footer .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute).not.toHaveBeenCalled();expect(w.find('[data-review-stock-drafts]').exists()).toBe(true)
 await w.get('[data-review-stock-drafts]').trigger('click');await flushPromises()
 await w.get('#stock-draft-review .draft-review-actions .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'inventory',payload:{materialId:m.id,input:{qtyQ:100000,unitCost:.06}}});w.unmount()
})
it('produces through the original modal then confirms cancellation before sending a cloud command',async()=>{
 const f=summaryFixture(),output=f.materials[12];output.name='โยเกิร์ต';output.unit='กรัม';output.productionRecipe={yieldQ:1000,inputIds:['S0','S1'],quantities:[100,100]}
 const d={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{M:{name:'โยเกิร์ต'}},addons:{},platforms:{P:{name:'หน้าร้าน'}}},orders:[]};h.load.mockResolvedValue(d)
 h.orders.mockResolvedValue([{opId:'BILL',status:'committed',subtotalCents:6900,platformId:'P',lines:[{menuId:'M',qty:1}]}])
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('.brand-navigation button[title="คลังวัตถุดิบ & Package"]').trigger('click');await flushPromises()
 await w.get('button[title="ผลิตตามสูตร (หักสต็อกวัตถุดิบรองอัตโนมัติ)"]').trigger('click');await flushPromises()
 await w.get('input[aria-label="จำนวนรอบผลิต"]').setValue('.5')
 await w.get('#StockInModal .receipt-footer .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute).not.toHaveBeenCalled()
 await w.get('[data-review-stock-drafts]').trigger('click');await flushPromises()
 await w.get('#stock-draft-review .draft-review-actions .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'produce',payload:{materialId:output.id,input:{qtyQ:500}}})
 await w.get('button[aria-label="ประวัติบิลขายและคืนบิล"]').trigger('click');await flushPromises()
 await w.get('.order-list button').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.filter(([c])=>c.kind==='cancel')).toHaveLength(0)
 await w.get('#cloud-cancel-order .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'cancel',payload:{orderId:'BILL'}});w.unmount()
})

it('opens the original receipt only after its matching server-confirmed sale',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
 expect(w.find('.receipt-paper').exists()).toBe(false)
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.find('.receipt-paper').exists()).toBe(false)
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.get('.receipt-paper').text()).toContain('฿69')
 expect(w.get('.receipt-paper').text()).toContain(h.execute.mock.calls.at(-1)[0].opId)
 w.unmount()
})


it('keeps checkout locked and spinning until the post-write server reload finishes',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await w.get('[data-cart-open]').trigger('click');await flushPromises()
 const snapshot=await h.load();let resolveLoad
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveLoad=r}))
 await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.get('[data-checkout]').attributes('disabled')).toBeDefined()
 expect(w.get('[data-checkout]').attributes('aria-busy')).toBe('true')
 await w.get('[data-checkout]').trigger('click');expect(h.execute).toHaveBeenCalledTimes(1)
 resolveLoad(snapshot);await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})


it('holds the same visible cancellation button through the receipt and order reload',async()=>{
 h.orders.mockResolvedValue([{opId:'BILL',status:'committed',subtotalCents:6900,platformId:'P',lines:[{menuId:'M',qty:1}]}])
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('button[aria-label="ประวัติบิลขายและคืนบิล"]').trigger('click');await flushPromises()
 await w.get('.order-list button').trigger('click');await flushPromises()
 let resolve;h.orders.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 const button=()=>w.get('#cloud-cancel-order .ui-button--primary')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');expect(button().attributes('disabled')).toBeDefined()
 await button().trigger('click');expect(h.execute).toHaveBeenCalledTimes(1)
 resolve([]);await flushPromises();expect(w.find('#cloud-cancel-order .ui-button--primary').exists()).toBe(false);w.unmount()
})


it('spins on stop-pending-sale and suppresses duplicates until server data has reloaded',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 await w.get('[data-checkout]').trigger('click');await flushPromises()
 const d=await h.load();let resolveLoad
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveLoad=r}))
 h.abandon.mockResolvedValue({ok:true,value:{kind:'sale',abandoned:true,opId:'stopped'}})
 const button=()=>w.get('.pending-panel .ui-button--secondary')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');await button().trigger('click');expect(h.abandon).toHaveBeenCalledTimes(1)
 resolveLoad(d);await flushPromises();expect(w.find('.pending-panel').exists()).toBe(false);expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})


it('keeps manual reload spinning through the orders read and shares an in-flight reload',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('button[aria-label="ประวัติบิลขายและคืนบิล"]').trigger('click');await flushPromises()
 let resolve;h.orders.mockImplementationOnce(()=>new Promise(r=>{resolve=r}));const before=h.orders.mock.calls.length
 const button=()=>w.get('button[aria-label="โหลดข้อมูลล่าสุด"]')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');await button().trigger('click');expect(h.orders.mock.calls.length).toBe(before+1)
 resolve([]);await flushPromises();expect(button().attributes('aria-busy')).toBeUndefined();w.unmount()
})


it('starts a fresh read after an update even if a manual reload began before the write',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await w.get('[data-cart-open]').trigger('click');await flushPromises()
 const old=await h.load(),fresh={...old,shop:{...old.shop,revision:old.shop.revision+1}};let resolveOld
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveOld=r})).mockResolvedValueOnce(fresh)
 const before=h.load.mock.calls.length
 await w.get('button[aria-label="โหลดข้อมูลล่าสุด"]').trigger('click');await flushPromises()
 await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(h.execute).toHaveBeenCalledTimes(1)
 resolveOld(old);await flushPromises()
 expect(h.load.mock.calls.length).toBe(before+2);expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})
