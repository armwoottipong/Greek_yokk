<template>
  <ModalShell labelled-by="LowStockWarningModal-title" @request-close="cancel" :open="store.modals.lowStockWarning.isOpen"
    class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
  >
    <div
      class="bg-white rounded-2xl border shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150"
      :class="store.modals.lowStockWarning.isOutOfStock ? 'border-rose-300' : 'border-amber-200'"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'"
        >
          {{ store.modals.lowStockWarning.isOutOfStock ? '🚨' : '⚠️' }}
        </div>
        <div>
          <h3 id="LowStockWarningModal-title" class="text-sm font-bold text-stone-900">
            {{ store.modals.lowStockWarning.title || (store.modals.lowStockWarning.isOutOfStock ? 'แจ้งเตือน: วัตถุดิบหมดสต็อก' : 'แจ้งเตือน: วัตถุดิบใกล้หมด') }}
          </h3>
          <p class="text-[11px] text-stone-500">
            {{ store.modals.lowStockWarning.subtitle || (store.modals.lowStockWarning.isOutOfStock ? 'วัตถุดิบไม่พอในระบบ แต่สามารถยืนยันเพื่อขายต่อได้' : 'การเพิ่มออเดอร์นี้จะทำให้วัตถุดิบต่ำกว่าเกณฑ์ปลอดภัย') }}
          </p>
        </div>
      </div>

      <!-- Warning list -->
      <div class="space-y-2 max-h-48 overflow-y-auto p-1 text-xs">
        <div
          v-for="(item, idx) in store.modals.lowStockWarning.warningItems"
          :key="idx"
          class="flex items-center justify-between p-2.5 rounded-xl border"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-50/70 border-rose-200/70' : 'bg-amber-50/70 border-amber-200/60'"
        >
          <div class="flex items-center gap-2">
            <span class="text-base">{{ item.emoji }}</span>
            <div>
              <div class="font-medium text-stone-900">{{ item.name }}</div>
              <div class="text-[10px] text-stone-400">
                {{ store.modals.lowStockWarning.isOutOfStock ? `ต้องการ: ${item.needed} ${item.unit} (มี ${item.stock})` : `จุดเตือนหมด: ${item.minAlert} ${item.unit}` }}
              </div>
            </div>
          </div>
          <div class="text-right">
            <span
              class="text-xs font-number font-bold"
              :class="store.modals.lowStockWarning.isOutOfStock ? 'text-rose-700' : 'text-amber-900'"
            >
              {{ store.modals.lowStockWarning.isOutOfStock ? `ขาดอีก ${item.shortage} ${item.unit}` : `เหลือ ${item.remaining} ${item.unit}` }}
            </span>
          </div>
        </div>
      </div>

      <div class="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
        <button
          type="button"
          @click="cancel"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="confirm"
          class="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-700 hover:bg-rose-800' : 'bg-amber-800 hover:bg-amber-900'"
        >
          {{ store.modals.lowStockWarning.isOutOfStock ? 'ยืนยันขายต่อ (Backorder)' : 'ยืนยันและดำเนินการต่อ' }}
        </button>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import { usePosStore } from '@/stores/posStore'

const store = usePosStore()

function cancel() {
  store.modals.lowStockWarning.isOpen = false
  store.modals.lowStockWarning.warningItems = []
  store.modals.lowStockWarning.onConfirm = null
}

function confirm() {
  const cb = store.modals.lowStockWarning.onConfirm
  if (cb) cb()
}
</script>
