import {it,expect,vi,beforeEach} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import CartPanel from '../../src/components/pos/CartPanel.vue'
import CoreWorkspace from '../../src/cloud/core/CoreWorkspace.vue'
import OrderEntryPanel from '../../src/cloud/core/OrderEntryPanel.vue'
import {summaryFixture} from '../firestore/summaryFixture.js'
import {materialRegistryShop} from '../firestore/summaryMaterialAuthor.js'
import {businessDay,dayKey} from '../../src/cloud/core/orderEntry.js'
const h=vi.hoisted(()=>({recover:vi.fn(),discardUnsent:vi.fn(),abandon:vi.fn(),execute:vi.fn(),load:vi.fn(),pending:vi.fn(),preview:vi.fn(),orders:vi.fn(),history:vi.fn(),report:vi.fn(),legacyReceipt:vi.fn(),savePreorder:vi.fn()}))
vi.mock('../../src/cloud/core/workspace.js',()=>({createCoreWorkspace:()=>({images:{watch:(_kind,_id,cb)=>{cb({dataURL:"",revision:0});return ()=>{}},save:vi.fn()},load:h.load,previewSale:h.preview,previewInventory:()=>true,execute:h.execute,abandon:h.abandon,pending:h.pending,recover:h.recover,discardUnsent:h.discardUnsent,reconcile:async()=>({ok:true,value:null}),orders:h.orders,history:h.history,legacyReceipt:h.legacyReceipt,report:h.report,savePreorder:h.savePreorder,close:()=>{}})}))
vi.mock('../../src/cloud/firebaseClient.js',()=>({getFirebaseClient:()=>({db:{}})}))
vi.mock('../../src/cloud/shopAccess.js',async original=>({...await original(),createShopAccess:()=>({watch(){},watchInvitations(){},heartbeat:async()=>{},close(){}})}))
async function openCart(w){const button=w.find('[data-cart-open]');if(button.exists()&&button.attributes('aria-expanded')!=='true')await button.trigger('click');await flushPromises()}
const state={user:{uid:'u',email:'u@example.com'},shop:{generation:'g1',revision:1,allowedEmails:{'u@example.com':true},userRoles:{'u@example.com':'admin'}},serverReady:true}
it('opens the calendar with POS off and records a future draft through the existing cart',async()=>{
 const disabled={...state,shop:{...state.shop,posEnabled:false}}
 const d=await h.load();d.shop.catalogRevision=1
 h.savePreorder.mockReset().mockImplementation(async input=>{
  const row={pickupDay:input.pickupDay,platformId:input.platformId,quoteCents:input.subtotalCents,draftJson:JSON.stringify(input)}
  h.load.mockResolvedValue({...d,shop:{...d.shop,revision:2,preorders:{[input.id]:row}}})
  return row
 })
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state:disabled},global:{stubs:{teleport:true}}})
 try{
  await flushPromises()
  const today=dayKey(businessDay())
  const tomorrow=dayKey(businessDay()+1)
  const current=w.get(`[data-calendar-day="${today}"]`)
  expect(current.attributes('aria-pressed')).toBe('true')
  expect(current.attributes('aria-current')).toBe('date')
  await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
  if(today.slice(0,7)!==tomorrow.slice(0,7))await w.get('[aria-label="เดือนถัดไป"]').trigger('click')
  await w.get(`[data-calendar-day="${tomorrow}"]`).trigger('click')
  await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
  await openCart(w)
  expect(w.get('[data-checkout]').text()).toContain('บันทึก Pre-order')
  await w.get('[data-checkout]').trigger('click');await flushPromises()
  expect(h.savePreorder).toHaveBeenCalledWith(expect.objectContaining({pickupDay:businessDay()+1,subtotalCents:6900,lines:[expect.objectContaining({menuId:'M',qty:1})]}))
  expect(h.execute).not.toHaveBeenCalled()
  await w.get('[data-calendar-today]').trigger('click')
  expect(w.getComponent(CartPanel).props('model').cart[0].qty).toBe(1)
  await w.get('.brand-navigation button[title="ภาพรวม & งบต้นทุน"]').trigger('click');await flushPromises()
  expect(w.get('[aria-labelledby="dashboard-preorders-title"]').text()).toContain('ยอดจอง ฿69')
 }finally{w.unmount()}
})
it('parks each date cart and restores it after changing date and reopening the page',async()=>{
 const disabled={...state,shop:{...state.shop,posEnabled:false}}
 const mountPage=()=>mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state:disabled},global:{stubs:{teleport:true}}})
 let w=mountPage()
 const add=async()=>{await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')}
 const qty=()=>w.getComponent(CartPanel).props('model').cart[0]?.qty??0
 try{
  await flushPromises();await add();expect(qty()).toBe(1)
  const today=dayKey(businessDay()),tomorrow=dayKey(businessDay()+1)
  const dayCell=date=>w.get(`[data-calendar-day="${date}"]`)
  expect(dayCell(today).find('[data-calendar-cart]').exists()).toBe(true)
  if(today.slice(0,7)!==tomorrow.slice(0,7))await w.get('[aria-label="เดือนถัดไป"]').trigger('click')
  await w.get(`[data-calendar-day="${tomorrow}"]`).trigger('click');expect(qty()).toBe(0)
  expect(dayCell(tomorrow).find('[data-calendar-cart]').exists()).toBe(false)
  await add();await add();expect(qty()).toBe(2)
  expect(dayCell(tomorrow).find('[data-calendar-cart]').exists()).toBe(true)
  await w.get('[data-calendar-today]').trigger('click');expect(qty()).toBe(1)
  w.unmount();w=mountPage();await flushPromises();expect(qty()).toBe(1)
  if(today.slice(0,7)!==tomorrow.slice(0,7))await w.get('[aria-label="เดือนถัดไป"]').trigger('click')
  await w.get(`[data-calendar-day="${tomorrow}"]`).trigger('click');expect(qty()).toBe(2)
 }finally{w.unmount()}
})
it('shows only recorded past dates and keeps refunded bills outside daily totals',async()=>{
 const today=dayKey(businessDay()),month=`${today.slice(0,7)}-01`
 const previous=businessDay(month)-1, sold=dayKey(previous), refunded=dayKey(previous-1), empty=dayKey(previous-2)
 const order=(day,status)=>({orderId:day,createdAt:`${day}T12:00:00+07:00`,status,subtotal:69,gpAmount:0,netRevenue:69,foodCost:19,grossProfit:50,items:[{menuId:'M',menuName:'Greek',qty:2}]})
 h.report.mockImplementation(async range=>({legacyOrders:range.end===sold?[order(sold,'committed'),order(refunded,'cancelled')]:[]}))
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state:{...state,shop:{...state.shop,posEnabled:false}}},global:{stubs:{teleport:true}}})
 try{
  await flushPromises();await w.get('[aria-label="เดือนก่อนหน้า"]').trigger('click');await flushPromises()
  const date=day=>w.get(`[data-calendar-day="${day}"]`)
  const summary=()=>w.get('[aria-labelledby="order-entry-summary-title"]').text()
  expect(date(empty).element.disabled).toBe(true)
  expect(date(sold).element.disabled).toBe(false)
  await date(sold).trigger('click')
  expect(summary()).toContain('฿69');expect(summary()).toContain('1 บิล');expect(summary()).toContain('2 ชาม')
  expect(w.find('[data-pos-menu="M"]').exists()).toBe(false)
  await date(refunded).trigger('click')
  expect(summary()).toContain('0 บิล')
  expect(date(refunded).find('[data-calendar-order]').exists()).toBe(true)
  expect(w.find('.order-entry-list').exists()).toBe(false)
  await w.get('[data-order-details]').trigger('click')
  expect(w.get('#order-entry-details').text()).toContain('คืนบิลแล้ว')
  await w.get('.order-entry-list button').trigger('click')
  expect(w.get('#ReceiptModal').text()).toContain('Greek')
  expect(h.report.mock.calls.filter(([range])=>range.end===sold)).toHaveLength(1)
 }finally{w.unmount()}
})
it('restores the independent day cart after inspecting a saved preorder on that date',async()=>{
 const pickup=businessDay()+1, date=dayKey(pickup)
 const d=await h.load()
 d.shop.preorders={booked:{pickupDay:pickup,platformId:'P',quoteCents:20700,draftJson:JSON.stringify({lines:[{menuId:'M',qty:3,optionIds:[]}],packageAdjustments:[]})}}
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state:{...state,shop:{...state.shop,posEnabled:false}}},global:{stubs:{teleport:true}}})
 try{
  await flushPromises()
  if(dayKey(businessDay()).slice(0,7)!==date.slice(0,7))await w.get('[aria-label="เดือนถัดไป"]').trigger('click')
  await w.get(`[data-calendar-day="${date}"]`).trigger('click')
  await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
  const qty=()=>w.getComponent(CartPanel).props('model').cart[0]?.qty
  expect(qty()).toBe(1)
  const cell=w.get(`[data-calendar-day="${date}"]`)
  expect(cell.find('[data-calendar-cart]').exists()).toBe(true)
  expect(cell.find('[data-calendar-order]').exists()).toBe(true)
  await w.get('[data-order-details]').trigger('click')
  await w.get('.order-entry-list button').trigger('click');expect(qty()).toBe(3)
  await w.get('.order-entry-linked button').trigger('click');expect(qty()).toBe(1)
 }finally{w.unmount()}
})
it('lets the operator explicitly recover an expired draft without opening an empty past date',async()=>{
 const yesterday=dayKey(businessDay()-1)
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
 sessionStorage.setItem(key,JSON.stringify({orderDay:yesterday,cart:[{menuId:'M',qty:2,optionIds:[]}],platformId:'P'}))
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}})
 try{
  await flushPromises()
  expect(w.get(`[data-calendar-day="${yesterday}"]`).element.disabled).toBe(true)
  expect(w.find('[data-pos-menu="M"]').exists()).toBe(false)
  await w.get('[data-recover-cart]').trigger('click')
  expect(w.get(`[data-calendar-day="${dayKey(businessDay())}"]`).attributes('aria-pressed')).toBe('true')
  expect(w.getComponent(CartPanel).props('model').cart[0].qty).toBe(2)
  expect(w.find('[data-recover-cart]').exists()).toBe(false)
  expect(h.execute).not.toHaveBeenCalled()
 }finally{w.unmount()}
})
it('updates sales for today after a sale without rereading historical receipts in the month',async()=>{
 const today='2026-11-08',past='2026-11-03'
 const order=(day,subtotal)=>({orderId:day,createdAt:`${day}T12:00:00+07:00`,subtotal,gpAmount:0,netRevenue:subtotal,foodCost:0,grossProfit:subtotal})
 const report=vi.fn().mockResolvedValueOnce({legacyOrders:[order(past,39)]}).mockResolvedValueOnce({legacyOrders:[order(today,69)]})
 const data={shop:{revision:1,catalog:{}},display:{},materials:[]}
 const w=mount(OrderEntryPanel,{props:{day:today,today,data,revision:1,ready:true,service:{report}}})
 try{
  await flushPromises()
  await w.setProps({data:{...data,shop:{...data.shop,revision:2,lastOpKind:'sale_set'}},revision:2});await flushPromises()
  expect(report.mock.calls).toEqual([[{start:'2026-11-01',end:today}],[{start:today,end:today}]])
  expect(w.get(`[data-calendar-day="${past}"]`).element.disabled).toBe(false)
  expect(w.get('.order-entry-total').text()).toContain('฿69')
 }finally{w.unmount()}
})
it('reports a failed month separately from an empty month and can retry it',async()=>{
 const today='2026-11-08',past='2026-11-03'
 const report=vi.fn().mockRejectedValueOnce(new Error('permission-denied')).mockResolvedValueOnce({legacyOrders:[{orderId:'past',createdAt:`${past}T12:00:00+07:00`,subtotal:39,gpAmount:0,netRevenue:39,foodCost:0,grossProfit:39}]})
 const data={shop:{revision:1,catalog:{}},display:{},materials:[]}
 const w=mount(OrderEntryPanel,{props:{day:today,today,data,revision:1,ready:true,service:{report}}})
 try{
  await flushPromises()
  expect(w.get('.calendar-note').text()).toContain('โหลดประวัติเดือนนี้ไม่ได้')
  expect(w.get(`[data-calendar-day="${past}"]`).element.disabled).toBe(true)
  expect(w.get(`[data-calendar-day="${today}"]`).element.disabled).toBe(false)
  expect(w.get('.order-entry-total').text()).toContain('—')
  await w.get('.calendar-note button').trigger('click');await flushPromises()
  expect(w.get(`[data-calendar-day="${past}"]`).element.disabled).toBe(false)
  expect(report).toHaveBeenCalledTimes(2)
 }finally{w.unmount()}
})
it('hides the POS while the shop has it disabled and keeps the cart for re-enabling',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}})
 try{
  await flushPromises()
  await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
  await w.setProps({state:{...state,shop:{...state.shop,posEnabled:false}}})
  await flushPromises()
  expect(w.find('[data-pos-menu]').exists()).toBe(false)
  expect(w.findAll('button').some(button=>button.text()==='แคชเชียร์ (POS)')).toBe(false)
  await w.setProps({state:{...state,shop:{...state.shop,posEnabled:true}}})
  await flushPromises()
  const cart=w.getComponent(CartPanel)
  expect(cart.props('model').cart).toHaveLength(1)
  expect(cart.props('model').availableTabs).toContain('pos')
 }finally{w.unmount()}
})
it.each([true,false])('uses the stock picture and group activation in cloud option picking (active=%s)',async active=>{
 const d=await h.load()
 d.shop.catalog.groups={G:{id:'G',name:'Choices',active,optionIds:['A'],min:0,max:1,allowRepeat:false,pricingMode:'included'}}
 d.shop.catalog.addons={A:{active:true,recipe:{STOCK:100},pricesCents:{P:0}}};d.shop.catalog.addonIds=['A'];d.shop.catalog.menus.M.groupId='G'
 d.materials=[{id:'STOCK',name:'Fruit',emoji:'🍌',unit:'ลูก',inventoryType:'ingredient',stock:1000,lotIds:[],unitCost:1}]
 d.display.addons={A:{name:'Option',emoji:'🍓'}};h.load.mockResolvedValue(d)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}})
 try{
  await flushPromises();await w.get('[data-pos-menu="M"]').trigger('click')
  expect(w.get('.bowl-addon .entity-image').text()).toBe('🍌')
  expect(w.get('.bowl-addon').attributes('disabled')!==undefined).toBe(!active)
 }finally{w.unmount()}
})
beforeEach(()=>{
 h.pending.mockReset();h.recover.mockReset().mockResolvedValue({ok:false,code:'PENDING_RESULT'});h.discardUnsent.mockReset()
 sessionStorage.clear();h.report.mockReset();h.report.mockResolvedValue({receipts:[],legacyOrders:[]});h.abandon.mockReset();h.orders.mockResolvedValue([]);h.history.mockResolvedValue([]);h.execute.mockClear();h.pending.mockResolvedValue([]);h.execute.mockImplementation(async c=>({ok:true,value:{opId:c.opId,kind:c.kind,result:{subtotalCents:6900}}}))
 h.preview.mockReturnValue({subtotalCents:6900,approvedShortages:{}})
 h.load.mockResolvedValue({shop:{generation:'g1',revision:1,catalog:{summaryMaterials:Array.from({length:15},(_,i)=>`M${i}`),menus:{M:{id:'M',active:true,pricesCents:{P:6900},optionIds:[],min:0,max:0}},groups:{},platforms:{P:{active:true}},platformIds:['P']}},materials:[],display:{trial:true,sourceDate:'2026-10-20',menus:{M:{name:'โยเกิร์ต'}},addons:{},platforms:{P:{name:'หน้าร้าน'}}},orders:[]})
})
it('does not expose the legacy option list when a menu has no groups', async () => {
 const data = await h.load()
 Object.assign(data.shop.catalog.menus.M, { optionIds: ['A'], max: 1 })
 data.shop.catalog.addons = { A: { name: 'Legacy option', active: true, recipe: {}, pricesCents: { P: 500 } } }
 data.shop.catalog.addonPrices = { P: { A: 500 } }
 data.shop.catalog.menus.M.priceMode = 'addon'
 data.display.addons.A = { name: 'Legacy option' }
 const wrapper = mount(CoreWorkspace, { props: { connection: { config: { projectId: 'demo' }, shopId: 'shop' }, state }, global: { stubs: { teleport: true } } })
 try {
  await flushPromises()
  await wrapper.get('[data-pos-menu="M"]').trigger('click')
  expect(wrapper.get('form.line-form').findAll('.bowl-addon')).toHaveLength(0)
  await wrapper.get('form.line-form').trigger('submit')
  expect(h.preview.mock.lastCall[0].lines[0].optionIds).toEqual([])
 } finally { wrapper.unmount() }
})
it('retries journal initialization on manual reload and enables recovery without a page refresh',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
 sessionStorage.setItem(key,JSON.stringify({command:{opId:'OLD',kind:'sale',payload:{}}}))
 h.pending.mockRejectedValueOnce(new Error('LOCAL_JOURNAL_FAILED'))
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('button[aria-label="โหลดข้อมูลล่าสุด"]').trigger('click');await flushPromises()
 expect(w.get('[data-retry-command]').attributes('disabled')).toBeUndefined();expect(h.pending.mock.calls.length).toBeGreaterThan(1);w.unmount()
})
it('hides a restored pending command while initial recovery is still checking',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u'])
 const command={opId:'RESTORED',kind:'sale',payload:{}}
 sessionStorage.setItem(key,JSON.stringify({command}))
 let finishRecovery
 h.recover.mockImplementationOnce(()=>new Promise(resolve=>{finishRecovery=resolve}))
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}})
 try{
  await flushPromises()
  expect(h.recover).toHaveBeenCalledWith(command)
  expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false)
  finishRecovery({ok:false,code:'PENDING_RESULT'})
  await flushPromises()
  expect(w.get('[data-toast-id="pending-command"]').text()).toContain('RESTORED')
 }finally{w.unmount()}
})
it('recovers another tab’s resolved command during reload without resubmission',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u']),command={opId:'OLD',kind:'material_metadata',payload:{expectedRevision:1}}
 sessionStorage.setItem(key,JSON.stringify({command}))
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 h.recover.mockResolvedValue({ok:true,value:{...command,rejected:true,code:'STALE_INVENTORY_DRAFT'}})
 await w.get('button[aria-label="โหลดข้อมูลล่าสุด"]').trigger('click');await flushPromises()
 expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false);expect(h.execute).not.toHaveBeenCalled();w.unmount()
})
it('does not lock the shop for a new sale refused before journal submission',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'NOT_READY',outcome:'blocked'})
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false);expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})
it('shows the real access failure and operation identity for an uncertain sale',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 let finishRequest
 h.execute.mockImplementationOnce(()=>new Promise(resolve=>{finishRequest=resolve}))
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false)
 finishRequest({ok:false,code:'PENDING_RESULT',causeCode:'permission-denied',outcome:'uncertain'})
 await flushPromises()
 expect(w.get('[data-toast-id="pending-command"]').text()).toContain('สิทธิ์');expect(w.get('[data-toast-id="pending-command"]').text()).toContain(h.execute.mock.calls.at(-1)[0].opId)
 w.unmount()
})
it('honors a committed receipt when another tab resolves during unsent cleanup',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'NOT_READY',outcome:'prepared'})
 h.discardUnsent.mockImplementation(async c=>({ok:true,value:{opId:c.opId,kind:'sale',result:{subtotalCents:6900}}}))
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);expect(w.find('.receipt-paper').exists()).toBe(true)
 w.unmount()
})
it('recovers an uncertain inventory draft even when the parent session command was never saved',async()=>{
 const key=JSON.stringify(['gy-core-cart-v1','demo','shop','g1','u']),f=summaryFixture()
 const data={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{},addons:{},platforms:{}},orders:[]}
 const command={opId:'ORPHAN',kind:'material_metadata',payload:{expectedRevision:data.shop.revision,materialId:f.materials[0].id,metadata:{name:'Draft name',emoji:'',minAlertQ:0}}}
 sessionStorage.setItem(`gy-inventory-drafts-v1:${key}`,JSON.stringify({base:data,commands:[command],uncertain:true,conflict:false}))
 h.load.mockResolvedValue(data)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 expect(h.recover).toHaveBeenCalledWith(command);expect(w.get('[data-toast-id="pending-command"]').text()).toContain('ORPHAN')
 w.unmount()
})
it('shows the four-line limit for a sixteen-material shop and prevents creating a fifth line',async()=>{
 const d=await h.load();d.shop.catalog.summaryMaterials.push('M15');h.load.mockResolvedValue(d)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click')
 for(let i=0;i<4;i++){if(i)await w.get('[data-pos-menu="M"]').trigger('click');await w.get('input[placeholder="เช่น แยกท็อปปิ้ง"]').setValue(`แยก ${i}`);await w.get('form.line-form').trigger('submit')}
 await w.get('[data-pos-menu="M"]').trigger('click')
 expect(w.getComponent(CartPanel).props('model').cart).toHaveLength(4);expect(w.text()).toContain('สูงสุด 4 รายการ');expect(w.get('[data-add-line]').attributes('disabled')).toBeDefined()
 await w.get('input[placeholder="เช่น แยกท็อปปิ้ง"]').setValue('แยก 0')
 expect(w.get('[data-add-line]').attributes('disabled')).toBeUndefined()
 await w.get('form.line-form').trigger('submit')
 await openCart(w);expect(w.findAll('[data-cart-line]')).toHaveLength(4)
 expect(w.findAll('[data-cart-line]')[0].get('.cart-quantity output').text()).toBe('2')
 w.unmount()
})
it('combines identical prepared items but keeps different notes on separate bill lines',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 const add=async note=>{await w.get('[data-pos-menu="M"]').trigger('click');if(note)await w.get('input[placeholder="เช่น แยกท็อปปิ้ง"]').setValue(note);await w.get('form.line-form').trigger('submit')}
 await add('');await add('');await add('แยกน้ำผึ้ง');await add(' แยกน้ำผึ้ง ');await add('ไม่ใส่น้ำผึ้ง')
 await openCart(w);const lines=w.findAll('[data-cart-line]')
 expect(lines).toHaveLength(3)
 expect(lines.map(line=>line.get('.cart-quantity output').text())).toEqual(['2','2','1'])
 expect(w.find('.order-detail-note').exists()).toBe(false)
 await w.get('[data-cart-details]').trigger('click')
 const details=w.findAll('.order-detail-line')
 expect(details[0].find('.order-detail-note').exists()).toBe(false)
 expect(details[1].get('.order-detail-note').text()).toContain('แยกน้ำผึ้ง')
 expect(details[2].get('.order-detail-note').text()).toContain('ไม่ใส่น้ำผึ้ง')
 w.unmount()
})
it('opens the trial workspace, retains cart after uncertain results, and only clears after a server receipt',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 expect(w.text()).toContain('ข้อมูลทดสอบ');await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 expect(w.get('[data-cart-open]').attributes('aria-expanded')).toBe('false')
 expect(w.get('[data-cart-open]').attributes('aria-label')).toContain('1 รายการ')
 expect(w.get('.pos-catalog').isVisible()).toBe(true)
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);expect(w.get('[data-toast-id="pending-command"]').text()).toContain('ยังยืนยันผล')
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);expect(w.find('.notice').exists()).toBe(false);expect(w.get('.ui-toasts').text()).toContain('บันทึกสำเร็จ');w.unmount()
})
it('keeps the cart while server readiness is lost and disables checkout',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 await w.setProps({state:{...state,serverReady:false}})
 await openCart(w);expect(w.get('[data-checkout]').attributes('disabled')).toBeDefined();expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})
it('restores its own cart and immutable pending command after reload and clears only its matching receipt',async()=>{
 let w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 const command=h.execute.mock.calls.at(-1)[0];w.unmount()
 w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
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
 if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})

it('uses the original product navigation, catalogue and cart without creating a local POS store',async()=>{
 const before=Object.keys(localStorage).sort()
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 expect(w.find('.brand-sidebar').exists()).toBe(true)
 expect(w.findAll('.brand-navigation button').map(b=>b.find('div span').text())).toEqual(['ภาพรวม & งบต้นทุน','บันทึกออเดอร์','แคชเชียร์ (POS)','จัดการเมนู','จัดการกลุ่มตัวเลือก','คลังวัตถุดิบ & Package','ตั้งค่า & ระบบ API'])
 expect(w.find('.brand-navigation button[title^="จัดการเมนู"] .font-number').text()).toBe('1 รายการ')
 expect(w.find('.brand-sidebar').text()).toContain('สถานะคลัง & ต้นทุน')
 expect(w.find('.brand-sidebar').text()).not.toContain('Firebase')
 expect(w.find('.brand-sidebar [aria-label="ผู้ใช้ที่กำลังใช้งานร้าน"]').exists()).toBe(true)
 expect(w.find('.cloud-sidebar-status').exists()).toBe(false)
 expect(w.find('.pos-catalog').exists()).toBe(true)
 expect(w.find('.pos-menu-card').exists()).toBe(true)
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
 if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
 expect(w.find('.cart-body').exists()).toBe(true)
 expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 expect(Object.keys(localStorage).filter(k=>!before.includes(k))).toEqual(['gy-cloud-device-v1'].filter(k=>!before.includes(k)))
 w.unmount()
})
it('locks original cart quantity and platform controls while a server result is uncertain',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.get('button[aria-label="เพิ่มจำนวน โยเกิร์ต"]').attributes('disabled')).toBeDefined()
 expect(w.get('[data-pos-channel]').attributes('disabled')).toBeDefined()
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
 await w.get('#stock-draft-review .draft-review-actions .ui-button--secondary').trigger('click');await flushPromises()
 await w.get('[data-save-stock-drafts]').trigger('click');await flushPromises()
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
 await w.get('#stock-draft-review .draft-review-actions .ui-button--secondary').trigger('click');await flushPromises()
 await w.get('[data-save-stock-drafts]').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'produce',payload:{materialId:output.id,input:{qtyQ:500}}})
 await w.get('.brand-navigation button[title="แคชเชียร์ (POS)"]').trigger('click');await flushPromises()
 await w.get('button[aria-label="ยอดขายและบิล"]').trigger('click');await flushPromises()
 await w.findAll('button').find(b=>b.text()==='เปิดหน้าบิลขายและคืนบิล').trigger('click');await flushPromises()
 await w.get('.order-list button').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.filter(([c])=>c.kind==='cancel')).toHaveLength(0)
 await w.get('#cloud-cancel-order .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'cancel',payload:{orderId:'BILL'}});w.unmount()
},15000)

it('opens the original receipt only after its matching server-confirmed sale',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await flushPromises()
 expect(w.find('.receipt-paper').exists()).toBe(false)
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'});await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.find('.receipt-paper').exists()).toBe(false)
 await w.get('[data-retry-command]').trigger('click');await flushPromises()
 expect(w.get('.receipt-paper').text()).toContain('฿69')
 expect(w.get('.receipt-paper').text()).toContain(h.execute.mock.calls.at(-1)[0].opId)
 w.unmount()
})


it('keeps checkout locked and spinning until the post-write server reload finishes',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
 const snapshot=await h.load();let resolveLoad
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveLoad=r}))
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(w.get('[data-checkout]').attributes('disabled')).toBeDefined()
 expect(w.get('[data-checkout]').attributes('aria-busy')).toBe('true')
 await openCart(w);await w.get('[data-checkout]').trigger('click');expect(h.execute).toHaveBeenCalledTimes(1)
 resolveLoad(snapshot);await flushPromises()
 expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})


it('holds the same visible cancellation button through the receipt and order reload',async()=>{
 h.orders.mockResolvedValue([{opId:'BILL',status:'committed',subtotalCents:6900,platformId:'P',lines:[{menuId:'M',qty:1}]}])
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('button[aria-label="ยอดขายและบิล"]').trigger('click');await flushPromises()
 await w.findAll('button').find(b=>b.text()==='เปิดหน้าบิลขายและคืนบิล').trigger('click');await flushPromises()
 await w.get('.order-list button').trigger('click');await flushPromises()
 let resolve;h.orders.mockImplementationOnce(()=>new Promise(r=>{resolve=r}))
 const button=()=>w.get('#cloud-cancel-order .ui-button--primary')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');expect(button().attributes('disabled')).toBeDefined()
 await button().trigger('click');expect(h.execute).toHaveBeenCalledTimes(1)
 resolve([]);await flushPromises();expect(w.find('#cloud-cancel-order .ui-button--primary').exists()).toBe(false);w.unmount()
})


it('hides pending sale actions until stopping and reloading finish',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
 h.execute.mockResolvedValueOnce({ok:false,code:'PENDING_RESULT'})
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 const d=await h.load();let resolveLoad
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveLoad=r}))
 h.abandon.mockResolvedValue({ok:true,value:{kind:'sale',abandoned:true,opId:'stopped'}})
 const button=()=>w.get('[data-stop-command]')
 await button().trigger('click');await flushPromises()
 expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false);expect(h.abandon).toHaveBeenCalledTimes(1)
 resolveLoad(d);await flushPromises();expect(w.find('[data-toast-id="pending-command"]').exists()).toBe(false);expect(w.findAll('[data-cart-line]')).toHaveLength(1);w.unmount()
})


it('keeps manual reload spinning through the orders read and shares an in-flight reload',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('button[aria-label="ยอดขายและบิล"]').trigger('click');await flushPromises()
 await w.findAll('button').find(b=>b.text()==='เปิดหน้าบิลขายและคืนบิล').trigger('click');await flushPromises()
 let resolve;h.orders.mockImplementationOnce(()=>new Promise(r=>{resolve=r}));const before=h.orders.mock.calls.length
 const button=()=>w.get('button[aria-label="โหลดข้อมูลล่าสุด"]')
 await button().trigger('click');await flushPromises()
 expect(button().attributes('aria-busy')).toBe('true');await button().trigger('click');expect(h.orders.mock.calls.length).toBe(before+1)
 resolve([]);await flushPromises();expect(button().attributes('aria-busy')).toBeUndefined();w.unmount()
})


it('starts a fresh read after an update even if a manual reload began before the write',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');if(w.find('[data-cart-open]').exists())await w.get('[data-cart-open]').trigger('click');await flushPromises()
 const old=await h.load(),fresh={...old,shop:{...old.shop,revision:old.shop.revision+1}};let resolveOld
 h.load.mockImplementationOnce(()=>new Promise(r=>{resolveOld=r})).mockResolvedValueOnce(fresh)
 const before=h.load.mock.calls.length
 await w.get('button[aria-label="โหลดข้อมูลล่าสุด"]').trigger('click');await flushPromises()
 await openCart(w);await w.get('[data-checkout]').trigger('click');await flushPromises()
 expect(h.execute).toHaveBeenCalledTimes(1)
 resolveOld(old);await flushPromises()
 expect(h.load.mock.calls.length).toBe(before+2);expect(w.findAll('[data-cart-line]')).toHaveLength(0);w.unmount()
})


it('opens the original menu management and editor from the unchanged sidebar and submits a cloud command',async()=>{
 const f=summaryFixture(),d={shop:materialRegistryShop(f.shop,f.materials),materials:f.materials,display:{menus:{SIMPLE:{name:'Original menu',emoji:'x'}},addons:{},groups:{},platforms:{P:{name:'Counter'}}},orders:[]};h.load.mockResolvedValue(d)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('.brand-navigation button[title="จัดการเมนู"]').trigger('click');await flushPromises()
 expect(w.find('#menu-recipe').exists()).toBe(true)
 await w.get('[data-menu-edit]').trigger('click');await flushPromises()
 await w.get('#menu-name').setValue('Edited cloud menu')
 await w.get('#MenuEditModal .menu-editor-footer .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute).not.toHaveBeenCalled()
 await w.get('#ConfirmModal .ui-button--primary').trigger('click');await flushPromises()
 expect(h.execute.mock.calls.at(-1)[0]).toMatchObject({kind:'menu',payload:{display:{name:'Edited cloud menu'}}});w.unmount()
})


it('keeps a cart and safely resets an open option form when another device changes the menu groups',async()=>{
 const initial=await h.load();initial.shop.catalogRevision=1;h.load.mockResolvedValue(initial)
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit');await w.get('[data-pos-menu="M"]').trigger('click')
 const next=JSON.parse(JSON.stringify(initial));next.shop.revision=2;next.shop.catalogRevision=2
 next.shop.catalog.groups={G:{id:'G',name:'Changed choices',active:true,optionIds:['A'],min:1,max:1,allowRepeat:false,pricingMode:'included'}}
 next.shop.catalog.addons={A:{active:true,recipe:{},pricesCents:{P:0}}};next.shop.catalog.addonIds=['A'];next.display.addons={A:{name:'New choice'}};next.shop.catalog.menus.M.groupId='G'
 h.load.mockResolvedValue(next);await w.setProps({state:{...state,shop:{...state.shop,revision:2}}});await flushPromises()
 expect(w.text()).toContain('กรุณาเลือกตัวเลือกใหม่');expect(w.findAll('.bowl-addon')).toHaveLength(1);expect(w.getComponent(CartPanel).props('model').cart).toHaveLength(1);w.unmount()
})

it('opens the original Dashboard from the sidebar without a local fallback or the 100-bill history limit',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}})
 try{
  await flushPromises();await w.get('[data-pos-menu="M"]').trigger('click');await w.get('form.line-form').trigger('submit')
  await w.get('.brand-navigation button[title="ภาพรวม & งบต้นทุน"]').trigger('click');await flushPromises()
  expect(w.find('[data-sales-total]').isVisible()).toBe(true);expect(h.report).toHaveBeenCalledTimes(1);expect(h.orders).not.toHaveBeenCalled()
  await w.get('[data-period="all"]').trigger('click');await flushPromises();expect(h.report).toHaveBeenLastCalledWith({start:null,end:null})
  const calls=h.report.mock.calls.length;await w.get('button[aria-label="โหลดข้อมูลล่าสุด"]').trigger('click');await flushPromises();expect(h.report.mock.calls.length).toBeGreaterThan(calls)
  await w.get('.brand-navigation button[title="แคชเชียร์ (POS)"]').trigger('click');await flushPromises();await openCart(w);expect(w.findAll('[data-cart-line]')).toHaveLength(1)
 }finally{w.unmount()}
})

it('looks up a historical receipt directly even when newer orders fill the latest100',async()=>{
 h.orders.mockResolvedValue(Array.from({length:100},(_,i)=>({opId:'NEW-'+i,status:'committed',lines:[],subtotalCents:100})))
 h.history.mockResolvedValue([{orderId:'OLD',status:'committed',subtotal:39,platformName:'Original'}])
 h.legacyReceipt.mockResolvedValue({opId:'LEGACY-OLD',origin:'legacy',sourceLegacyId:'OLD',status:'committed',lines:[],subtotalCents:3900})
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('[aria-label="ยอดขายและบิล"]').trigger('click');await flushPromises()
 await w.findAll('button').find(b=>b.text()==='เปิดหน้าบิลขายและคืนบิล').trigger('click');await flushPromises()
 const details=w.get('details');details.element.open=true;await details.trigger('toggle');await flushPromises()
 await w.get('[data-legacy-return="OLD"]').trigger('click');await flushPromises()
 expect(h.legacyReceipt).toHaveBeenCalledWith('OLD');expect(w.text()).toContain('ยืนยันคืนเงินและคืนสต็อก');expect(h.execute).not.toHaveBeenCalled()
 w.unmount()
})

it('mounts only dashboard for viewer and cannot navigate to sales or settings',async()=>{
 const viewer={...state,shop:{...state.shop,userRoles:{'u@example.com':'viewer'}}}
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state:viewer},global:{stubs:{teleport:true}}});await flushPromises()
 expect(w.find('[data-checkout]').exists()).toBe(false);expect(w.find('[aria-controls="settings-access"]').exists()).toBe(false)
 expect(w.find('[aria-label="ประวัติทั้งระบบ"]').exists()).toBe(false)
 expect(w.findComponent({name:'CloudStockWorkspace'}).exists()).toBe(false);expect(w.text()).not.toContain('จัดการคลัง');expect(w.text()).not.toContain('ไปหน้าแคชเชียร์')
 w.unmount()
})
it('removes settings immediately after an admin becomes manager, retaining sales access',async()=>{
 const w=mount(CoreWorkspace,{props:{connection:{config:{projectId:'demo'},shopId:'shop'},state},global:{stubs:{teleport:true}}});await flushPromises()
 await w.get('.brand-navigation button[title="ตั้งค่า & ระบบ API"]').trigger('click');expect(w.find('#settings-access').exists()).toBe(true)
 await w.setProps({state:{...state,shop:{...state.shop,userRoles:{'u@example.com':'manager'}}}});await flushPromises()
 expect(w.find('#settings-access').exists()).toBe(false);expect(w.find('[data-pos-menu="M"]').exists()).toBe(true);w.unmount()
})
