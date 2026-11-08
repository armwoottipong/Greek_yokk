<template>
 <section class="order-entry" aria-label="บันทึกออเดอร์ตามวัน">
  <header class="order-entry-header">
   <h3>ออเดอร์ตามวัน</h3>
   <OrderDatePicker :day="day" :today="today" :max="latestDay" :disabled="dateLocked" @update:day="$emit('update:day',$event)" />
  </header>
  <div class="order-entry-totals">
   <span>ยอดขายจริง <strong>฿{{ money(total) }}</strong></span>
   <span>Pre-order {{ bookings.length }} ออเดอร์ <strong>฿{{ money(bookings.reduce((n,row)=>n+row.quoteCents,0)/100) }}</strong></span>
  </div>
  <div v-if="linked" class="order-entry-linked">
   <span>กำลังตรวจ Pre-order วันที่ {{ displayDate(day) }}</span>
   <Button variant="quiet" size="compact" :disabled="blocked" @click="$emit('leave-preorder')">ออกจากรายการนี้</Button>
  </div>
  <div v-if="soldMenus.length" class="order-entry-counts" aria-label="จำนวนที่ขายได้แยกตามเมนู">
   <span v-for="row in soldMenus" :key="row.id">{{ row.name }} <strong>{{ row.qty }} ชาม</strong></span>
  </div>
  <p v-if="loading" role="status">กำลังโหลดออเดอร์ของวันที่เลือก…</p>
  <p v-else-if="error" role="alert">{{ error }}</p>
  <p v-else-if="!sales.length&&!bookings.length" class="order-entry-empty">ยังไม่มีออเดอร์ในวันที่เลือก</p>
  <ul v-if="sales.length||bookings.length" class="order-entry-list">
   <li v-for="sale in sales" :key="sale.reportKey">
    <div><strong>{{ sale.platformName || 'ยอดขาย' }}</strong><small>{{ sale.items?.map(item=>item.menuName+' × '+item.qty).join(' · ') }}</small></div>
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
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import Button from '@/components/ui/Button.vue'
import {money} from '@/domain/dashboard'
import {businessDateKey} from '@/domain/businessDate.js'
import {businessDay,dayKey,scheduledSummary} from './orderEntry.js'
import OrderDatePicker from './OrderDatePicker.vue'
import {projectReportOrders} from './reportProjection.js'

const props=defineProps({day:String,today:String,data:Object,service:Object,revision:Number,ready:Boolean,blocked:Boolean,dateLocked:Boolean,linked:Boolean})
defineEmits(['update:day','open-sale','open-preorder','leave-preorder'])
const sales=ref([]),loading=ref(false),error=ref('')
const dateFormat=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeZone:'UTC'})
const displayDate=value=>dateFormat.format(new Date(value+'T00:00:00Z'))
const latestDay=computed(()=>dayKey(businessDay(props.today)+366))
const bookings=computed(()=>scheduledSummary(props.data?.shop.preorders).orders.filter(row=>row.pickupDay===businessDay(props.day)))
const total=computed(()=>sales.value.reduce((n,row)=>n+Number(row.subtotal),0))
const soldMenus=computed(()=>{
 const map=new Map()
 for(const sale of sales.value)for(const item of sale.items||[]){
  const id=item.menuId||item.menuName,row=map.get(id)||{id,name:item.menuName||id,qty:0}
  row.qty+=Number(item.qty)||0
  map.set(id,row)
 }
 return [...map.values()]
})
watch([()=>props.day,()=>props.ready,()=>props.revision,()=>props.today],async([day,ready],_previous,onCleanup)=>{
 let current=true
 onCleanup(()=>{current=false})
 sales.value=[];error.value='';loading.value=false
 if(!ready||day>props.today)return
 loading.value=true
 try{
  const report=await props.service.report({start:day,end:day})
  if(current)sales.value=projectReportOrders(report,props.data).filter(row=>row.status!=='cancelled'&&businessDateKey(row.createdAt)===day)
 }catch{if(current)error.value='โหลดออเดอร์ไม่สำเร็จ กรุณาโหลดข้อมูลล่าสุดแล้วลองอีกครั้ง'}
 finally{if(current)loading.value=false}
},{immediate:true})
</script>
<style scoped>
.order-entry{display:grid;gap:12px;padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:14px;min-width:0;font-size:.8125rem}
.order-entry-header,.order-entry-linked{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.order-entry-header h3{font-size:1rem;font-weight:650}.order-entry-empty{color:var(--text-muted)}
.order-entry-totals{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.order-entry-totals>span{display:grid;padding:8px 10px;background:var(--bg-soft);border-radius:8px;color:var(--text-muted)}
.order-entry-totals strong{font-size:1.05rem;color:var(--text-main);font-variant-numeric:tabular-nums}
.order-entry-counts{display:flex;flex-wrap:wrap;gap:6px}
.order-entry-counts span{padding:4px 7px;border:1px solid var(--border-subtle);border-radius:6px}
.order-entry-list li{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:5px 0;border-top:1px solid var(--border-subtle)}
.order-entry-list li>div{min-width:0;overflow-wrap:anywhere}
.order-entry-list small{display:block;color:var(--text-muted)}
.order-entry-list li>span{font-variant-numeric:tabular-nums;white-space:nowrap}
@media(max-width:480px){.order-entry{padding:10px;gap:10px}.order-entry-list li{gap:4px}}
</style>
