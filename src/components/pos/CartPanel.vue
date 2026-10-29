<template>
 <section v-if="presentation==='panel'||(presentation==='page'&&open)" :id="presentation==='page'?'pos-cart-review':undefined" :data-cart-page="presentation==='page'?'':undefined" class="cart-panel" :class="{'cart-panel--page':presentation==='page'}" aria-label="ตะกร้า" tabindex="-1">
  <header><Button v-if="presentation==='page'" data-cart-back variant="quiet" :disabled="checkoutPending" @click="$emit('request-close')"><ArrowLeft :size="20" aria-hidden="true"/>เลือกสินค้า</Button><div><h3>{{ presentation==='page'?'ตะกร้าสินค้า':'ออเดอร์นี้' }}</h3><span>{{ store.currentPlatform?.name }}</span></div><ShoppingBag :size="22" aria-hidden="true"/></header>
  <div class="cart-panel-scroll"><CartBody :model="model" :busy="checkoutPending||disabled" @switch-lot="$emit('switch-lot',$event)"/><slot name="review"/></div>
  <footer v-if="store.cart.length"><CartPaymentFooter :model="model" :busy="checkoutPending" @checkout="$emit('checkout')"/></footer>
 </section>
 <DialogFrame v-else-if="presentation!=='page'" :open="open" id="pos-cart-review" title="ตรวจออเดอร์" :description="store.currentPlatform?.name" presentation="sheet" :busy="checkoutPending" @request-close="$emit('request-close')">
  <CartBody :model="model" :busy="checkoutPending||disabled" @switch-lot="$emit('switch-lot',$event)"/><slot name="review"/>
  <template v-if="store.cart.length" #footer><CartPaymentFooter :model="model" :busy="checkoutPending" @checkout="$emit('checkout')"/></template>
 </DialogFrame>
</template>
<script setup>
import {usePosStore} from '@/stores/posStore'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import CartBody from './CartBody.vue'
import CartPaymentFooter from './CartPaymentFooter.vue'
import {ShoppingBag,ArrowLeft} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
const props=defineProps({model:Object,disabled:Boolean,presentation:{type:String,default:'panel'},open:Boolean,checkoutPending:Boolean})
defineEmits(['checkout','switch-lot','request-close'])
const store=props.model||usePosStore()
</script>
<style scoped>
.cart-panel{display:flex;flex-direction:column;flex-shrink:0;width:clamp(320px,30%,380px);min-height:0;overflow:hidden;background:var(--bg-card);border:0;border-radius:20px}
.cart-panel>header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:22px 20px 12px;flex-shrink:0}.cart-panel h3{font-size:1.125rem;font-weight:600}.cart-panel>header span{display:block;font-size:.75rem;color:var(--text-muted);margin-top:4px}.cart-panel>header svg{color:var(--accent-brand)}
.cart-panel-scroll{overflow-y:auto;min-height:0;flex:1;padding:16px 20px;overscroll-behavior:contain}.cart-panel>footer{padding:18px 20px;background:var(--bg-soft);flex-shrink:0}
</style>
<style scoped>
.cart-panel--page{width:100%;height:var(--pos-workspace-height,calc(100dvh - var(--sidebar-header-height,var(--panel-header-height)) - 32px));min-height:320px}.cart-panel--page>header{padding:16px;gap:12px;flex-wrap:wrap}.cart-panel--page>header>div{flex:1;min-width:0}.cart-panel--page>header span{overflow-wrap:anywhere}.cart-panel--page .cart-panel-scroll{padding:12px 16px}.cart-panel--page>footer{padding:12px 16px max(12px,env(safe-area-inset-bottom))}.cart-panel--page:focus{outline:none}
@media(max-width:359px){.cart-panel--page>header>svg{display:none}.cart-panel--page h3{font-size:1rem}}
</style>
