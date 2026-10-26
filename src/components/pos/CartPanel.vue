<template>
 <section v-if="presentation==='panel'" class="cart-panel" aria-label="ตะกร้า">
  <header><div><h3>ออเดอร์นี้</h3><span>{{ store.currentPlatform?.name }}</span></div><ShoppingBag :size="22" aria-hidden="true"/></header>
  <div class="cart-panel-scroll"><CartBody :model="model" :busy="checkoutPending||disabled" @switch-lot="$emit('switch-lot',$event)"/><slot name="review"/></div>
  <footer v-if="store.cart.length"><CartPaymentFooter :model="model" :busy="checkoutPending" @checkout="$emit('checkout')"/></footer>
 </section>
 <DialogFrame v-else :open="open" id="pos-cart-review" title="ตรวจออเดอร์" :description="store.currentPlatform?.name" presentation="sheet" :busy="checkoutPending" @request-close="$emit('request-close')">
  <CartBody :model="model" :busy="checkoutPending||disabled" @switch-lot="$emit('switch-lot',$event)"/><slot name="review"/>
  <template v-if="store.cart.length" #footer><CartPaymentFooter :model="model" :busy="checkoutPending" @checkout="$emit('checkout')"/></template>
 </DialogFrame>
</template>
<script setup>
import {usePosStore} from '@/stores/posStore'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import CartBody from './CartBody.vue'
import CartPaymentFooter from './CartPaymentFooter.vue'
import {ShoppingBag} from 'lucide-vue-next'
const props=defineProps({model:Object,disabled:Boolean,presentation:{type:String,default:'panel'},open:Boolean,checkoutPending:Boolean})
defineEmits(['checkout','switch-lot','request-close'])
const store=props.model||usePosStore()
</script>
<style scoped>
.cart-panel{display:flex;flex-direction:column;flex-shrink:0;width:clamp(320px,30%,380px);min-height:0;overflow:hidden;background:var(--bg-card);border:0;border-radius:20px}
.cart-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 20px 12px;flex-shrink:0}.cart-panel h3{font-size:1.125rem;font-weight:600}.cart-panel>header span{display:block;font-size:.75rem;color:var(--text-muted);margin-top:4px}.cart-panel>header svg{color:var(--accent-brand)}
.cart-panel-scroll{overflow-y:auto;min-height:0;flex:1;padding:16px 20px;overscroll-behavior:contain}.cart-panel>footer{padding:18px 20px;background:var(--bg-soft);flex-shrink:0}
</style>
