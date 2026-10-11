<template>
 <div class="platform-price-summary">
  <p v-if="!platforms.length" class="price-unset">ไม่มีช่องทางขาย</p>
  <div v-for="platform in platforms" :key="platform.id" class="platform-price" :class="{'platform-price--selected':platform.id===selectedId}" :data-platform-price="platform.id"><span>{{ platform.name }}</span><strong v-if="hasPrice(platform.id)">฿{{ Number(prices[platform.id]).toLocaleString('th-TH',{maximumFractionDigits:2}) }}</strong><small v-else class="price-unset">ยังไม่กำหนดราคา</small></div>
 </div>
</template>
<script setup>
const props=defineProps({prices:{type:Object,default:()=>({})},platforms:{type:Array,default:()=>[]},selectedId:String})
const hasPrice=id=>props.prices[id]!==undefined&&props.prices[id]!==null&&props.prices[id]!==''&&Number.isFinite(Number(props.prices[id]))
</script>
<style scoped>
.platform-price-summary{display:flex;flex-wrap:wrap;gap:8px}.platform-price{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:var(--bg-soft);font-size:12px}.platform-price span,.price-unset{color:var(--text-muted)}.platform-price strong{font-variant-numeric:tabular-nums;font-weight:600}.platform-price--selected{background:var(--accent-soft);color:var(--accent-brand)}
@media(max-width:1199px){.platform-price:not(.platform-price--selected){display:none}.platform-price--selected{padding:8px 0;background:transparent;font-size:14px}.platform-price--selected strong{font-size:18px}}
</style>
