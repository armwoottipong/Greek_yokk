<template>
 <div class="cart-body">
  <div v-if="!store.cart.length" class="cart-empty"><img :src="mascot" alt="" width="88" height="88"><strong>ชามแรกของออเดอร์นี้</strong><p>เลือกเมนูเพื่อเริ่มออเดอร์<br>แล้วตรวจรายการก่อนชำระเงิน</p></div>
  <template v-else>
   <div class="cart-list-heading"><span>{{ quantity }} ชาม</span><Button variant="quiet" size="compact" :disabled="busy" :loading="clearing" @click="clearCart">ล้างตะกร้า</Button></div>
   <article v-for="(item,index) in store.cart" :key="index" :data-cart-item="index" :data-cart-line="index" class="cart-line">
    <div class="cart-line-title">
     <div><h4>{{ item.menu.name }}</h4><small>ราคาเมนู ฿{{ money(menuPrice(item.menu,store.currentPlatformId)) }} / ชาม</small></div>
     <div class="cart-line-total"><small>รวมรายการ</small><b class="font-number">฿{{ money(itemPrice(item,store.currentPlatformId)) }}</b></div>
    </div>
    <p v-if="item.isBackorder" class="cart-shortage">ของหมด · ยืนยันขายต่อ</p>
    <div v-if="item.selectedAddons?.length" class="cart-addons">
     <p>ตัวเลือกต่อชาม</p>
     <ul>
      <li v-for="addon in item.selectedAddons" :key="`${addon.groupId || ''}:${addon.id}`">
       <span>{{ addon.name }}{{ addon.selectionQty > 1 ? ' ×'+addon.selectionQty : '' }}<small v-if="addon.groupName">{{ addon.groupName }}</small></span>
       <span class="cart-addon-price">{{ addonPrice(addon,store.currentPlatformId) === 0 ? 'รวมในราคา' : '+฿'+money(addonPrice(addon,store.currentPlatformId)) }}</span>
      </li>
     </ul>
    </div>
    <p v-if="item.note" class="cart-item-note"><span>หมายเหตุ</span> {{ item.note }}</p>
    <div class="cart-line-actions"><div class="cart-quantity"><IconButton :label="'ลดจำนวน '+item.menu.name" :disabled="busy||item.qty<=1" @click="store.updateCartQty(index,item.qty-1)"><Minus :size="16" aria-hidden="true"/></IconButton><span class="font-number" :aria-label="'จำนวน '+item.menu.name">{{ item.qty }}</span><IconButton :label="'เพิ่มจำนวน '+item.menu.name" :disabled="busy" @click="store.updateCartQty(index,item.qty+1)"><Plus :size="16" aria-hidden="true"/></IconButton></div><Button variant="quiet" size="compact" :aria-label="'ลบ '+item.menu.name+' จากตะกร้า'" :disabled="busy" @click="store.removeFromCart(index)">ลบ</Button></div>
   </article>
   <section class="cart-packages" aria-label="บรรจุภัณฑ์ของออเดอร์">
    <div>
     <strong>บรรจุภัณฑ์</strong>
     <p>{{ packagePlan.items.length ? packagePlan.items.length+' รายการ' : 'ยังไม่มีบรรจุภัณฑ์' }}<span v-if="store.packageAdjustments?.length"> · ปรับแล้ว</span></p>
    </div>
    <Button variant="secondary" size="compact" :disabled="busy" @click="store.modals.packageReview.isOpen=true">ตรวจ/ปรับ Package</Button>
    <ul v-if="packagePreview.length" class="cart-package-preview">
     <li v-for="{item,material} in packagePreview" :key="item.materialId">
      <span class="cart-package-image"><EntityImage kind="materials" :entity-id="item.materialId" :image="material?.image" :emoji="material?.emoji || '📦'"/></span>
      <span>{{ item.materialName }}</span>
      <b class="font-number">{{ item.requestedQty }} {{ item.unit }}</b>
     </li>
     <li v-if="packagePlan.items.length > packagePreview.length" class="cart-package-more">อีก {{ packagePlan.items.length - packagePreview.length }} รายการ</li>
    </ul>
   </section>
   <details class="cart-financial"><summary>รายละเอียดรายรับและต้นทุน</summary><dl><div><dt>ยอดชำระ</dt><dd>฿{{ money(summary.subtotal) }}</dd></div><div v-if="summary.gpAmount>0"><dt>ค่าธรรมเนียมช่องทาง ({{ summary.gpPercent }}%)</dt><dd>−฿{{ money(summary.gpAmount) }}</dd></div><div><dt>รายรับหลังค่าธรรมเนียม</dt><dd>฿{{ money(summary.netRevenue) }}</dd></div><div><dt>ต้นทุนวัตถุดิบประมาณ</dt><dd>฿{{ money(summary.totalIngredientCost) }}</dd></div><div><dt>ต้นทุนบรรจุภัณฑ์ประมาณ</dt><dd>฿{{ money(summary.totalPackagingCost) }}</dd></div><div v-if="summary.expectedPackagingShortageCost"><dt>ต้นทุน Package ที่ขาด (ไม่รวมกำไร)</dt><dd>฿{{ money(summary.expectedPackagingShortageCost) }}</dd></div><div><dt>ต้นทุนขายรวม</dt><dd>฿{{ money(summary.totalFoodCost) }}</dd></div><div><dt>กำไรขั้นต้นประมาณ</dt><dd>฿{{ money(summary.grossProfit) }}</dd></div></dl></details>
   <section v-if="store.cartLotWarnings?.length" class="cart-lot-warnings" aria-label="คำเตือนล็อตวัตถุดิบ"><h4>ล็อตใกล้หมดหรือสต็อกไม่พอ</h4><div v-for="warning in store.cartLotWarnings" :key="warning.material.id"><div><strong>{{ warning.material.name }}</strong><p>{{ warning.shortageQty>0?'ขาดอีก '+warning.shortageQty+' '+warning.material.unit:warning.willDeplete?'สต็อกจะหมด':'ล็อตใกล้หมด' }}</p></div><Button variant="secondary" size="compact" :disabled="busy" @click="$emit('switch-lot',warning)">ดูล็อต</Button></div></section>
  </template>
 </div>
</template>
<script setup>
import {computed,ref} from 'vue'
import {Minus,Plus} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import {menuPrice,addonPrice,itemPrice} from './cartPrices'
const props=defineProps({busy:Boolean,model:Object})
defineEmits(['switch-lot'])
const store=props.model||usePosStore()
const mascot=`${import.meta.env.BASE_URL}brand/content-mascot.svg`
const summary=computed(()=>store.cartSummary)
const packagePlan=computed(()=>store.cartPackagePlan)
const packagePreview=computed(()=>packagePlan.value.items.slice(0,2).map(item=>({item,material:store.materials?.find(material=>material.id===item.materialId)})))
const quantity=computed(()=>store.cart.reduce((n,item)=>n+item.qty,0))
const clearing=ref(false)
async function clearCart(){
 if(clearing.value||props.busy)return
 clearing.value=true
 try{
  const confirmed=await store.confirmDialog({title:'ล้างตะกร้านี้?',message:'รายการสินค้า ท็อปปิ้ง และหมายเหตุที่ยังไม่ได้ชำระจะถูกล้าง',confirmText:'ล้างตะกร้า',cancelText:'เก็บออเดอร์ไว้',type:'danger'})
  if(confirmed&&!props.busy)store.clearCart()
 }finally{clearing.value=false}
}
</script>
<style scoped>
.cart-item-note{padding-inline-start:8px;border-inline-start:2px solid var(--border-subtle);line-height:1.6;white-space:pre-wrap;overflow-wrap:anywhere}.cart-item-note>span{font-weight:600;margin-inline-end:4px}
.cart-body{display:grid;gap:20px;font-size:.8125rem}.cart-empty{padding:48px 12px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;color:var(--text-muted)}.cart-empty img{object-fit:contain;margin-bottom:8px}.cart-empty strong{font-size:.9375rem;color:var(--text-main)}.cart-empty p{font-size:.8125rem;line-height:1.8}
.cart-list-heading,.cart-line-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cart-list-heading{color:var(--text-muted)}
.cart-line{display:grid;gap:8px;padding-bottom:12px;border-bottom:1px solid var(--border-subtle);min-width:0}
.cart-line-title{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:start;gap:10px}
.cart-line-title h4{font-size:.9375rem;font-weight:650;overflow-wrap:anywhere;line-height:1.45}
.cart-line-title small,.cart-addons small{display:block;color:var(--text-muted);font-size:.75rem;margin-top:2px}
.cart-line-total{text-align:end;white-space:nowrap}.cart-line-total b{font-size:1rem}
.cart-quantity{display:flex;align-items:center;gap:4px;background:var(--bg-soft);border-radius:12px}.cart-quantity>span{min-width:28px;text-align:center}.cart-quantity :deep(.ui-button){background:transparent}
.cart-addons{background:var(--bg-soft);border-radius:8px;padding:7px 10px;line-height:1.4}
.cart-addons p,.cart-addon-price{font-size:.75rem;color:var(--text-muted)}
.cart-addons ul{display:grid;gap:4px;margin-top:3px}
.cart-addons li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;overflow-wrap:anywhere}.cart-addon-price{white-space:nowrap;font-variant-numeric:tabular-nums}
.cart-shortage{color:var(--state-warning);font-size:.75rem}
.cart-financial{font-size:.75rem;color:var(--text-muted)}.cart-financial summary{cursor:pointer;padding:10px 0;color:var(--accent-brand)}.cart-financial dl{display:grid;gap:10px;margin-top:10px}.cart-financial dl>div{display:flex;justify-content:space-between;gap:12px}.cart-financial dd{font-variant-numeric:tabular-nums;white-space:nowrap}
.cart-lot-warnings{background:#FFFBEB;padding:12px;border-radius:12px;color:#92400E}.cart-lot-warnings h4{font-weight:500;margin-bottom:10px}.cart-lot-warnings>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.cart-lot-warnings p{font-size:.75rem;margin-top:4px}
.cart-packages{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--bg-soft);border-radius:10px;min-width:0}
.cart-packages>div{min-width:0}.cart-packages p,.cart-package-more{font-size:.75rem;color:var(--text-muted);line-height:1.5}
.cart-package-preview{width:100%;display:grid;gap:5px}
.cart-package-preview li:not(.cart-package-more){display:grid;grid-template-columns:28px minmax(0,1fr) auto;align-items:center;gap:8px;overflow-wrap:anywhere}
.cart-package-preview b{white-space:nowrap;font-weight:500}
.cart-package-image{width:28px;height:28px;border-radius:6px;background:var(--bg-card)}
</style>
