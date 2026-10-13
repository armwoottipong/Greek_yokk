<template>
 <section aria-label="ล็อตวัตถุดิบ" class="lot-section">
  <h4>ล็อตในคลัง</h4>
  <p v-if="trackingMode==='none'" class="lot-help">รายการนี้ไม่ติดตามวันที่</p>
  <p v-if="!lots.length" class="lot-help">ยังไม่มีล็อตในคลัง</p>
  <article v-for="lot in lots" :key="lot.id" class="lot-card">
   <div class="lot-heading"><strong>{{ lot.id }}</strong><StatusBadge :label="lot.isInUse?'กำลังใช้':'ล็อตสำรอง'" :tone="lot.isInUse?'success':'neutral'" /></div>
   <p class="lot-quantity">{{ Number(lot.qty||0).toLocaleString('th-TH') }} {{ unit }}</p>
   <dl v-if="trackingMode!=='none'" class="lot-dates"><div><dt>{{ originLabel }}</dt><dd>{{ lot.receiveDate?formatDisplayDate(lot.receiveDate):'ไม่ระบุวันที่' }}</dd></div><div v-if="trackingMode!=='receive_only'"><dt>หมดอายุ</dt><dd>{{ lot.expiryDate?formatDisplayDate(lot.expiryDate):'ไม่ระบุวันที่' }}</dd></div></dl>
   <StatusBadge v-if="trackingMode!=='none' && lot.expiryDate && isExpired({expiryDate:lot.expiryDate})" label="หมดอายุแล้ว" tone="error" />
   <div v-if="!archived" class="lot-actions">
    <Button variant="secondary" :data-lot-adjust="lot.id" :aria-label="`ปรับยอดล็อต ${lot.id}`" @click="$emit('adjust',lot.id)">ปรับยอด</Button>
    <Button variant="quiet" :aria-label="`บันทึกของเสียล็อต ${lot.id}`" @click="$emit('waste',lot.id)">บันทึกของเสีย</Button>
    <Button v-if="!lot.isInUse && lot.qty>0" variant="quiet" :aria-label="`เลือกใช้ล็อต ${lot.id}`" @click="$emit('switch',lot.id)">เลือกใช้ล็อตนี้</Button>
   </div>
  </article>
 </section>
</template>
<script setup>
import {formatDisplayDate,isExpired} from '@/stores/posStore'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
defineProps({lots:{type:Array,default:()=>[]},trackingMode:String,unit:String,archived:Boolean,originLabel:{type:String,default:'วันรับเข้า'}})
defineEmits(['adjust','waste','switch'])
</script>
<style scoped>
.lot-section h4{font-weight:600;margin:20px 0 12px}.lot-card{padding:16px;background:var(--bg-soft);border-radius:var(--surface-radius);margin:10px 0}.lot-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.lot-heading strong{font-size:12px;overflow-wrap:anywhere;min-width:0}.lot-quantity{font-size:18px;font-weight:600;margin:10px 0;font-variant-numeric:tabular-nums}.lot-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px}.lot-dates dt,.lot-help{color:var(--text-muted)}.lot-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
</style>
