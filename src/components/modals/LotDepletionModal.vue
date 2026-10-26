<template>
 <DialogFrame :open="modal.isOpen" id="LotDepletionModal" title="เปลี่ยนล็อตวัตถุดิบ" :teleport="false" initial-focus="[data-decision-cancel]" @request-close="onCancel">
  <template #header><div class="flex items-start gap-3.5">
        <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
          <AlertTriangle :size="22" aria-hidden="true"/>
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="flex items-center gap-2">
            <h3 id="LotDepletionModal-title" class="text-sm font-bold text-stone-900 leading-snug">
              {{ modal.isLow && !modal.willDeplete ? 'แจ้งเตือน: ล็อตปัจจุบันใกล้หมด' : 'แจ้งเตือน: ล็อตปัจจุบันหมดสต็อก' }}
            </h3>
            <span
              class="px-1.5 py-0.5 rounded text-[10px] font-bold"
              :class="modal.willDeplete ? 'bg-rose-100 text-rose-900 border border-rose-300' : 'bg-amber-100 text-amber-900 border border-amber-300'"
            >
              {{ modal.actionContext === 'pos' ? 'ออเดอร์หน้าร้าน' : modal.actionContext === 'adjust' ? 'ตรวจนับสต็อก' : 'ผลิตตามสูตร' }}
            </span>
          </div>
          <p class="text-xs text-stone-500 mt-1 leading-relaxed">
            สต็อกในล็อตที่กำลังใช้งานของ <span class="font-bold text-stone-800">{{ modal.materialEmoji }} {{ modal.materialName }}</span> {{ modal.willDeplete ? 'หมดลงหรือไม่พอต่อจำนวนที่ต้องการ' : 'ใกล้จะหมดลงหลังจากการดำเนินการนี้' }}
          </p>
        </div>
      </div></template>
  <div class="space-y-2.5">
        <!-- 1. Depleted Current Lot -->
        <div class="lot-comparison lot-comparison--current">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-rose-800 flex items-center gap-1.5">
              <span>🛑</span>
              <span>ล็อตปัจจุบัน (กำลังใช้งาน)</span>
            </span>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-bold"
              :class="modal.willDeplete ? 'bg-rose-200/80 text-rose-900' : 'bg-amber-200/80 text-amber-900'"
            >
              <template v-if="modal.shortageQty > 0">สต็อกไม่พอ (ขาดอีก {{ modal.shortageQty.toLocaleString() }} {{ modal.unit }})</template>
              <template v-else-if="modal.willDeplete">สต็อกจะหมด (0 {{ modal.unit }})</template>
              <template v-else>ใกล้หมด (จะเหลือ {{ modal.remainingAfter?.toLocaleString() }} {{ modal.unit }})</template>
            </span>
          </div>
          <div class="text-[11px] text-stone-600 space-y-0.5 font-number">
            <div>
              <span class="text-stone-400 font-sans">รับเข้า:</span> {{ formatDisplayDate(modal.currentLot?.receiveDate) }}
              <span v-if="modal.currentLot?.expiryDate" class="text-stone-300 mx-1">•</span>
              <span v-if="modal.currentLot?.expiryDate"><span class="text-stone-400 font-sans">หมดอายุ:</span> {{ formatDisplayDate(modal.currentLot?.expiryDate) }}</span>
            </div>
            <div class="font-sans text-rose-700 font-medium">
              มีเหลือในล็อตนี้: {{ (Number(modal.availableInCurrent) || 0).toLocaleString() }} {{ modal.unit }}
              <span v-if="modal.neededQty > 0" class="text-stone-500">
                (ต้องการใช้ {{ (Number(modal.neededQty) || 0).toLocaleString() }} {{ modal.unit }})
              </span>
            </div>
          </div>
        </div>

        <!-- Arrow Divider -->
        <div class="flex items-center justify-center gap-2 text-stone-400 text-xs font-semibold select-none">
          <div class="h-px bg-stone-200 flex-1"></div>
          <span class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-[11px] text-stone-600">
            <span>⬇️</span>
            <span>ต้องการสลับไปล็อตใหม่หรือไม่?</span>
          </span>
          <div class="h-px bg-stone-200 flex-1"></div>
        </div>

        <!-- 2. Next Available Lot -->
        <div v-if="modal.nextLot" class="lot-comparison lot-comparison--next">
          <div class="flex items-center justify-between mb-1.5">
            <span class="font-bold text-emerald-800 flex items-center gap-1.5">
              <span>✨</span>
              <span>ล็อตใหม่ถัดไปที่พร้อมใช้งาน</span>
            </span>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 text-emerald-900">
              พร้อมสลับมาใช้
            </span>
          </div>
          <div class="text-[11px] text-stone-600 space-y-0.5 font-number">
            <div>
              <span class="text-stone-400 font-sans">รับเข้า:</span> {{ formatDisplayDate(modal.nextLot?.receiveDate) }}
              <span v-if="modal.nextLot?.expiryDate" class="text-stone-300 mx-1">•</span>
              <span v-if="modal.nextLot?.expiryDate"><span class="text-stone-400 font-sans">หมดอายุ:</span> {{ formatDisplayDate(modal.nextLot?.expiryDate) }}</span>
            </div>
            <div class="font-sans text-emerald-800 font-semibold flex items-center justify-between">
              <span>คงเหลือในล็อตนี้: {{ (Number(modal.nextLot?.qty) || 0).toLocaleString() }} {{ modal.unit }}</span>
              <span class="text-[10px] text-emerald-700 font-normal">ระบบจะตั้งเป็น 'กำลังใช้งาน' ทันที</span>
            </div>
          </div>
        </div>
      </div>
<div class="lot-decision-hint">
        <p>
          • <strong>ถ้ากด "เปลี่ยนไปล็อตใหม่":</strong> ระบบจะย้ายสถานะ <em>"กำลังใช้งาน"</em> ไปที่ล็อตใหม่ทันที และตัดสต็อกต่อจากล็อตใหม่<br />
          <span v-if="modal.actionContext === 'pos'">ยกเลิกแล้วตะกร้าและล็อตปัจจุบันจะยังเหมือนเดิม</span>
          <span v-else>หากไม่สลับ ล็อตใหม่จะไม่ถูกเลือกมาใช้งาน ตรวจรายการร่างในหน้าคลังก่อนบันทึกสต็อกจริง</span>
        </p>
      </div>
  <template #footer><div class="decision-actions">
        <button
          type="button"
          data-decision-cancel @click="onCancel"
          class="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer select-none text-center"
        >
          {{ modal.actionContext === 'adjust' ? 'ไม่สลับล็อต' : 'ยกเลิก' }}
        </button>

        <button
          type="button"
          @click="onConfirm"
          :disabled="!modal.nextLot"
          class="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-800 active:bg-brand-900 shadow-sm transition-all cursor-pointer select-none flex items-center justify-center gap-1.5"
          ref="confirmButtonRef"
        >
          <span>เปลี่ยนไปล็อตใหม่ (สลับทันที)</span>
          <span>⚡</span>
        </button>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import {AlertTriangle} from 'lucide-vue-next'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { computed, ref } from 'vue'
import { formatDisplayDate } from '@/stores/posStore'
import { useInventoryStore } from '@/composables/useInventoryStore'

const store = useInventoryStore()
const modal = computed(() => store.modals.lotDepletion || {})
const confirmButtonRef = ref(null)

function onConfirm() {
  if(!modal.value.isOpen)return
  const callback=modal.value.onConfirm
  store.modals.lotDepletion.isOpen=false
  store.modals.lotDepletion.onConfirm=null
  if(typeof callback==='function')callback()
}

function onCancel() {
  if (typeof modal.value.onCancel === 'function') {
    modal.value.onCancel()
  } else {
    store.modals.lotDepletion.isOpen = false
  }
}
</script>
<style scoped>
.decision-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;width:100%}.decision-actions>button{min-height:44px;font-size:.8125rem}
.lot-comparison{padding:18px;border-radius:12px;font-size:.8125rem;line-height:1.8;background:#FEF2F2}.lot-comparison--next{background:#ECFDF5}.lot-comparison>div:first-child{flex-wrap:wrap;gap:8px}.lot-comparison :deep(.text-stone-400){color:var(--text-muted)}.lot-comparison :deep(.text-\[11px\]){font-size:.75rem}.lot-comparison :deep(.flex.items-center.justify-between){flex-wrap:wrap;gap:8px}.lot-decision-hint{padding:20px 0 0;color:var(--text-muted);font-size:.8125rem;line-height:1.8}
</style>
<style scoped>.decision-actions>button:disabled{opacity:.45;cursor:not-allowed}</style>
