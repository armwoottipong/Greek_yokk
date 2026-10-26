<template>
 <div v-if="store.cart.length" class="cart-payment-footer">
  <fieldset v-if="!model?.cloud"><legend>วิธีชำระเงิน</legend><AppChoiceGroup v-model="store.paymentMethod" class="cart-payment-methods" aria-label="วิธีชำระเงิน" :options="methods" variant="cards" :disabled="busy"/></fieldset>
  <div class="cart-payment-total"><span>ยอดชำระ</span><strong class="font-number">฿{{ money(store.cartSummary.subtotal) }}</strong></div>
  <dl class="cart-gp-summary" aria-label="ค่าธรรมเนียมออเดอร์"><div data-order-gp><dt>หัก GP ({{ store.cartSummary.gpPercent }}%)</dt><dd>−฿{{ feeMoney(store.cartSummary.gpAmount) }}</dd></div><div data-order-net><dt>ร้านได้รับหลังหัก GP</dt><dd>฿{{ feeMoney(store.cartSummary.netRevenue) }}</dd></div></dl>
  <Button data-checkout class="cart-checkout" :loading="busy" :disabled="!store.cart.length||store.checkoutDisabled" @click="$emit('checkout')"><Check :size="18" aria-hidden="true"/>ชำระเงินและตัดสต็อก</Button>
 </div>
</template>
<script setup>
import {Check} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {money} from '@/domain/dashboard'
import Button from '@/components/ui/Button.vue'
import AppChoiceGroup from '@/components/ui/AppChoiceGroup.vue'
const props=defineProps({busy:Boolean,model:Object})
defineEmits(['checkout'])
const store=props.model||usePosStore()
const feeMoney=value=>Number(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
const methods=[{value:'QR PromptPay',label:'QR',description:'PromptPay'},{value:'เงินสด',label:'เงินสด',description:'Cash'},{value:'Platform Delivery',label:'Platform',description:'Delivery'}]
</script>
<style scoped>
.cart-payment-footer{display:grid;gap:16px;width:100%}.cart-payment-footer legend{font-size:.8125rem;color:var(--text-main);font-weight:500;margin-bottom:10px}.cart-payment-total{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:.875rem}.cart-payment-total strong{font-size:1.625rem;color:var(--accent-brand)}.cart-checkout{width:100%;min-height:52px;font-size:.875rem;border-radius:12px}
.cart-gp-summary{display:grid;gap:8px;font-size:.75rem;line-height:1.6;color:var(--text-muted)}.cart-gp-summary>div{display:flex;justify-content:space-between;gap:12px}.cart-gp-summary dd{flex-shrink:0;font-variant-numeric:tabular-nums}.cart-gp-summary>div:last-child{color:var(--text-main)}
</style>

