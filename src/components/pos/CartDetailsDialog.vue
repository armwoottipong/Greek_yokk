<template>
 <DialogFrame :open="open" id="pos-cart-details" title="รายละเอียดออเดอร์" :description="model.currentPlatform?.name" presentation="sheet" width="520px" compact @request-close="$emit('close')">
  <div class="order-details">
   <section aria-labelledby="order-detail-items">
    <h4 id="order-detail-items">รายการในออเดอร์</h4>
    <article v-for="({item,ingredients,groups},index) in lines" :key="index" class="order-detail-line">
     <header class="order-detail-product">
      <span class="order-detail-photo"><EntityImage :entity-id="item.menu.id" :image="item.menu.image" :emoji="item.menu.emoji" /></span>
      <div class="order-detail-identity">
       <h5>{{ item.menu.name }}</h5>
       <p class="order-detail-muted">{{ item.qty }} ชาม · เมนู ฿{{ money(menuPrice(item.menu,platform)) }}/ชาม</p>
      </div>
      <strong>฿{{ money(itemPrice(item,platform)) }}</strong>
     </header>
     <div v-if="item.selectedAddons?.length" class="order-detail-options">
      <h6>ตัวเลือกต่อชาม</h6>
      <div v-for="[groupId,group] in groups" :key="groupId" class="order-detail-option-group">
       <p v-if="group.name" class="order-detail-muted">{{ group.name }}</p>
       <ul>
        <li v-for="addon in group.options" :key="addon.id">
         <span>{{ addon.name }}{{ addon.selectionQty>1 ? ' ×'+addon.selectionQty : '' }}</span>
         <span>{{ addonPrice(addon,platform)===0 ? 'รวมในราคา' : '+฿'+money(addonPrice(addon,platform)) }}</span>
        </li>
       </ul>
      </div>
     </div>
     <OrderIngredients class="order-detail-ingredients" :rows="ingredients" />
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
   <section class="order-detail-revenue" aria-labelledby="order-detail-revenue">
    <h4 id="order-detail-revenue">ยอดชำระและรายรับ</h4>
    <dl>
     <div class="order-detail-payable"><dt>ยอดชำระ</dt><dd>฿{{ amount(summary.subtotal) }}</dd></div>
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
import OrderIngredients from './OrderIngredients.vue'
import {lineIngredients} from './orderIngredients'

const props=defineProps({open:Boolean,model:{type:Object,required:true},packageItems:{type:Array,required:true}})
defineEmits(['close'])
const summary=computed(()=>props.model.cartSummary)
const platform=computed(()=>props.model.currentPlatformId)
const lines=computed(()=>props.open?props.model.cart.map(item=>{
 const groups=new Map()
 for(const addon of item.selectedAddons||[]){
  const id=addon.groupId||addon.groupName||''
  if(!groups.has(id))groups.set(id,{name:addon.groupName,options:[]})
  groups.get(id).options.push(addon)
 }
 return {item,groups,ingredients:lineIngredients(item,props.model.materials||[])}
}):[])
const packages=computed(()=>props.packageItems.map(item=>({item,material:props.model.materials?.find(row=>row.id===item.materialId)})))
const formatAmount=new Intl.NumberFormat('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}).format
const amount=value=>formatAmount(value??0)
</script>

<style scoped>
.order-details{display:grid;gap:22px;font-size:.875rem;line-height:1.55;color:var(--text-main)}
.order-details>section{display:grid;gap:10px;min-width:0}
.order-details h4{font-size:1rem;font-weight:650}
.order-detail-line{display:grid;gap:0;border:1px solid var(--border-subtle);border-radius:12px;overflow:hidden}
.order-detail-product{display:grid;grid-template-columns:44px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px;background:var(--bg-soft)}
.order-detail-photo{width:44px;height:44px;border-radius:8px;background:var(--bg-card)}
.order-detail-identity h5{font-weight:650;overflow-wrap:anywhere}
.order-detail-product>strong,.order-detail-payable dd{color:var(--accent-brand);font-size:1rem;font-weight:700}
.order-detail-options li,.order-details dl>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:baseline}
.order-detail-product>strong,.order-details dd,.order-detail-options li>span:last-child,.order-detail-packages li>span:last-child{font-variant-numeric:tabular-nums;text-align:end;white-space:nowrap}
.order-detail-muted,.order-detail-options li>span:last-child{font-size:.75rem;color:var(--text-muted)}
.order-detail-options,.order-detail-line .order-detail-ingredients,.order-detail-note{padding:12px;border-top:1px solid var(--border-subtle)}
.order-detail-options,.order-detail-option-group,.order-detail-options ul{display:grid;gap:5px}
.order-detail-options{gap:9px}
.order-detail-options h6,.order-detail-note b,.order-detail-line :deep(.order-ingredients>p:first-child){font-size:.8125rem;font-weight:650;color:var(--text-main)}
.order-detail-line .order-detail-ingredients{border-radius:0;background:transparent}
.order-detail-note{white-space:pre-wrap;overflow-wrap:anywhere}
.order-detail-packages,.order-details dl{display:grid;gap:7px;border-top:1px solid var(--border-subtle);padding-top:9px}
.order-detail-revenue{padding:12px;border-radius:12px;background:var(--bg-soft)}
.order-detail-total{border-top:1px solid var(--border-subtle);padding-top:7px;font-weight:650}
.order-detail-packages li{display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px}
.order-detail-image{width:28px;height:28px;border-radius:6px;background:var(--bg-soft)}
@media(max-width:767px){.order-details{gap:18px}.order-detail-back{width:100%}}
</style>
