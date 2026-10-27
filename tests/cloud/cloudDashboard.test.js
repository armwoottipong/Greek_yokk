import {it,expect,vi} from 'vitest'
import {mount,flushPromises} from '@vue/test-utils'
import {reactive} from 'vue'
import CloudDashboardWorkspace from '../../src/cloud/core/CloudDashboardWorkspace.vue'
const data={shop:{catalog:{menus:{M:{}},platforms:{P:{}}}},display:{menus:{M:{name:'Current'}},addons:{},platforms:{P:{name:'Store'}}},materials:[]}
const sale=(id='S')=>({opId:id,status:'committed',createdAt:{seconds:Date.parse('2026-10-27T09:00:00Z')/1000},platformId:'P',subtotalCents:10000,gpCents:3000,netCents:7000,ingredientCostCents:2000,packagingCostCents:500,grossProfitCents:4500,lines:[{menuId:'M',qty:1,totalCents:10000,catalog:{name:'Historic'}}],inventory:[]})
function mountReport(report){const modals=reactive({receipt:{isOpen:false,order:null}}),service={report};const w=mount(CloudDashboardWorkspace,{props:{active:true,ready:true,revision:1,data,service,modals},global:{stubs:{teleport:true}}});return {w,modals,service}}
it('uses the original date controls, channels, receipt and inventory UI with a cloud model and no local Pinia',async()=>{
 const h=mountReport(vi.fn(async()=>({receipts:[sale(),sale('C')].map((o,i)=>({...o,status:i?'cancelled':'committed'})),legacyOrders:[]})))
 try{const originalReceipt=h.modals.receipt;await flushPromises();await h.w.get('[data-period="all"]').trigger('click');await flushPromises()
  expect(h.w.get('[data-sales-total]').text()).toBe('฿100');expect(h.w.text()).toContain('รับสุทธิ ฿70')
  await h.w.get('[data-view="channels"]').trigger('click');expect(h.w.text()).toContain('Store');expect(h.w.text()).toContain('45')
  await h.w.get('[data-receipt="S"]').trigger('click');expect(h.modals.receipt).toBe(originalReceipt);expect(h.modals.receipt.order).toMatchObject({orderId:'S',grossProfit:45,items:[{menuName:'Historic'}]})
  await h.w.get('[data-view="inventory"]').trigger('click');expect(h.w.text()).toContain('มูลค่าคลัง')
  expect(h.service.report).toHaveBeenLastCalledWith({start:null,end:null})
 }finally{h.w.unmount()}
})
it('hides previous financial totals on failure/offline, then recovers on retry',async()=>{
 const report=vi.fn().mockResolvedValueOnce({receipts:[sale()],legacyOrders:[]}).mockRejectedValueOnce(Object.assign(new Error('permission-denied'),{code:'permission-denied'})).mockResolvedValue({receipts:[],legacyOrders:[]})
 const {w}=mountReport(report)
 try{await flushPromises();await w.setProps({revision:2});await flushPromises()
  expect(w.find('[data-sales-total]').exists()).toBe(false);expect(w.get('[role="alert"]').text()).toContain('โหลดรายงาน')
  await w.get('button[data-report-retry]').trigger('click');await flushPromises();expect(w.get('[data-sales-total]').text()).toBe('฿0')
  await w.setProps({ready:false});await flushPromises();expect(w.find('[data-sales-total]').exists()).toBe(false)
 }finally{w.unmount()}
})
it('does not let a late range result overwrite a newer range, and does not read while inactive',async()=>{
 let resolveOld;const report=vi.fn().mockImplementationOnce(()=>new Promise(r=>{resolveOld=r})).mockResolvedValue({receipts:[],legacyOrders:[]})
 const {w}=mountReport(report)
 try{await flushPromises();await w.getComponent({name:'DashboardView'}).vm.$emit('range-change',{start:null,end:null});await flushPromises()
  resolveOld({receipts:[sale()],legacyOrders:[]});await flushPromises();expect(w.get('[data-sales-total]').text()).toBe('฿0')
  const count=report.mock.calls.length;await w.setProps({active:false,revision:3});await flushPromises();expect(report).toHaveBeenCalledTimes(count)
 }finally{w.unmount()}
})

it('keeps date controls available after an oversized range so a narrower range can recover',async()=>{
 const report=vi.fn().mockResolvedValueOnce({receipts:[],legacyOrders:[]}).mockRejectedValueOnce(Object.assign(new Error('REPORT_TOO_LARGE'),{code:'REPORT_TOO_LARGE'})).mockResolvedValue({receipts:[],legacyOrders:[]})
 const {w}=mountReport(report)
 try{await flushPromises();await w.get('[data-period="all"]').trigger('click');await flushPromises();expect(w.find('[data-sales-total]').exists()).toBe(false)
  expect(w.get('[data-period="today"]').isVisible()).toBe(true);await w.get('[data-period="today"]').trigger('click');await flushPromises();expect(w.get('[data-sales-total]').isVisible()).toBe(true)
 }finally{w.unmount()}
})
