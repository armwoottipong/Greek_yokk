<template><button type="button" data-cart-open class="cart-review-bar" aria-haspopup="dialog" aria-controls="pos-cart-review" :aria-expanded="open" @click="$emit('open')"><span><ShoppingBag :size="21" aria-hidden="true"/><strong>{{ quantity?quantity+' ชาม':'ตะกร้าว่าง' }}</strong></span><span><b class="font-number">฿{{ money(subtotal) }}</b><span>ดูตะกร้า</span><ChevronUp :size="17" aria-hidden="true"/></span></button></template>
<script setup>
import {ShoppingBag,ChevronUp} from 'lucide-vue-next'
import {money} from '@/domain/dashboard'
defineProps({quantity:{type:Number,default:0},subtotal:{type:Number,default:0},open:Boolean})
defineEmits(['open'])
</script>
<style scoped>
.cart-review-bar{position:fixed;left:calc(var(--navigation-width,0px) + 16px);right:16px;bottom:max(16px,env(safe-area-inset-bottom));display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:60px;padding:14px 16px;border:0;border-radius:16px;background:var(--accent-brand);color:var(--bg-card);z-index:30;box-shadow:0 6px 18px #58040620;cursor:pointer;font-size:.8125rem}.cart-review-bar>span{display:flex;align-items:center;gap:10px}.cart-review-bar b{font-size:1rem}.cart-review-bar strong{font-weight:500}.cart-review-bar:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px}
</style>

