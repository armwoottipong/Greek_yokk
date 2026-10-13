<template>
 <div v-if="store.cart.length" class="cart-payment-footer">
  <fieldset><legend>วิธีชำระเงิน</legend><AppChoiceGroup v-model="store.paymentMethod" class="cart-payment-methods" aria-label="วิธีชำระเงิน" :options="methods" variant="cards" :disabled="busy"/></fieldset>
  <div class="cart-payment-total"><span>ยอดชำระ</span><strong class="font-number">฿{{ money(store.cartSummary.subtotal) }}</strong></div>
  <Button class="cart-checkout" :loading="busy" :disabled="!store.cart.length" @click="$emit('checkout')"><Check :size="18" aria-hidden="true"/>ชำระเงินและตัดสต็อก</Button>
 </div>
</template>
<script setup>
import {Check} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
import AppChoiceGroup from '@/components/ui/AppChoiceGroup.vue'
defineProps({busy:Boolean})
defineEmits(['checkout'])
const store=usePosStore()
const methods=[{value:'QR PromptPay',label:'QR',description:'PromptPay'},{value:'เงินสด',label:'เงินสด',description:'Cash'},{value:'Platform Delivery',label:'Platform',description:'Delivery'}]
</script>
<style scoped>
.cart-payment-footer{display:grid;gap:16px;width:100%}.cart-payment-footer legend{font-size:.8125rem;color:var(--text-main);font-weight:500;margin-bottom:10px}.cart-payment-total{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.875rem}.cart-payment-total strong{font-size:1.625rem;color:var(--accent-brand)}.cart-checkout{width:100%;min-height:52px;font-size:.875rem;border-radius:12px}
</style>

