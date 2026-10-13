<template>
 <div v-if="store.cart.length" class="cart-payment-footer">
  <fieldset><legend>วิธีชำระเงิน</legend><div class="cart-payment-methods"><Button v-for="method in methods" :key="method" variant="secondary" :class="{'is-selected':store.paymentMethod===method}" size="compact" :aria-pressed="store.paymentMethod===method" :disabled="busy" @click="store.paymentMethod=method"><Check v-if="store.paymentMethod===method" :size="14" aria-hidden="true"/><span>{{ method }}</span></Button></div></fieldset>
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
.cart-payment-footer{display:grid;gap:16px;width:100%}.cart-payment-footer legend{font-size:.8125rem;color:var(--text-main);font-weight:500;margin-bottom:10px}.cart-payment-methods{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.cart-payment-methods>.ui-button{min-width:0;min-height:48px;padding:8px 6px;font-size:.75rem;background:transparent;gap:4px;flex-wrap:wrap;align-content:center}.cart-payment-methods>.is-selected{background:var(--bg-card);color:var(--accent-brand);font-weight:600}.cart-payment-total{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.875rem}.cart-payment-total strong{font-size:1.625rem;color:var(--accent-brand)}.cart-checkout{width:100%;min-height:52px;font-size:.875rem;border-radius:12px}
</style>

