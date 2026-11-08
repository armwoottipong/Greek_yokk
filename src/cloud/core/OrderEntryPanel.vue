<template>
 <section class="order-entry" aria-label="บันทึกออเดอร์ตามวัน">
  <div class="order-entry-overview">
   <OrderDatePicker v-model:month="visibleMonth" class="order-entry-surface" :day="day" :today="today" :max="latestDay" :disabled="dateLocked" :state="calendarState" :order-days="orderDays" @update:day="$emit('update:day',$event)" @retry="retryMonth(visibleMonth)" />
   <section class="order-entry-summary order-entry-surface" aria-labelledby="order-entry-summary-title">
    <header><h3 id="order-entry-summary-title">สรุปออเดอร์</h3><p>{{ displayDate(day) }}</p></header>
    <div class="order-entry-total"><span>ยอดขายจริง</span><strong>{{ salesReady ? `฿${money(daily.metrics.totalSales)}` : '—' }}</strong></div>
    <dl class="order-entry-metrics">
     <div><dt>ออเดอร์ที่ขายแล้ว</dt><dd>{{ salesReady ? `${daily.metrics.orderCount} บิล` : '—' }}</dd></div>
     <div><dt>จำนวนที่ขาย</dt><dd>{{ salesReady ? `${money(units)} ชาม` : '—' }}</dd></div>
     <div><dt>เฉลี่ยต่อบิล</dt><dd>{{ salesReady ? `฿${money(daily.metrics.avgOrderValue)}` : '—' }}</dd></div>
     <div><dt>กำไรขั้นต้น</dt><dd>{{ salesReady ? `฿${money(daily.metrics.grossProfit)}` : '—' }}</dd></div>
    </dl>
    <div class="order-entry-booking"><span><strong>Pre-order รอดำเนินการ</strong><small>{{ bookings.length }} ออเดอร์</small></span><strong>฿{{ money(quoteTotal) }}</strong></div>
    <div v-if="daily.menus.length" class="order-entry-menus">
     <h4>เมนูขายดี</h4>
     <ul><li v-for="row in daily.menus.slice(0,3)" :key="row.id"><span>{{ row.label }}</span><strong>{{ money(row.qty) }} ชาม</strong></li></ul>
    </div>
   </section>
  </div>
  <section class="order-entry-records order-entry-surface" aria-labelledby="order-entry-records-title">
   <header><h3 id="order-entry-records-title">ออเดอร์วันที่เลือก</h3><p>{{ displayDate(day) }}</p></header>
   <div v-if="linked" class="order-entry-linked">
    <span>กำลังเปิด Pre-order · ตะกร้าร่างของวันนี้เก็บแยกไว้</span>
    <Button variant="quiet" size="compact" :disabled="blocked" @click="$emit('leave-preorder')">ออกจากรายการนี้</Button>
   </div>
   <p v-if="dailyState==='loading'" role="status">กำลังโหลดออเดอร์ของวันที่เลือก…</p>
   <div v-else-if="dailyState==='error'" class="order-entry-linked"><p role="alert">โหลดออเดอร์ของวันที่เลือกไม่ได้</p><Button variant="quiet" size="compact" @click="retryMonth(activeMonth)">ลองใหม่</Button></div>
   <p v-else-if="dailyState==='offline'" role="status">เชื่อมต่อเพื่อดูออเดอร์ของวันที่เลือก</p>
   <p v-else-if="!sales.length&&!bookings.length" class="order-entry-empty">ยังไม่มีออเดอร์ในวันที่เลือก</p>
   <ul v-if="sales.length||bookings.length" class="order-entry-list">
    <li v-for="sale in sales" :key="sale.reportKey">
     <div><strong>{{ sale.platformName || 'ยอดขาย' }}</strong><small v-if="sale.status==='cancelled'">คืนบิลแล้ว</small><small>{{ sale.items?.map(item=>item.menuName+' × '+item.qty).join(' · ') }}</small></div>
     <span>฿{{ money(sale.subtotal) }}</span>
     <Button variant="quiet" size="compact" @click="$emit('open-sale',sale)">ดูบิล</Button>
    </li>
    <li v-for="booking in bookings" :key="booking.id">
     <div><strong>Pre-order</strong><small>{{ data.display.platforms?.[booking.platformId]?.name || booking.platformId }}</small></div>
     <span>฿{{ money(booking.quoteCents/100) }}</span>
     <Button variant="quiet" size="compact" :disabled="blocked" @click="$emit('open-preorder',booking)">เปิดออเดอร์</Button>
    </li>
   </ul>
  </section>
 </section>
</template>

<script setup>
import {computed,onScopeDispose,ref,shallowReactive,watch} from 'vue'
import Button from '@/components/ui/Button.vue'
import {buildDashboard,money} from '@/domain/dashboard'
import {businessDateKey} from '@/domain/businessDate.js'
import {businessDay,dayKey,monthOf,offsetMonth,scheduledSummary} from './orderEntry.js'
import OrderDatePicker from './OrderDatePicker.vue'
import {projectReportOrders} from './reportProjection.js'

const props=defineProps({day:String,today:String,data:Object,service:Object,revision:Number,refreshKey:Number,ready:Boolean,blocked:Boolean,dateLocked:Boolean,linked:Boolean})
defineEmits(['update:day','open-sale','open-preorder','leave-preorder'])
const dateFormat=new Intl.DateTimeFormat('th-TH',{dateStyle:'long',timeZone:'UTC'})
const displayDate=value=>dateFormat.format(new Date(value+'T00:00:00Z'))
const activeMonth=computed(()=>monthOf(props.day)),visibleMonth=ref(activeMonth.value)
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
const daily=computed(()=>buildDashboard(sales.value,{start:props.day,end:props.day}))
const units=computed(()=>daily.value.menus.reduce((total,row)=>total+row.qty,0))
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
   const day=businessDateKey(row.createdAt)
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
 if(consecutive&&kind==='sale_set'){
  const month=monthOf(today),entry=reports.get(month)
  // A sale is server-dated today. Keep older verified days and reread today only.
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
.order-entry-overview{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);align-items:start;gap:12px}
.order-entry-surface{min-width:0;padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:16px}
.order-entry-summary,.order-entry-records{display:grid;gap:12px}
.order-entry h3{font-size:1.125rem;font-weight:600}
.order-entry header p,.order-entry-empty,.order-entry-records>p{color:var(--text-muted)}
.order-entry-total{display:grid;gap:4px;padding:12px;background:var(--bg-soft);border-radius:10px;color:var(--text-muted)}
.order-entry-total strong{color:var(--accent-brand);font-size:1.625rem;font-variant-numeric:tabular-nums}
.order-entry-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px}
.order-entry-metrics div{min-width:0;padding-block:4px}
.order-entry-metrics dt,.order-entry-booking small{color:var(--text-muted);font-size:.75rem}
.order-entry-metrics dd,.order-entry-booking strong,.order-entry-menus strong{font-weight:600;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.order-entry-booking,.order-entry-linked,.order-entry-menus li{display:flex;justify-content:space-between;align-items:center;gap:8px}
.order-entry-booking,.order-entry-menus{border-top:1px solid var(--border-subtle);padding-top:12px}
.order-entry-booking small{display:block}
.order-entry-menus h4{font-weight:600;margin-bottom:4px}
.order-entry-menus li{min-height:26px}
.order-entry-menus li span{overflow-wrap:anywhere}
.order-entry-menus li strong{white-space:nowrap}
.order-entry-list li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--border-subtle)}
.order-entry-list li>div{min-width:0;overflow-wrap:anywhere}
.order-entry-list small{display:block;color:var(--text-muted)}
.order-entry-list li>span{font-variant-numeric:tabular-nums;white-space:nowrap}
@container(max-width:660px){.order-entry-overview{grid-template-columns:minmax(0,1fr)}}
@media(max-width:480px){.order-entry-surface{padding:12px}.order-entry-list li{gap:4px}}
</style>
