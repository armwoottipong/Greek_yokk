<template>
 <button v-if="active&&activated" ref="button" type="button" data-cart-open class="cart-launcher" :disabled="busy" :aria-label="`เปิดรถเข็น ${quantity} รายการ`" :aria-expanded="open" aria-controls="pos-cart-review" @click="$emit('open')">
  <ShoppingCart :size="27" aria-hidden="true"/>
  <span v-if="quantity" class="cart-launcher-count" aria-hidden="true">{{ quantity>99?'99+':quantity }}</span>
  <span class="sr-only" role="status" aria-live="polite">รถเข็น {{ quantity }} รายการ</span>
 </button>
</template>
<script setup>
import {ref,watch,onActivated,onDeactivated} from 'vue'
import {ShoppingCart} from 'lucide-vue-next'
import {useCartMotion} from '@/composables/useCartMotion'
const props=defineProps({quantity:{type:Number,default:0},open:Boolean,busy:Boolean,active:{type:Boolean,default:true}})
defineEmits(['open'])
const button=ref(null),activated=ref(true),motion=useCartMotion(button)
watch(()=>props.quantity,(quantity,previous)=>{if(quantity>previous&&!props.open&&props.active&&activated.value)motion.fly()},{flush:'post'})
watch(()=>props.active,value=>{if(!value)motion.cancel()})
onActivated(()=>{activated.value=true});onDeactivated(()=>{activated.value=false})
defineExpose({capture:motion.capture,element:button})
</script>
<style scoped>
.cart-launcher{position:fixed;right:24px;bottom:max(24px,env(safe-area-inset-bottom));z-index:45;display:grid;place-items:center;width:60px;height:60px;border:0;border-radius:22px;background:var(--accent-brand);color:var(--bg-card);box-shadow:0 8px 24px #58040624;cursor:pointer;touch-action:manipulation}.cart-launcher:disabled{opacity:.6;cursor:wait}.cart-launcher:focus-visible{filter:brightness(.78)}.cart-launcher-count{position:absolute;top:-6px;right:-6px;display:grid;place-items:center;min-width:26px;height:26px;padding-inline:5px;border-radius:50%;background:var(--bg-card);color:var(--accent-brand);border:2px solid var(--accent-brand);font-size:.75rem;font-weight:600;font-variant-numeric:tabular-nums}
@media(hover:hover){.cart-launcher:hover{filter:brightness(.9)}}
@media(max-width:767px){.cart-launcher{right:16px;bottom:max(16px,env(safe-area-inset-bottom));width:56px;height:56px;border-radius:20px}}
@media(min-width:768px){:global(body:has(.cart-launcher) .ui-toasts){bottom:96px}}
</style>
