<template>
  <div
    v-if="modal.isOpen"
    class="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
    tabindex="-1"
    @click.self="onCancel"
    @keydown.esc="onCancel"
    @keydown.enter.prevent="onConfirm"
  >
    <div
      class="bg-white rounded-3xl border border-stone-200/90 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-150 relative overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      <!-- Top Header -->
      <div class="flex items-start gap-3.5 pb-1">
        <div class="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center text-xl shrink-0 shadow-2xs">
          <span>⚠️</span>
        </div>
        <div class="min-w-0 flex-1 pt-0.5">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-stone-900 leading-snug">
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
      </div>

      <!-- Lot Flow Comparison Cards -->
      <div class="space-y-2.5">
        <!-- 1. Depleted Current Lot -->
        <div class="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200/70 text-xs">
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
        <div v-if="modal.nextLot" class="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs">
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

      <!-- Action Explanations -->
      <div class="p-3 rounded-xl bg-stone-50 border border-stone-100 text-[11px] text-stone-500 leading-relaxed">
        <p>
          • <strong>ถ้ากด "เปลี่ยนไปล็อตใหม่":</strong> ระบบจะย้ายสถานะ <em>"กำลังใช้งาน"</em> ไปที่ล็อตใหม่ทันที และตัดสต็อกต่อจากล็อตใหม่<br />
          • <strong>ถ้ากด "ยกเลิก (ไม่เปลี่ยนล็อต)":</strong> ระบบจะไม่แตะต้องล็อตใหม่ และใช้เฉพาะสต็อกที่มีในล็อตเดิม (หากสต็อกไม่พอ การดำเนินการจะถูกยกเลิก)
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2">
        <button
          type="button"
          @click="onCancel"
          class="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer select-none text-center"
        >
          ยกเลิก (ไม่เปลี่ยนล็อต)
        </button>

        <button
          type="button"
          @click="onConfirm"
          class="w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-amber-900 hover:bg-amber-950 active:bg-stone-900 shadow-sm transition-all cursor-pointer select-none flex items-center justify-center gap-1.5"
          ref="confirmButtonRef"
        >
          <span>เปลี่ยนไปล็อตใหม่ (สลับทันที)</span>
          <span>⚡</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { usePosStore, formatDisplayDate } from '@/stores/posStore'

const store = usePosStore()
const modal = computed(() => store.modals.lotDepletion || {})
const confirmButtonRef = ref(null)

watch(() => modal.value.isOpen, (open) => {
  if (open) {
    nextTick(() => {
      confirmButtonRef.value?.focus?.()
    })
  }
})

function onConfirm() {
  if (typeof modal.value.onConfirm === 'function') {
    modal.value.onConfirm()
  } else {
    store.modals.lotDepletion.isOpen = false
  }
}

function onCancel() {
  if (typeof modal.value.onCancel === 'function') {
    modal.value.onCancel()
  } else {
    store.modals.lotDepletion.isOpen = false
  }
}
</script>
