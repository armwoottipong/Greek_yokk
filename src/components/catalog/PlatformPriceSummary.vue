<template>
 <div class="platform-price-summary" :class="{'platform-price-summary--all':all}">
  <p v-if="!platforms.length" class="price-unset">ไม่มีช่องทางขาย</p>
  <component :is="selectable?'button':'div'" v-for="platform in platforms" :key="platform.id" :type="selectable?'button':undefined" :aria-pressed="selectable?platform.id===selectedId:undefined" class="platform-price" :class="{'platform-price--selected':platform.id===selectedId}" :data-platform-price="platform.id" @click="selectable && $emit('select',platform.id)"><span>{{ platform.name }}</span><strong v-if="hasPrice(platform.id)">฿{{ Number(prices[platform.id]).toLocaleString('th-TH',{maximumFractionDigits:2}) }}</strong><small v-else class="price-unset">ยังไม่กำหนดราคา</small></component>
 </div>
</template>
<script setup>
const props=defineProps({all:Boolean,selectable:Boolean,prices:{type:Object,default:()=>({})},platforms:{type:Array,default:()=>[]},selectedId:String})
defineEmits(['select'])
const hasPrice=id=>props.prices[id]!==undefined&&props.prices[id]!==null&&props.prices[id]!==''&&Number.isFinite(Number(props.prices[id]))
</script>
<style scoped>
.platform-price-summary{display:flex;flex-wrap:wrap;gap:8px}.platform-price{display:flex;align-items:center;gap:8px;padding:6px 9px;border-radius:8px;background:var(--bg-soft);font-size:12px}.platform-price span,.price-unset{color:var(--text-muted)}.platform-price strong{font-variant-numeric:tabular-nums;font-weight:600}.platform-price--selected{background:var(--accent-soft);color:var(--accent-brand)}
.platform-price-summary:has(button){display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.platform-price[type=button]{min-width:0;min-height:48px;flex-wrap:wrap;justify-content:space-between;border:0;padding:10px 12px;cursor:pointer;text-align:left}.platform-price[type=button] span{overflow-wrap:anywhere}.platform-price[type=button]:hover{background:var(--accent-soft)}.platform-price[type=button][aria-pressed=true]{background:var(--accent-brand);color:var(--bg-card)}.platform-price[type=button][aria-pressed=true] span,.platform-price[type=button][aria-pressed=true] .price-unset{color:inherit}.platform-price[type=button]:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
@media(max-width:1199px){.platform-price-summary:not(.platform-price-summary--all) .platform-price:not(.platform-price--selected){display:none}.platform-price--selected{padding:8px 0;background:transparent;font-size:14px}.platform-price--selected strong{font-size:18px}}
</style>
