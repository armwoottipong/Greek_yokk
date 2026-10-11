<template>
 <div v-if="store.cart.length" class="cart-payment-footer">
  <fieldset><legend>วิธีชำระเงิน</legend><div class="cart-payment-methods"><Button v-for="method in methods" :key="method" :variant="store.paymentMethod===method?'primary':'secondary'" size="compact" :aria-pressed="store.paymentMethod===method" :disabled="busy" @click="store.paymentMethod=method">{{ method }}</Button></div></fieldset>
  <div class="cart-payment-total"><span>ยอดชำระ</span><strong class="font-number">฿{{ money(store.cartSummary.subtotal) }}</strong></div>
  <Button class="cart-checkout" :loading="busy" :disabled="!store.cart.length" @click="$emit('checkout')"><Check :size="18" aria-hidden="true"/>ชำระเงินและตัดสต็อก</Button>
 </div>
</template>
<script setup>
import {Check} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
defineProps({busy:Boolean})
defineEmits(['checkout'])
const store=usePosStore()
const methods=['QR PromptPay','เงินสด','Platform Delivery']
</script>
<style scoped>
.cart-payment-footer{display:grid;gap:12px;width:100%}.cart-payment-footer legend{font-size:.75rem;color:var(--text-muted);margin-bottom:8px}.cart-payment-methods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.cart-payment-methods>.ui-button{min-width:0;padding:8px 4px;font-size:.8125rem}.cart-payment-total{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.8125rem}.cart-payment-total strong{font-size:1.25rem;color:var(--accent-brand)}.cart-checkout{width:100%}
</style>

