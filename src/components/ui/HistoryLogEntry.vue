<template>
  <details data-history-entry class="group border-b border-stone-100 last:border-0">
    <summary tabindex="0" class="history-summary flex cursor-pointer items-start gap-3 px-4 py-3 sm:px-5 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px]">
      <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-base" aria-hidden="true">{{ log.targetEmoji || '•' }}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-stone-900 leading-5 break-words">{{ shortTitle }}<span v-if="!itemMode && log.targetName" class="font-normal text-stone-600"> · {{ log.targetName }}</span></p>
        <p v-if="hasTransition" class="mt-1 text-xs text-stone-500 tabular-nums">{{ number(log.beforeStock) }} → {{ number(log.afterStock) }} {{ log.unit }}</p>
        <p v-else class="mt-1 text-xs text-stone-500 line-clamp-1">{{ log.description || log.note || 'ดูรายละเอียด' }}</p>
      </div>
      <div class="shrink-0 text-right">
        <p v-if="hasDelta" class="text-sm font-semibold tabular-nums" :class="Number(log.delta) > 0 ? 'text-emerald-700' : 'text-rose-700'">{{ Number(log.delta) > 0 ? '+' : '' }}{{ number(log.delta) }} <span class="text-xs font-normal">{{ log.unit }}</span></p>
        <time :datetime="log.timestamp" class="block mt-1 text-xs tabular-nums text-stone-400">{{ time || 'ไม่ระบุเวลา' }}</time>
      </div>
      <ChevronDown class="mt-1 h-4 w-4 shrink-0 text-stone-400 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
    </summary>
    <div class="px-4 pb-4 sm:pl-16 sm:pr-5 text-xs leading-6 text-stone-600 space-y-2 break-words">
      <p v-if="log.description" class="whitespace-pre-wrap">{{ log.description }}</p>
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <template v-if="log.title && log.title !== shortTitle"><dt class="text-stone-400">กิจกรรม</dt><dd>{{ log.title }}</dd></template>
        <template v-if="log.reason"><dt class="text-stone-400">เหตุผล</dt><dd>{{ log.reason }}</dd></template>
        <template v-if="log.note && log.note !== log.description"><dt class="text-stone-400">หมายเหตุ</dt><dd class="whitespace-pre-wrap">{{ log.note }}</dd></template>
        <template v-if="log.receiveDate"><dt class="text-stone-400">วันที่รับ</dt><dd>{{ formatThaiDate(log.receiveDate) }}</dd></template>
        <template v-if="log.expiryDate"><dt class="text-stone-400">หมดอายุ</dt><dd>{{ formatThaiDate(log.expiryDate) }}</dd></template>
        <template v-if="log.cost != null"><dt class="text-stone-400">ต้นทุนที่บันทึก</dt><dd>฿{{ number(log.cost) }}</dd></template>
        <template v-if="log.user"><dt class="text-stone-400">ผู้บันทึก</dt><dd>{{ log.user }}</dd></template>
      </dl>
    </div>
  </details>
</template>
<script setup>
import {computed} from 'vue'
import {ChevronDown} from 'lucide-vue-next'
import {formatThaiDate} from '@/stores/posStore'
const props=defineProps({log:{type:Object,required:true},itemMode:Boolean})
const labels={stock_in:'รับเข้า',adjust:'ตรวจนับ',stock_adjust_add:'ปรับเพิ่ม',stock_adjust_reduce:'ปรับลด',produce:'ผลิต',produce_batch:'ผลิต',produce_deduct:'ตัดวัตถุดิบผลิต',sale_deduct:'ตัดขาย',order_complete:'ขาย',waste:'ของเสีย',switch_lot:'สลับล็อต',create:'เพิ่มรายการ',edit:'แก้ไข',delete:'ลบรายการ',sync:'ซิงค์ข้อมูล'}
const shortTitle=computed(()=>labels[props.log.action] || props.log.title || 'กิจกรรม')
const number=value=>Number(value).toLocaleString('th-TH',{maximumFractionDigits:4})
const valid=value=>value != null && value !== '' && Number.isFinite(Number(value))
const hasTransition=computed(()=>valid(props.log.beforeStock)&&valid(props.log.afterStock))
const hasDelta=computed(()=>valid(props.log.delta)&&Number(props.log.delta)!==0)
const time=computed(()=>{
 if(!props.log.timestamp || !Number.isFinite(Date.parse(props.log.timestamp)))return ''
 return new Date(props.log.timestamp).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'})
})
</script>
<style scoped>
.history-summary { list-style: none; }
.history-summary::-webkit-details-marker { display: none; }
</style>
