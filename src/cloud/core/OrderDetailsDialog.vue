<template>
 <DialogFrame id="order-entry-details" title="ออเดอร์วันที่เลือก" :description="date" :open="open" width="600px" compact @request-close="$emit('request-close')">
  <template #header>
   <div class="order-details-heading"><h3 id="order-entry-details-title" ref="heading" tabindex="-1">ออเดอร์วันที่เลือก</h3><p>{{ date }}</p></div>
  </template>
  <div class="order-details">
   <p v-if="state==='loading'" role="status">กำลังโหลดออเดอร์…</p>
   <div v-else-if="state==='error'" class="order-details-error"><p role="alert">โหลดออเดอร์ของวันที่เลือกไม่ได้</p><Button variant="quiet" size="compact" @click="$emit('retry')">ลองใหม่</Button></div>
   <p v-else-if="state==='offline'" role="status">เชื่อมต่อเพื่อดูออเดอร์ของวันที่เลือก</p>
   <p v-else-if="!groups.length" class="order-details-empty">ยังไม่มีออเดอร์ในวันที่เลือก</p>
   <section v-for="group in groups" :key="group.kind" class="order-details-group" :aria-label="group.title">
    <header><component :is="group.icon" :size="18" aria-hidden="true" /><h4>{{ group.title }}</h4><span>{{ group.rows.length }} รายการ</span></header>
    <ul class="order-entry-list">
     <li v-for="row in group.rows" :key="row.id" class="order-details-row">
      <div class="order-details-row-main">
       <div><strong>{{ row.platform }}</strong><span v-if="row.time">{{ row.time }}</span></div>
       <strong class="order-details-amount">{{ row.amount }}</strong>
      </div>
      <ul v-if="row.items.length" class="order-details-items" aria-label="รายการเมนู">
       <li v-for="(item,index) in row.items" :key="index" class="order-details-item">
        <div class="order-details-item-title"><span>{{ item.menuName || item.menuId }}</span><strong>× {{ item.qty }} ชาม</strong></div>
        <div v-if="item.selectedAddons?.length" class="order-details-choices">
         <p>ตัวเลือกต่อชาม</p>
         <ul>
          <li v-for="option in item.selectedAddons" :key="`${option.groupId || ''}:${option.id}`">{{ option.name || option.id }}<template v-if="option.selectionQty>1"> ×{{ option.selectionQty }}</template><template v-if="option.groupName"> · {{ option.groupName }}</template></li>
         </ul>
        </div>
        <p v-if="item.note" class="order-details-note">หมายเหตุ {{ item.note }}</p>
        <OrderIngredients v-if="group.kind==='preorder'" :rows="item.ingredients" label="วัตถุดิบต่อชามตามสูตรปัจจุบัน" />
       </li>
      </ul>
      <OrderIngredients :rows="row.ingredients" label="วัตถุดิบรวมในบิล" />
      <Button v-if="group.kind==='preorder'" variant="quiet" size="compact" :disabled="blocked" @click="openRow('open-preorder',row.source)">เปิด Pre-order <ChevronRight :size="14" aria-hidden="true" /></Button>
      <Button v-else variant="quiet" size="compact" @click="openRow('open-sale',row.source)">ดูใบเสร็จ <ChevronRight :size="14" aria-hidden="true" /></Button>
     </li>
    </ul>
   </section>
  </div>
 </DialogFrame>
</template>

<script setup>
import {computed,ref} from 'vue'
import {CalendarClock,ChevronRight,ReceiptText,RotateCcw} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import OrderIngredients from '@/components/pos/OrderIngredients.vue'
import {lineIngredients} from '@/components/pos/orderIngredients'
import {money} from '@/domain/dashboard'
import {projectCart} from './productPresentation'

const props=defineProps({open:Boolean,date:String,sales:Array,bookings:Array,data:Object,state:String,blocked:Boolean})
const emit=defineEmits(['request-close','retry','open-sale','open-preorder'])
const heading=ref(null)
const timeFormat=new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'})
const formatAmount=value=>value==null||!Number.isFinite(Number(value))?'—':`฿${money(value)}`

function openRow(event,row){
 // The row may disappear during the next server refresh. Keep a stable opener.
 heading.value?.focus({preventScroll:true})
 emit(event,row)
}

function bookingItems(booking){
 try{
  const {lines}=JSON.parse(booking.draftJson)
  return projectCart(lines,props.data).map(item=>({...item,menuName:item.menu.name,ingredients:lineIngredients(item,props.data.materials||[])}))
 }catch{return []}
}
const groups=computed(()=>{
 if(!props.open)return []
 const display=props.data.display
 const sold=[],cancelled=[]
 for(const sale of props.sales){
  const list=sale.status==='cancelled'?cancelled:sold
  list.push({id:sale.reportKey,source:sale,platform:sale.platformName||display?.platforms?.[sale.platformId]?.name||'ไม่ระบุช่องทาง',time:sale.saleDay?'บันทึกย้อนหลัง':timeFormat.format(new Date(sale.createdAt)),amount:formatAmount(sale.subtotal),items:sale.items||[],ingredients:sale.ingredients})
 }
 const preorders=props.bookings.map(booking=>({id:booking.id,source:booking,platform:display?.platforms?.[booking.platformId]?.name||booking.platformId,amount:formatAmount(booking.quoteCents/100),items:bookingItems(booking)}))
 return [{kind:'sale',title:'บิลขาย',icon:ReceiptText,rows:sold},{kind:'preorder',title:'Pre-order รอดำเนินการ',icon:CalendarClock,rows:preorders},{kind:'cancelled',title:'คืนบิลแล้ว',icon:RotateCcw,rows:cancelled}].filter(group=>group.rows.length)
})
</script>

<style scoped>
.order-details-heading h3{font-size:1.125rem;font-weight:600}
.order-details-heading p{margin-top:4px;font-size:.8125rem;color:var(--text-muted)}
.order-details{display:grid;gap:16px;color:var(--text-muted)}
.order-details-empty{padding:16px 0}
.order-details-error,.order-details-group header,.order-details-row-main,.order-details-item-title{display:flex;align-items:baseline;gap:8px}
.order-details-group header{padding:8px 0;border-bottom:1px solid var(--border-subtle);color:var(--accent-brand)}
.order-details-group h4{font-weight:600;color:var(--text-main)}
.order-details-group header span{margin-inline-start:auto;font-size:.75rem;color:var(--text-muted);white-space:nowrap}
.order-details-row{display:grid;gap:8px;padding:12px 0;border-bottom:1px solid var(--border-subtle)}
.order-details-row-main,.order-details-item-title,.order-details-error{justify-content:space-between}
.order-details-row-main>div{min-width:0}
.order-details-row-main>div strong,.order-details-row-main>div span{display:block;overflow-wrap:anywhere}
.order-details-row-main strong,.order-details-items strong{font-weight:600;color:var(--text-main)}
.order-details-row-main span,.order-details-items{font-size:.8125rem}
.order-details-amount,.order-details-items strong{white-space:nowrap;font-variant-numeric:tabular-nums}
.order-details-items{display:grid;gap:4px;padding:8px 12px;background:var(--bg-soft);border-radius:10px}
.order-details-item{display:grid;gap:4px;min-width:0;overflow-wrap:anywhere}
.order-details-item + .order-details-item{border-top:1px solid var(--border-subtle);padding-top:6px}
.order-details-choices ul{padding-inline-start:1rem;list-style:disc}
.order-details-choices p,.order-details-note{font-size:.75rem}
.order-details-note{white-space:pre-wrap}
.order-details-row>.ui-button{justify-self:end;gap:4px}
</style>
