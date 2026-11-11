<template>
 <div class="cart-body">
  <div v-if="!store.cart.length" class="cart-empty"><img :src="mascot" alt="" width="88" height="88"><strong>ชามแรกของออเดอร์นี้</strong><p>เลือกเมนูเพื่อเริ่มออเดอร์<br>แล้วตรวจรายการก่อนชำระเงิน</p></div>
  <template v-else>
   <div class="cart-list-heading">
    <span>{{ quantity }} ชาม</span>
    <div class="cart-list-tools">
     <IconButton class="cart-info" label="ดูรายละเอียดออเดอร์" data-cart-details aria-haspopup="dialog" @click="detailsOpen=true"><Info :size="20" aria-hidden="true"/></IconButton>
     <Button variant="quiet" size="compact" :disabled="busy" :loading="clearing" @click="clearCart">ล้างตะกร้า</Button>
    </div>
   </div>
   <div class="cart-lines">
    <article v-for="(item,index) in store.cart" :key="index" :data-cart-item="index" :data-cart-line="index" class="cart-line">
     <div class="cart-line-title">
      <span class="cart-line-image"><EntityImage :entity-id="item.menu.id" :image="item.menu.image" :emoji="item.menu.emoji" /></span>
      <h4>{{ item.menu.name }}</h4>
      <strong class="cart-line-price font-number">฿{{ money(itemPrice(item,store.currentPlatformId)) }}</strong>
     </div>
     <p v-if="item.isBackorder" class="cart-shortage">ของหมด · ยืนยันขายต่อ</p>
     <div class="cart-line-actions">
      <div class="cart-quantity" role="group" :aria-label="'จำนวน '+item.menu.name">
       <IconButton :label="'ลดจำนวน '+item.menu.name" :disabled="busy||item.qty<=1" @click="store.updateCartQty(index,item.qty-1)"><Minus :size="16" aria-hidden="true"/></IconButton>
       <output class="font-number">{{ item.qty }}</output>
       <IconButton :label="'เพิ่มจำนวน '+item.menu.name" :disabled="busy" @click="store.updateCartQty(index,item.qty+1)"><Plus :size="16" aria-hidden="true"/></IconButton>
      </div>
      <IconButton class="cart-remove" :label="'ลบ '+item.menu.name+' จากตะกร้า'" :disabled="busy" @click="store.removeFromCart(index)"><Trash2 :size="17" aria-hidden="true"/></IconButton>
     </div>
    </article>
   </div>
   <section class="cart-packages" aria-label="บรรจุภัณฑ์ของออเดอร์">
    <div>
     <strong>บรรจุภัณฑ์</strong>
     <p>{{ packageItems.length ? packageItems.length+' รายการ' : 'ยังไม่มีบรรจุภัณฑ์' }}<span v-if="store.packageAdjustments?.length"> · ปรับแล้ว</span></p>
    </div>
    <Button variant="secondary" size="compact" :disabled="busy" @click="store.modals.packageReview.isOpen=true">ตรวจ/ปรับ Package</Button>
   </section>
   <section v-if="store.cartLotWarnings?.length" class="cart-lot-warnings" aria-label="คำเตือนล็อตวัตถุดิบ"><h4>ล็อตใกล้หมดหรือสต็อกไม่พอ</h4><div v-for="warning in store.cartLotWarnings" :key="warning.material.id"><div><strong>{{ warning.material.name }}</strong><p>{{ warning.shortageQty>0?'ขาดอีก '+warning.shortageQty+' '+warning.material.unit:warning.willDeplete?'สต็อกจะหมด':'ล็อตใกล้หมด' }}</p></div><Button variant="secondary" size="compact" :disabled="busy" @click="$emit('switch-lot',warning)">ดูล็อต</Button></div></section>
  </template>
  <CartDetailsDialog :open="detailsOpen && !!store.cart.length" :model="store" :package-items="packageItems" @close="detailsOpen=false"/>
 </div>
</template>
<script setup>
import {computed,ref,watch} from 'vue'
import {Info,Minus,Plus,Trash2} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import EntityImage from '@/components/images/EntityImage.vue'
import CartDetailsDialog from './CartDetailsDialog.vue'
import {itemPrice} from './cartPrices'

const props=defineProps({busy:Boolean,model:Object})
defineEmits(['switch-lot'])
const store=props.model||usePosStore()
const mascot=`${import.meta.env.BASE_URL}brand/content-mascot.svg`
const packageItems=computed(()=>store.cartPackagePlan.items)
const quantity=computed(()=>store.cart.reduce((n,item)=>n+item.qty,0))
const clearing=ref(false),detailsOpen=ref(false)
watch(()=>store.cart.length,length=>{if(!length)detailsOpen.value=false})

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
.cart-body{display:grid;gap:12px;font-size:.8125rem}
.cart-empty{padding:48px 12px;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;color:var(--text-muted)}.cart-empty img{object-fit:contain;margin-bottom:8px}.cart-empty strong{font-size:.9375rem;color:var(--text-main)}.cart-empty p{font-size:.8125rem;line-height:1.8}
.cart-list-heading,.cart-line-actions{display:flex;align-items:center;justify-content:space-between;gap:8px}
.cart-list-heading{color:var(--text-muted)}.cart-list-tools{display:flex;align-items:center;gap:4px}
.cart-info,.cart-remove,.cart-quantity :deep(.ui-button){width:44px;min-height:44px}
.cart-info{color:var(--accent-brand);background:var(--bg-soft)}
.cart-lines{border-block:1px solid var(--border-subtle)}
.cart-line{display:grid;gap:6px;padding:10px 0;min-width:0}
.cart-line + .cart-line{border-top:1px solid var(--border-subtle)}
.cart-line-title{display:grid;grid-template-columns:48px minmax(0,1fr) auto;align-items:center;gap:10px}
.cart-line-image{width:48px;height:48px;border-radius:10px;background:var(--bg-soft)}
.cart-line-title h4{font-size:.9375rem;font-weight:600;overflow-wrap:anywhere;line-height:1.45}
.cart-line-price{color:var(--accent-brand);font-size:1.125rem;font-weight:650;white-space:nowrap}
.cart-quantity{display:flex;align-items:center;background:var(--bg-soft);border-radius:10px}
.cart-quantity output{min-width:28px;text-align:center;font-weight:600}
.cart-quantity :deep(.ui-button){background:transparent}.cart-remove{color:var(--text-muted)}
.cart-shortage{color:var(--state-warning);font-size:.75rem}
.cart-lot-warnings{background:#FFFBEB;padding:12px;border-radius:12px;color:#92400E}.cart-lot-warnings h4{font-weight:500;margin-bottom:10px}.cart-lot-warnings>div{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px}.cart-lot-warnings p{font-size:.75rem;margin-top:4px}
.cart-packages{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;background:var(--bg-soft);border-radius:10px;min-width:0}
.cart-packages>div{min-width:0}.cart-packages p{font-size:.75rem;color:var(--text-muted);line-height:1.5}
.cart-packages :deep(.ui-button){min-height:44px}
</style>
