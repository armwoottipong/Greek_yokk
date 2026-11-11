<template>
 <div v-if="rows===null || rows.length" class="order-ingredients" role="group" :aria-label="label">
  <p>{{ label }}</p>
  <p v-if="rows===null">ดูปริมาณจากสูตรนี้ไม่ได้</p>
  <ul v-else>
   <li v-for="row in rows" :key="row.materialId">
    <span>{{ row.name }}</span>
    <span>{{ money(row.qty) }} {{ row.unit }}<small v-if="row.total!=null">รวม {{ money(row.total) }} {{ row.unit }}</small></span>
   </li>
  </ul>
 </div>
</template>

<script setup>
import { money } from '@/domain/dashboard'
defineProps({rows:{type:Array,default:()=>[]},label:{type:String,default:'วัตถุดิบต่อชาม'}})
</script>

<style scoped>
.order-ingredients{display:grid;gap:4px;padding:6px 9px;border-radius:8px;background:var(--bg-soft);font-size:.8125rem;color:var(--text-main)}
.order-ingredients p,.order-ingredients small{font-size:.75rem;color:var(--text-muted)}
.order-ingredients ul{display:grid;gap:4px}
.order-ingredients li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;overflow-wrap:anywhere}
.order-ingredients li>span:last-child{text-align:end;font-variant-numeric:tabular-nums}
.order-ingredients small{display:block}
</style>
