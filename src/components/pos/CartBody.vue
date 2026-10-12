<template>
 <div class="cart-body">
  <div v-if="!store.cart.length" class="cart-empty"><ShoppingBag :size="28" aria-hidden="true"/><strong>เลือกเมนูเพื่อเริ่มออเดอร์</strong><p>รายการที่เลือกจะแสดงที่นี่</p></div>
  <template v-else>
   <div class="cart-list-heading"><span>{{ quantity }} ชาม</span><Button variant="quiet" size="compact" :disabled="busy" :loading="clearing" @click="clearCart">ล้างตะกร้า</Button></div>
   <article v-for="(item,index) in store.cart" :key="index" :data-cart-item="index" class="cart-line">
    <div class="cart-line-title"><div><strong>{{ item.menu.name }}</strong><small>฿{{ money(menuPrice(item.menu,store.currentPlatformId)) }} / ชาม</small></div><b class="font-number">฿{{ money(itemPrice(item,store.currentPlatformId)) }}</b></div>
    <p v-if="item.isBackorder" class="cart-shortage">ของหมด · ยืนยันขายต่อ</p>
    <ul v-if="item.selectedAddons?.length" class="cart-addons"><li v-for="addon in item.selectedAddons" :key="addon.id">{{ addon.name }} <span>+฿{{ money(addonPrice(addon,store.currentPlatformId)) }}</span></li></ul>
    <div class="cart-line-actions"><div class="cart-quantity"><IconButton :label="'ลดจำนวน '+item.menu.name" :disabled="busy||item.qty<=1" @click="store.updateCartQty(index,item.qty-1)"><Minus :size="16" aria-hidden="true"/></IconButton><span class="font-number" :aria-label="'จำนวน '+item.menu.name">{{ item.qty }}</span><IconButton :label="'เพิ่มจำนวน '+item.menu.name" :disabled="busy" @click="store.updateCartQty(index,item.qty+1)"><Plus :size="16" aria-hidden="true"/></IconButton></div><Button variant="quiet" size="compact" :aria-label="'ลบ '+item.menu.name+' จากตะกร้า'" :disabled="busy" @click="store.removeFromCart(index)">ลบ</Button></div>
   </article>
   <section v-if="packagePlan.items.length" class="cart-packages" aria-label="บรรจุภัณฑ์ของออเดอร์"><div><strong>Package</strong><p>{{ packagePlan.items.map(item=>`${item.materialName} ${item.requestedQty} ${item.unit}`).join(' · ') }}</p></div><Button variant="secondary" size="compact" :disabled="busy" @click="store.modals.packageReview.isOpen=true">ตรวจ/ปรับ Package</Button><span v-if="packagePlan.items.some(item=>item.adjustmentQty!==0)" class="cart-package-adjusted">ปรับแล้ว</span></section>
   <FormField id="pos-order-note" label="หมายเหตุออเดอร์"><textarea id="pos-order-note" v-model="store.orderNote" :disabled="busy" rows="2" placeholder="เช่น หวานน้อย หรือแยกท็อปปิ้ง"/></FormField>
   <details class="cart-financial"><summary>รายละเอียดรายรับและต้นทุน</summary><dl><div><dt>ยอดชำระ</dt><dd>฿{{ money(summary.subtotal) }}</dd></div><div v-if="summary.gpAmount>0"><dt>ค่าธรรมเนียมช่องทาง ({{ summary.gpPercent }}%)</dt><dd>−฿{{ money(summary.gpAmount) }}</dd></div><div><dt>รายรับหลังค่าธรรมเนียม</dt><dd>฿{{ money(summary.netRevenue) }}</dd></div><div><dt>ต้นทุนวัตถุดิบประมาณ</dt><dd>฿{{ money(summary.totalIngredientCost) }}</dd></div><div><dt>ต้นทุนบรรจุภัณฑ์ประมาณ</dt><dd>฿{{ money(summary.totalPackagingCost) }}</dd></div><div><dt>ต้นทุนขายรวม</dt><dd>฿{{ money(summary.totalFoodCost) }}</dd></div><div><dt>กำไรขั้นต้นประมาณ</dt><dd>฿{{ money(summary.grossProfit) }}</dd></div></dl></details>
   <section v-if="store.cartLotWarnings?.length" class="cart-lot-warnings" aria-label="คำเตือนล็อตวัตถุดิบ"><h4>ล็อตใกล้หมดหรือสต็อกไม่พอ</h4><div v-for="warning in store.cartLotWarnings" :key="warning.material.id"><div><strong>{{ warning.material.name }}</strong><p>{{ warning.shortageQty>0?'ขาดอีก '+warning.shortageQty+' '+warning.material.unit:warning.willDeplete?'สต็อกจะหมด':'ล็อตใกล้หมด' }}</p></div><Button variant="secondary" size="compact" :disabled="busy" @click="$emit('switch-lot',warning)">ดูล็อต</Button></div></section>
  </template>
 </div>
</template>
<script setup>
import {computed,ref} from 'vue'
import {ShoppingBag,Minus,Plus} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import FormField from '@/components/ui/FormField.vue'
import {menuPrice,addonPrice,itemPrice} from './cartPrices'
const props=defineProps({busy:Boolean})
defineEmits(['switch-lot'])
const store=usePosStore()
const summary=computed(()=>store.cartSummary)
const packagePlan=computed(()=>store.cartPackagePlan)
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
.cart-body{display:grid;gap:16px;font-size:.8125rem}.cart-empty{padding:32px 12px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;color:var(--text-muted)}.cart-empty strong{font-size:.875rem;color:var(--text-main)}.cart-empty p{font-size:.75rem}
.cart-list-heading,.cart-line-title,.cart-line-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.cart-list-heading{color:var(--text-muted)}.cart-line{padding-bottom:16px;border-bottom:1px solid var(--border-subtle);min-width:0}.cart-line-title{align-items:flex-start}.cart-line-title>div{min-width:0}.cart-line-title strong{display:block;font-weight:500;overflow-wrap:anywhere;line-height:1.6}.cart-line-title small{display:block;color:var(--text-muted);font-size:.75rem;margin-top:3px}.cart-line-title>b{white-space:nowrap;font-size:.875rem}
.cart-quantity{display:flex;align-items:center;gap:4px}.cart-quantity>span{min-width:28px;text-align:center}.cart-line-actions{margin-top:12px}.cart-addons{font-size:.75rem;color:var(--text-muted);margin-top:8px;display:grid;gap:4px}.cart-addons li{display:flex;justify-content:space-between;gap:8px}.cart-shortage{color:var(--state-warning);font-size:.75rem;margin-top:5px}
.cart-body textarea{width:100%;padding:10px 12px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--bg-card);font-size:.8125rem;resize:vertical}.cart-body textarea:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
.cart-financial{font-size:.75rem;color:var(--text-muted)}.cart-financial summary{cursor:pointer;padding:10px 0;color:var(--accent-brand)}.cart-financial dl{display:grid;gap:10px;margin-top:10px}.cart-financial dl>div{display:flex;justify-content:space-between;gap:12px}.cart-financial dd{font-variant-numeric:tabular-nums;white-space:nowrap}
.cart-lot-warnings{background:#FFFBEB;padding:12px;border-radius:12px;color:#92400E}.cart-lot-warnings h4{font-weight:500;margin-bottom:10px}.cart-lot-warnings>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.cart-lot-warnings p{font-size:.75rem;margin-top:4px}
.cart-packages{position:relative;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;border-radius:12px;background:var(--bg-soft);min-width:0}.cart-packages>div{min-width:0}.cart-packages strong{font-size:.75rem}.cart-packages p{font-size:.6875rem;color:var(--text-muted);overflow-wrap:anywhere;margin-top:3px}.cart-package-adjusted{position:absolute;right:8px;top:-8px;padding:2px 6px;border-radius:999px;background:#FEF3C7;color:#92400E;font-size:.625rem}
</style>
