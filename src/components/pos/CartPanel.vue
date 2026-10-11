<template>
 <section v-if="presentation==='panel'" class="cart-panel" aria-label="ตะกร้า">
  <header><h3>ตะกร้า</h3><span>{{ store.currentPlatform?.name }}</span></header>
  <div class="cart-panel-scroll"><CartBody :busy="checkoutPending" @switch-lot="$emit('switch-lot',$event)"/></div>
  <footer v-if="store.cart.length"><CartPaymentFooter :busy="checkoutPending" @checkout="$emit('checkout')"/></footer>
 </section>
 <DialogFrame v-else :open="open" id="pos-cart-review" title="ตะกร้า" :description="store.currentPlatform?.name" presentation="sheet" :busy="checkoutPending" @request-close="$emit('request-close')">
  <CartBody :busy="checkoutPending" @switch-lot="$emit('switch-lot',$event)"/>
  <template v-if="store.cart.length" #footer><CartPaymentFooter :busy="checkoutPending" @checkout="$emit('checkout')"/></template>
 </DialogFrame>
</template>
<script setup>
import {usePosStore} from '@/stores/posStore'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import CartBody from './CartBody.vue'
import CartPaymentFooter from './CartPaymentFooter.vue'
defineProps({presentation:{type:String,default:'panel'},open:Boolean,checkoutPending:Boolean})
defineEmits(['checkout','switch-lot','request-close'])
const store=usePosStore()
</script>
<style scoped>
.cart-panel{display:flex;flex-direction:column;flex-shrink:0;width:320px;min-height:0;overflow:hidden;background:var(--bg-card);border:1px solid transparent;border-radius:16px}
.cart-panel>header{padding:16px;border-bottom:1px solid transparent;flex-shrink:0}.cart-panel h3{font-size:1rem;font-weight:600}.cart-panel>header span{display:block;font-size:.75rem;color:var(--text-muted);margin-top:4px}
.cart-panel-scroll{overflow-y:auto;min-height:0;flex:1;padding:16px;overscroll-behavior:contain}.cart-panel>footer{padding:16px;border-top:1px solid transparent;background:var(--bg-soft);flex-shrink:0}
</style>
