<template>
 <section aria-label="ล็อตวัตถุดิบ" class="lot-section">
  <h4>ล็อตในคลัง</h4>
  <p v-if="trackingMode==='none'" class="lot-help">รายการนี้ไม่ติดตามวันที่</p>
  <p v-if="!lots.length" class="lot-help">ยังไม่มีล็อตในคลัง</p>
  <article v-for="(lot,index) in lots" :key="lot.id" class="lot-card">
   <div class="lot-heading"><strong>ล็อตที่ {{ index+1 }}</strong><StatusBadge :label="lot.isInUse?'กำลังใช้':'ล็อตสำรอง'" :tone="lot.isInUse?'success':'neutral'" /></div>
   <p class="lot-quantity">{{ Number(lot.qty||0).toLocaleString('th-TH') }} {{ unit }}</p>
   <p class="lot-value">มูลค่าคงเหลือ ฿{{ (Math.max(0,Number(lot.qty)||0)*Number(lot.unitCost||fallbackUnitCost||0)).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2}) }}</p>
   <p class="lot-id">รหัสอ้างอิง {{ lot.id }}</p>
   <dl v-if="trackingMode!=='none'" class="lot-dates"><div><dt>{{ originLabel }}</dt><dd>{{ lot.receiveDate?formatDisplayDate(lot.receiveDate):'ไม่ระบุวันที่' }}</dd></div><div v-if="trackingMode!=='receive_only'"><dt>หมดอายุ</dt><dd>{{ lot.expiryDate?formatDisplayDate(lot.expiryDate):'ไม่ระบุวันที่' }}</dd></div></dl>
   <StatusBadge v-if="trackingMode!=='none' && lot.expiryDate && isExpired({expiryDate:lot.expiryDate})" label="หมดอายุแล้ว" tone="error" />
   <div v-if="!archived" class="lot-actions">
    <Button :disabled="busy" variant="secondary" :data-lot-adjust="lot.id" :aria-label="`ปรับยอดล็อต ${lot.id}`" @click="$emit('adjust',lot.id)">ปรับยอด</Button>
    <Button :disabled="busy" variant="quiet" :aria-label="`บันทึกของเสียล็อต ${lot.id}`" @click="$emit('waste',lot.id)">บันทึกของเสีย</Button>
    <Button :disabled="busy" v-if="!lot.isInUse && lot.qty>0" variant="quiet" :aria-label="`เลือกใช้ล็อต ${lot.id}`" @click="$emit('switch',lot.id)">เลือกใช้ล็อตนี้</Button>
    <Button :disabled="busy" variant="danger" :data-lot-remove="lot.id" @click="$emit('remove',lot.id)">ลบล็อต</Button>
   </div>
  </article>
 </section>
</template>
<script setup>
import {formatDisplayDate,isExpired} from '@/stores/posStore'
import Button from '../ui/Button.vue'
import StatusBadge from '../ui/StatusBadge.vue'
defineProps({busy:Boolean,lots:{type:Array,default:()=>[]},trackingMode:String,unit:String,fallbackUnitCost:{type:Number,default:0},archived:Boolean,originLabel:{type:String,default:'วันรับเข้า'}})
defineEmits(['adjust','waste','switch','remove'])
</script>
<style scoped>
.lot-section h4{font-weight:600;margin:20px 0 12px}.lot-card{padding:16px;background:var(--bg-soft);border-radius:var(--surface-radius);margin:10px 0}.lot-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.lot-heading strong{font-size:12px;overflow-wrap:anywhere;min-width:0}.lot-quantity{font-size:18px;font-weight:600;margin:10px 0;font-variant-numeric:tabular-nums}.lot-dates{display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px}.lot-dates dt,.lot-help{color:var(--text-muted)}.lot-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}
.lot-value{font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums;margin:-4px 0 12px}
.lot-id{font-size:11px;color:var(--text-muted);overflow-wrap:anywhere;margin:-6px 0 12px}
</style>
