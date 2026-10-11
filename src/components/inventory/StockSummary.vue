<template>
  <dl class="stock-summary">
    <div><dt>มูลค่าคลังรวม</dt><dd>฿{{ money(valuation) }}</dd><p v-if="draftDiff">หลังยืนยันร่าง ≈ ฿{{ money(projected) }}</p><p v-else>ตามสต็อกที่บันทึกแล้ว</p></div>
    <div><dt>งบเติมสต็อกแนะนำ</dt><dd>฿{{ money(budget) }}</dd><p>เติมถึง 2 เท่าของขั้นต่ำ</p></div>
    <div><dt>ใกล้หมด</dt><dd>{{ lowCount }} <small>รายการ</small></dd><p>ควรสั่งซื้อเพิ่ม</p></div>
    <div><dt>หมดสต็อก</dt><dd>{{ outCount }} <small>รายการ</small></dd><p>ตรวจสอบก่อนรับออเดอร์</p></div>
  </dl>
</template>
<script setup>
defineProps({valuation:Number,draftDiff:Number,projected:Number,budget:Number,lowCount:Number,outCount:Number})
const money=value=>Number(value||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})
</script>
<style scoped>
.stock-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;padding:20px;background:var(--bg-card);border-radius:var(--surface-radius);border:1px solid transparent}
.stock-summary>div{min-width:0}.stock-summary dt,.stock-summary p{font-size:12px;color:var(--text-muted);line-height:1.5}.stock-summary dd{font-size:22px;font-weight:700;color:var(--accent-brand);font-variant-numeric:tabular-nums;overflow-wrap:anywhere;margin:5px 0}.stock-summary small{font-size:12px;font-weight:400;color:var(--text-muted)}
@media(max-width:1023px){.stock-summary{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;padding:16px}.stock-summary dd{font-size:20px}}
</style>

