<template>
 <DialogFrame :open="open" id="pos-cart-details" title="รายละเอียดออเดอร์" :description="model.currentPlatform?.name" presentation="sheet" width="520px" compact @request-close="$emit('close')">
  <div class="order-details">
   <section aria-labelledby="order-detail-items">
    <h4 id="order-detail-items">เมนูและราคา</h4>
    <article v-for="(item,index) in model.cart" :key="index" class="order-detail-line">
     <header><h5>{{ item.menu.name }}</h5><strong>฿{{ money(itemPrice(item,platform)) }}</strong></header>
     <p class="order-detail-muted">{{ item.qty }} ชาม · ราคาเมนู ฿{{ money(menuPrice(item.menu,platform)) }} / ชาม</p>
     <div v-if="item.selectedAddons?.length" class="order-detail-options">
      <p class="order-detail-muted">ตัวเลือกต่อชาม</p>
      <ul>
       <li v-for="addon in item.selectedAddons" :key="`${addon.groupId || ''}:${addon.id}`">
        <span>{{ addon.name }}{{ addon.selectionQty>1 ? ' ×'+addon.selectionQty : '' }}<small v-if="addon.groupName">{{ addon.groupName }}</small></span>
        <span>{{ addonPrice(addon,platform)===0 ? 'รวมในราคา' : '+฿'+money(addonPrice(addon,platform)) }}</span>
       </li>
      </ul>
     </div>
     <p v-if="item.note" class="order-detail-note"><b>หมายเหตุ</b> {{ item.note }}</p>
    </article>
   </section>
   <section v-if="packages.length" aria-labelledby="order-detail-packages">
    <h4 id="order-detail-packages">บรรจุภัณฑ์</h4>
    <ul class="order-detail-packages">
     <li v-for="{item,material} in packages" :key="item.materialId">
      <span class="order-detail-image"><EntityImage kind="materials" :entity-id="item.materialId" :image="material?.image" :emoji="material?.emoji || '📦'"/></span>
      <span>{{ item.materialName }}</span>
      <span>{{ item.requestedQty }} {{ item.unit }}</span>
     </li>
    </ul>
   </section>
   <section aria-labelledby="order-detail-revenue">
    <h4 id="order-detail-revenue">ยอดชำระและรายรับ</h4>
    <dl>
     <div><dt>ยอดชำระ</dt><dd>฿{{ amount(summary.subtotal) }}</dd></div>
     <div data-order-gp><dt>หัก GP ({{ summary.gpPercent }}%)</dt><dd>−฿{{ amount(summary.gpAmount) }}</dd></div>
     <div class="order-detail-total" data-order-net><dt>ร้านได้รับหลังหัก GP</dt><dd>฿{{ amount(summary.netRevenue) }}</dd></div>
    </dl>
   </section>
   <section aria-labelledby="order-detail-costs">
    <h4 id="order-detail-costs">ต้นทุนและกำไรประมาณการ</h4>
    <dl>
     <div><dt>ต้นทุนวัตถุดิบประมาณ</dt><dd>฿{{ amount(summary.totalIngredientCost) }}</dd></div>
     <div><dt>ต้นทุนบรรจุภัณฑ์ประมาณ</dt><dd>฿{{ amount(summary.totalPackagingCost) }}</dd></div>
     <div v-if="summary.expectedPackagingShortageCost"><dt>ต้นทุนบรรจุภัณฑ์ที่ขาด (ไม่รวมกำไร)</dt><dd>฿{{ amount(summary.expectedPackagingShortageCost) }}</dd></div>
     <div><dt>ต้นทุนขายรวม</dt><dd>฿{{ amount(summary.totalFoodCost) }}</dd></div>
     <div class="order-detail-total"><dt>กำไรขั้นต้นประมาณ</dt><dd>฿{{ amount(summary.grossProfit) }}</dd></div>
    </dl>
   </section>
  </div>
  <template #footer><Button variant="secondary" class="order-detail-back" @click="$emit('close')">กลับรถเข็น</Button></template>
 </DialogFrame>
</template>

<script setup>
import {computed} from 'vue'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import {money} from '@/domain/dashboard'
import {menuPrice,addonPrice,itemPrice} from './cartPrices'

const props=defineProps({open:Boolean,model:{type:Object,required:true},packageItems:{type:Array,required:true}})
defineEmits(['close'])
const summary=computed(()=>props.model.cartSummary)
const platform=computed(()=>props.model.currentPlatformId)
const packages=computed(()=>props.packageItems.map(item=>({item,material:props.model.materials?.find(row=>row.id===item.materialId)})))
const formatAmount=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format
const amount=value=>formatAmount(value??0)
</script>

<style scoped>
.order-details{display:grid;gap:20px;font-size:.875rem;line-height:1.55}
.order-details section{min-width:0}
.order-details h4{font-size:.9375rem;font-weight:650;padding-bottom:6px;border-bottom:1px solid var(--border-subtle)}
.order-detail-line{display:grid;gap:4px;padding:8px 0;border-bottom:1px solid var(--border-subtle)}
.order-detail-line:last-child{border-bottom:0;padding-bottom:0}
.order-detail-line header,.order-detail-options li,.order-details dl>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px}
.order-detail-line h5,.order-detail-note b{font-weight:600}
.order-detail-line header>strong,.order-details dd,.order-detail-options li>span:last-child,.order-detail-packages li>span:last-child{font-variant-numeric:tabular-nums;text-align:end;white-space:nowrap}
.order-detail-muted,.order-detail-options small{font-size:.75rem;color:var(--text-muted)}
.order-detail-options{display:grid;gap:4px;margin-top:3px;padding:6px 9px;background:var(--bg-soft);border-radius:8px}
.order-detail-options small{display:block}
.order-detail-options ul,.order-details dl,.order-detail-packages{display:grid;gap:5px}
.order-detail-note{white-space:pre-wrap;overflow-wrap:anywhere}
.order-details dl,.order-detail-packages{padding-top:8px}
.order-detail-total{font-weight:650}
.order-detail-packages li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px}
.order-detail-image{width:28px;height:28px;border-radius:6px;background:var(--bg-soft)}
@media(max-width:767px){.order-details{gap:16px}.order-detail-back{width:100%}}
</style>
