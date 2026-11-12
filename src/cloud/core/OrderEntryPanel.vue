<template>
 <section class="order-entry" aria-label="บันทึกออเดอร์ตามวัน">
  <div class="order-entry-overview">
   <OrderDatePicker v-model:month="visibleMonth" :day="day" :today="today" :max="latestDay" :disabled="dateLocked" :state="calendarState" :order-days="orderDays" :draft-days="draftDays" @update:day="$emit('update:day',$event)" @retry="retryMonth(visibleMonth)" />
   <section class="order-entry-summary" aria-labelledby="order-entry-summary-title">
    <header><h3 id="order-entry-summary-title">สรุปออเดอร์</h3><p>{{ displayDate(day) }}</p></header>
    <div class="order-entry-total">
     <div><span>ยอดขายจริง</span><strong>{{ salesReady ? `฿${money(totalSales)}` : '—' }}</strong></div>
     <span>{{ salesReady ? `${money(soldOrders.length)} บิล` : '— บิล' }}</span>
    </div>
    <div class="order-entry-booking"><span><strong>Pre-order รอดำเนินการ</strong><small>{{ bookings.length }} ออเดอร์</small></span><strong>฿{{ money(quoteTotal) }}</strong></div>
    <div v-if="linked" class="order-entry-linked">
     <span>กำลังเปิด Pre-order · ตะกร้าร่างเก็บแยกไว้</span>
     <Button variant="quiet" size="compact" :disabled="blocked" @click="$emit('leave-preorder')">ออกจากรายการนี้</Button>
    </div>
    <div class="order-entry-actions">
     <Button data-order-menu-report variant="quiet" @click="$emit('open-menu-report',day)"><ChartNoAxesCombined :size="18" aria-hidden="true" />เมนูขายดีและรายงาน<ArrowUpRight :size="16" aria-hidden="true" /></Button>
     <Button data-order-details variant="secondary" aria-haspopup="dialog" aria-controls="order-entry-details" @click="detailsOpen=true"><ListOrdered :size="18" aria-hidden="true" />ดูรายละเอียดออเดอร์<ChevronRight :size="16" aria-hidden="true" /></Button>
    </div>
   </section>
  </div>
  <OrderDetailsDialog :open="detailsOpen" :date="displayDate(day)" :sales="sales" :bookings="bookings" :data="data" :state="dailyState" :blocked="blocked" @request-close="detailsOpen=false" @retry="retryMonth(activeMonth)" @open-sale="$emit('open-sale',$event)" @open-preorder="$emit('open-preorder',$event)" />
 </section>
</template>

<script setup>
import {computed,onScopeDispose,ref,shallowReactive,watch} from 'vue'
import {ArrowUpRight,ChartNoAxesCombined,ChevronRight,ListOrdered} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import {money,orderSaleDay} from '@/domain/dashboard'
import {backdatedSaleDay,businessDay,dayKey,monthOf,offsetMonth,scheduledSummary} from './orderEntry.js'
import OrderDatePicker from './OrderDatePicker.vue'
import OrderDetailsDialog from './OrderDetailsDialog.vue'
import {projectReportOrders} from './reportProjection.js'

const props=defineProps({day:String,today:String,data:Object,service:Object,revision:Number,refreshKey:Number,ready:Boolean,blocked:Boolean,dateLocked:Boolean,linked:Boolean,draftDays:Set})
defineEmits(['update:day','open-sale','open-preorder','leave-preorder','open-menu-report'])
const dateFormat=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'UTC'})
const displayDate=value=>dateFormat.format(new Date(value+'T00:00:00Z'))
const activeMonth=computed(()=>monthOf(props.day)),visibleMonth=ref(activeMonth.value)
const detailsOpen=ref(false)
const latestDay=computed(()=>dayKey(businessDay(props.today)+366))
const reports=shallowReactive(new Map())
let pending=false,disposed=false

const scheduled=computed(()=>scheduledSummary(props.data.shop.preorders).orders)
const bookings=computed(()=>scheduled.value.filter(row=>row.pickupDay===businessDay(props.day)))
const quoteTotal=computed(()=>bookings.value.reduce((total,row)=>total+row.quoteCents,0)/100)
const orderDays=computed(()=>{
 const days=new Set(reports.get(visibleMonth.value)?.byDay?.keys())
 for(const row of scheduled.value)days.add(dayKey(row.pickupDay))
 return days
})
const sales=computed(()=>{
 const report=reports.get(activeMonth.value)
 return props.day===props.today&&report?.onlyToday?[]:report?.byDay?.get(props.day)||[]
})
const soldOrders=computed(()=>sales.value.filter(row=>row.status!=='cancelled'))
const totalSales=computed(()=>soldOrders.value.reduce((total,row)=>total+(Number(row.subtotal)||0),0))
const monthState=month=>month>props.today?'ready':!props.ready?'offline':reports.get(month)?.state||'loading'
const hasConfirmedHistory=month=>props.ready&&reports.get(month)?.onlyToday
const calendarState=computed(()=>hasConfirmedHistory(visibleMonth.value)?'ready':monthState(visibleMonth.value))
const dailyState=computed(()=>props.day>props.today||props.day<props.today&&hasConfirmedHistory(activeMonth.value)?'ready':monthState(activeMonth.value))
const salesReady=computed(()=>dailyState.value==='ready')

// Keep the selected and browsed months independent. Only one server report
// runs at a time, so rapid navigation does not queue every intermediate month.
async function loadNextMonth(){
 if(pending||disposed||!props.ready)return
 const requested=[activeMonth.value,visibleMonth.value]
 const month=requested.find(month=>month<=props.today&&(!reports.has(month)||reports.get(month).state==='refresh'))
 if(!month)return
 if(!reports.has(month)&&reports.size>=4){
  const oldest=[...reports.keys()].find(month=>!requested.includes(month))
  reports.delete(oldest)
 }
 const entry={...reports.get(month),state:'loading'},data=props.data
 reports.set(month,entry)
 pending=true
 try{
  const start=entry.onlyToday?props.today:month
  const last=dayKey(businessDay(offsetMonth(month,1))-1)
  const end=last>props.today?props.today:last
  const report=await props.service.report({start,end})
  if(disposed||reports.get(month)!==entry)return
  const byDay=new Map(entry.byDay)
  if(entry.onlyToday)byDay.delete(start)
  for(const row of projectReportOrders(report,data).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))){
   const day=orderSaleDay(row)
   if(day<start||day>end)continue
   if(!byDay.has(day))byDay.set(day,[])
   byDay.get(day).push(row)
  }
  reports.set(month,{state:'ready',byDay})
 }catch{if(!disposed&&reports.get(month)===entry)reports.set(month,{...entry,state:'error'})}
 finally{pending=false;void loadNextMonth()}
}
function retryMonth(month){
 const entry=reports.get(month)
 if(entry?.onlyToday)reports.set(month,{...entry,state:'refresh'})
 else reports.delete(month)
 void loadNextMonth()
}
watch([()=>props.revision,()=>props.refreshKey,()=>props.today,()=>props.ready],([revision,refreshKey,today,ready],[oldRevision,oldRefreshKey,oldToday,oldReady])=>{
 const consecutive=ready&&oldReady&&revision===oldRevision+1&&refreshKey===oldRefreshKey&&today===oldToday
 const kind=props.data.shop.lastOpKind
 if(consecutive&&kind==='sale_set'&&!backdatedSaleDay(props.data.shop.lastOpId)){
  const month=monthOf(today),entry=reports.get(month)
  // Keep older verified days for sales recorded on the current business day.
  if(entry?.byDay)reports.set(month,{...entry,state:'refresh',onlyToday:true})
  else reports.delete(month)
 }else if(!consecutive||!['preorder_create','preorder_cancel'].includes(kind))reports.clear()
 void loadNextMonth()
})
watch(()=>props.day,day=>{visibleMonth.value=monthOf(day)})
watch([activeMonth,visibleMonth],loadNextMonth,{immediate:true})
onScopeDispose(()=>{disposed=true})
</script>

<style scoped>
.order-entry{display:grid;gap:12px;min-width:0;font-size:.8125rem;container-type:inline-size}
.order-entry-overview{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:stretch;gap:24px}
.order-entry-overview>.order-calendar{align-content:start}
.order-entry-summary{display:flex;flex-direction:column;gap:12px;min-width:0}
.order-entry h3{font-size:1.125rem;font-weight:600}
.order-entry header p,.order-entry-linked{color:var(--text-muted)}
.order-entry-total,.order-entry-booking,.order-entry-linked{display:flex;justify-content:space-between;align-items:center;gap:8px}
.order-entry-total{padding:12px;background:var(--bg-soft);border-radius:10px;color:var(--text-muted)}
.order-entry-total>div{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.order-entry-total strong{color:var(--accent-brand);font-size:1.625rem;font-variant-numeric:tabular-nums}
.order-entry-total>span{white-space:nowrap;font-variant-numeric:tabular-nums}
.order-entry-booking{border-top:1px solid var(--border-subtle);padding-top:12px}
.order-entry-booking small{display:block;color:var(--text-muted);font-size:.75rem}
.order-entry-booking strong{font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.order-entry-actions{display:grid;gap:4px;margin-block-start:auto}
.order-entry-actions .ui-button{justify-content:space-between;gap:8px;color:var(--accent-brand)}
@container(max-width:660px){.order-entry-overview{grid-template-columns:minmax(0,1fr)}}
</style>
