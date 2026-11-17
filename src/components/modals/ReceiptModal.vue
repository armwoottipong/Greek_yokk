<template>
 <DialogFrame :open="store.modals.receipt.isOpen && Boolean(order)" id="ReceiptModal" title="ใบเสร็จรับเงิน" width="420px" compact :teleport="teleport" @request-close="close">
  <article v-if="order" id="printable-receipt" class="receipt-paper">
   <header class="receipt-brand">
    <img :src="wordmark" alt="Yoggie" width="108" height="43" />
    <strong v-if="order.status==='cancelled'" class="receipt-cancelled">คืนบิลแล้ว</strong>
   </header>

   <dl class="receipt-meta receipt-pairs">
    <div><dt>เลขที่บิล</dt><dd class="receipt-bill-number" :title="order.orderId">{{ billNumber }}</dd></div>
    <div v-if="order.saleDay"><dt>วันที่ขาย</dt><dd>{{ dateLabel(order.saleDay) }}</dd></div>
    <div v-if="formattedDate"><dt>{{ order.saleDay?'บันทึกเมื่อ':'วันที่และเวลา' }}</dt><dd>{{ formattedDate }}</dd></div>
    <div v-if="order.platformName"><dt>ช่องทางขาย</dt><dd>{{ order.platformName }}</dd></div>
    <div v-if="order.paymentMethod"><dt>วิธีชำระเงิน</dt><dd>{{ order.paymentMethod }}</dd></div>
   </dl>
   <p v-if="order.note" class="receipt-order-note"><strong>หมายเหตุ</strong> {{ order.note }}</p>

   <section v-if="order.items?.length" class="receipt-section" aria-labelledby="receipt-items-title">
    <div class="receipt-row receipt-column-heading"><h4 id="receipt-items-title">รายการ</h4><span>จำนวนเงิน</span></div>
    <ul class="receipt-items">
     <li v-for="(item,index) in order.items" :key="index">
      <div class="receipt-row receipt-item-main">
       <span class="receipt-qty">{{ item.qty }}×</span>
       <strong>{{ item.menuName || item.menuId }}</strong>
       <strong class="receipt-amount">{{ amount(item.totalPrice) }}</strong>
      </div>
      <ul v-if="item.selectedAddons?.length" class="receipt-addons">
       <li v-for="(addon,addonIndex) in item.selectedAddons" :key="addonIndex" class="receipt-row">
        <span>{{ addon.name || addon.id }}<template v-if="addon.selectionQty>1"> ×{{ addon.selectionQty }}</template><small v-if="addon.groupName"> · {{ addon.groupName }}</small></span>
        <span v-if="hasAmount(addon.price)&&Number(addon.price)!==0" class="receipt-amount">{{ amount(addon.price*(addon.selectionQty||1)) }} <small>(รวมแล้ว)</small></span>
       </li>
      </ul>
      <p v-if="item.note" class="receipt-item-note">หมายเหตุ {{ item.note }}</p>
     </li>
    </ul>
   </section>

   <div class="receipt-payment receipt-row">
    <strong>{{ order.status==='cancelled'?'ยอดตามบิล':'ยอดที่ลูกค้าชำระ' }}</strong>
    <strong class="receipt-amount">{{ amount(order.subtotal) }}</strong>
   </div>

   <section class="receipt-financials" aria-labelledby="receipt-financials-title">
    <h4 id="receipt-financials-title">สรุปสำหรับร้าน</h4>
    <div class="receipt-profit receipt-row" :class="{'receipt-positive':profit>0,'receipt-loss':profit<0}">
     <strong>{{ order.status==='cancelled'?'กำไรตามบิลเดิม':'กำไรต่อบิล' }}</strong>
     <strong class="receipt-amount">{{ amount(profit) }}</strong>
    </div>
    <p class="receipt-profit-note">{{ profit===null?'บิลนี้มีข้อมูลต้นทุนหรือรายรับไม่ครบ':'หลังหัก GP และต้นทุนขาย ก่อนค่าใช้จ่ายร้าน' }}</p>
    <dl class="receipt-pairs">
     <div v-if="hasAmount(order.gpAmount)"><dt>ค่าธรรมเนียม GP<span v-if="orderGpPercent!==null"> ({{ orderGpPercent }}%)</span></dt><dd class="receipt-amount receipt-expense">{{ amount(-Number(order.gpAmount)) }}</dd></div>
     <div v-if="hasAmount(order.netRevenue)"><dt>รายรับหลังหัก GP</dt><dd class="receipt-amount" :class="{'receipt-positive':order.netRevenue>0,'receipt-loss':order.netRevenue<0}">{{ amount(order.netRevenue) }}</dd></div>
     <div v-if="hasAmount(order.ingredientCost)"><dt>ต้นทุนวัตถุดิบ</dt><dd class="receipt-amount receipt-expense">{{ amount(order.ingredientCost) }}</dd></div>
     <div v-if="hasAmount(order.packagingCost)"><dt>ต้นทุนบรรจุภัณฑ์ที่ใช้จริง</dt><dd class="receipt-amount receipt-expense">{{ amount(order.packagingCost) }}</dd></div>
     <div v-if="hasAmount(order.foodCost)"><dt>ต้นทุนขายรวม</dt><dd class="receipt-amount receipt-expense">{{ amount(order.foodCost) }}</dd></div>
     <div v-if="order.expectedPackagingShortageCost" class="receipt-warning"><dt>ต้นทุน Package ที่ขาด (ไม่รวมกำไร)</dt><dd class="receipt-amount">{{ amount(order.expectedPackagingShortageCost) }}</dd></div>
    </dl>
   </section>

   <section v-if="order.packagePlan?.length" class="receipt-section receipt-extra" aria-labelledby="receipt-package-title">
    <h4 id="receipt-package-title">บรรจุภัณฑ์ที่ใช้</h4>
    <ul>
     <li v-for="row in order.packagePlan" :key="row.materialId" class="receipt-row">
      <span>{{ row.materialName }} {{ row.fulfilledQty }}/{{ row.requestedQty }} {{ row.unit }}<small v-if="row.adjustmentQty">ปรับ {{ row.adjustmentQty>0?'+':'' }}{{ row.adjustmentQty }} · {{ reasonLabel(row.reason) }}</small></span>
      <span class="receipt-amount">{{ amount(row.fulfilledCost) }}</span>
     </li>
    </ul>
   </section>

   <details v-if="order.stockShortages?.length" :key="order.orderId" class="receipt-section receipt-extra receipt-warning receipt-shortages">
    <summary>{{ order.stockShortages.some(row=>row.inventoryType==='packaging')?'วัตถุดิบ / บรรจุภัณฑ์ขาด':'วัตถุดิบขาดค้าง' }}<ChevronDown :size="14" aria-hidden="true" /></summary>
    <ul><li v-for="row in order.stockShortages" :key="row.materialId" class="receipt-row"><span>{{ row.materialName || row.materialId }}</span><span>{{ row.qty }} {{ row.unit }}</span></li></ul>
   </details>

   <footer class="receipt-thanks">ขอบคุณที่อุดหนุน Yoggie</footer>
  </article>

  <template #footer>
   <div class="receipt-actions">
    <Button variant="quiet" @click="close">เสร็จสิ้น</Button>
    <Button @click="printReceipt"><Printer :size="17" aria-hidden="true"/>พิมพ์ใบเสร็จ</Button>
   </div>
  </template>
 </DialogFrame>
</template>

<script setup>
import {computed} from 'vue'
import {ChevronDown,Printer} from 'lucide-vue-next'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import {usePosStore} from '@/stores/posStore'
import {dateLabel} from '@/domain/dashboard'

const props=defineProps({model:Object,teleport:Boolean})
const store=props.model||usePosStore()
const order=computed(()=>store.modals.receipt.order)
const billNumber=computed(()=>{
 const id=String(order.value?.orderId??'')
 return id.length>12?`…${id.slice(-8)}`:id
})
const wordmark=import.meta.env.BASE_URL+'brand/receipt-wordmark.svg'
const decimal=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
const hasAmount=value=>value!=null&&value!==''&&Number.isFinite(Number(value))
const amount=value=>hasAmount(value)?(Number(value)<0?'−':'')+'฿'+decimal.format(Math.abs(value)):'—'
const orderGpPercent=computed(()=>{
 const row=order.value
 if(hasAmount(row?.gpPercent))return row.gpPercent
 if(!hasAmount(row?.gpAmount)||!Number(row.subtotal))return null
 return Math.round((row.gpAmount/row.subtotal)*10000)/100
})
const profit=computed(()=>{
 const row=order.value
 if(hasAmount(row?.grossProfit))return Number(row.grossProfit)
 return hasAmount(row?.netRevenue)&&hasAmount(row.foodCost)?Math.round((row.netRevenue-row.foodCost)*100)/100:null
})
const thaiDateTime=new Intl.DateTimeFormat('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'})
const formattedDate=computed(()=>{
 const date=new Date(order.value?.createdAt)
 return order.value?.createdAt&&Number.isFinite(date.getTime())?thaiDateTime.format(date):''
})
const reasonLabels={separate_bag:'แยกถุง',customer_declined:'ลูกค้าไม่รับ',combined_packaging:'รวมบรรจุภัณฑ์',package_unavailable:'Package ไม่มี',repacked:'เปลี่ยนบรรจุ',other:'อื่น ๆ'}
const reasonLabel=reason=>reasonLabels[reason]||reason||'—'

function close(){
 store.modals.receipt.isOpen=false
 store.modals.receipt.order=null
}
function printReceipt(){window.print()}
</script>

<style scoped>
.receipt-paper{--receipt-ink:#5b0a0e;--receipt-muted:#725750;--receipt-rule:#e8d4ca;--receipt-income:#245b42;--receipt-negative:#90282d;--receipt-expense:#77503b;display:grid;gap:12px;min-width:0;color:#372521;font-size:.875rem;line-height:1.5}
.receipt-brand{display:grid;justify-items:center;gap:5px;padding-block:5px 2px;color:var(--receipt-ink);text-align:center}
.receipt-brand img{display:block;width:108px;height:auto}
.receipt-profit-note,.receipt-extra small,.receipt-addons small{font-size:.75rem;color:var(--receipt-muted)}
.receipt-positive{color:var(--receipt-income)}
.receipt-expense{color:var(--receipt-expense)}
.receipt-cancelled,.receipt-warning,.receipt-loss{color:var(--receipt-negative)}
.receipt-cancelled{font-size:.8125rem}
.receipt-pairs{display:grid;gap:3px}
.receipt-row,.receipt-pairs>div{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:8px}
.receipt-pairs dd,.receipt-amount,.receipt-column-heading span{text-align:end}
.receipt-pairs dd{min-width:0;overflow-wrap:anywhere}
.receipt-pairs dt,.receipt-column-heading,.receipt-addons,.receipt-item-note,.receipt-order-note{color:var(--receipt-muted)}
.receipt-warning dt{color:var(--receipt-negative)}
.receipt-meta>div{grid-template-columns:minmax(72px,.75fr) minmax(0,1.6fr)}
.receipt-meta dd{font-weight:500}
.receipt-bill-number{font-variant-numeric:tabular-nums}
.receipt-section{border-top:1px dashed var(--receipt-rule);padding-top:8px}
.receipt-column-heading{font-size:.75rem}
.receipt-items>li{padding-block:6px}
.receipt-items>li+li{border-top:1px solid var(--receipt-rule)}
.receipt-item-main{grid-template-columns:auto minmax(0,1fr) auto;overflow-wrap:anywhere}
.receipt-qty{font-variant-numeric:tabular-nums;color:var(--receipt-ink)}
.receipt-amount{white-space:nowrap;font-variant-numeric:tabular-nums}
.receipt-addons,.receipt-item-note{padding-inline-start:24px;margin-top:4px;font-size:.75rem;overflow-wrap:anywhere}
.receipt-extra small{display:block}
.receipt-item-note,.receipt-order-note{white-space:pre-wrap;overflow-wrap:anywhere}
.receipt-order-note{font-size:.8125rem}
.receipt-payment{padding-block:8px 0;border-top:1px solid var(--receipt-ink);color:var(--receipt-ink)}
.receipt-payment .receipt-amount{font-size:1.25rem;line-height:1.2}
.receipt-financials{display:grid;gap:4px;padding-top:8px;border-top:1px dashed var(--receipt-rule)}
.receipt-financials h4,.receipt-extra h4{font-weight:650;color:var(--receipt-ink)}
.receipt-financials dl,.receipt-extra{font-size:.8125rem}
.receipt-financials dl{padding-top:3px}
.receipt-profit-note{margin-top:-2px}
.receipt-profit .receipt-amount{font-size:1rem}
.receipt-extra ul{display:grid;gap:5px;margin-top:5px;overflow-wrap:anywhere}
.receipt-shortages summary{display:flex;align-items:center;gap:6px;width:fit-content;min-height:44px;font-weight:600;cursor:pointer;list-style:none}
.receipt-shortages summary::-webkit-details-marker{display:none}
.receipt-shortages summary:focus-visible{outline:2px solid var(--receipt-ink);outline-offset:2px}
.receipt-shortages[open] summary svg{transform:rotate(180deg)}
.receipt-thanks{text-align:center;padding-top:10px;border-top:1px dashed var(--receipt-rule);color:var(--receipt-muted);font-size:.75rem}
.receipt-actions{display:flex;gap:8px;width:100%}
.receipt-actions>.ui-button{justify-content:center;min-height:44px;gap:6px}
.receipt-actions>.ui-button:last-child{flex:1}
@media print{
 .receipt-paper{--receipt-ink:#000;--receipt-muted:#292929;--receipt-rule:#888;--receipt-income:#000;--receipt-negative:#000;--receipt-expense:#000;gap:8px;font-size:11px;color:#000;background:#fff}
 .receipt-brand{padding:4px 0}
 .receipt-brand img{width:90px;filter:grayscale(1)}
 .receipt-financials,.receipt-payment{padding-top:5px}
 .receipt-shortages summary{min-height:0}
 .receipt-items>li,.receipt-pairs>div,.receipt-profit,.receipt-brand{break-inside:avoid}
 .receipt-profit-note,.receipt-extra small,.receipt-addons small,.receipt-addons,.receipt-item-note,.receipt-thanks{font-size:10px}
}
</style>
