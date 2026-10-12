<template>
 <DialogFrame :open="store.modals.lowStockWarning.isOpen" id="LowStockWarningModal" title="ตรวจสอบสต็อก" :teleport="false" initial-focus="[data-decision-cancel]" @request-close="cancel">
  <template #header><div class="flex items-center gap-3">
        <div
          class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl font-bold"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'"
        >
          <AlertTriangle :size="22" aria-hidden="true"/>
        </div>
        <div>
          <h3 id="LowStockWarningModal-title" class="text-sm font-bold text-stone-900">
            {{ store.modals.lowStockWarning.title || (store.modals.lowStockWarning.isOutOfStock ? 'แจ้งเตือน: วัตถุดิบหมดสต็อก' : 'แจ้งเตือน: วัตถุดิบใกล้หมด') }}
          </h3>
          <p class="text-[11px] text-stone-500">
            {{ store.modals.lowStockWarning.subtitle || (store.modals.lowStockWarning.isOutOfStock ? 'วัตถุดิบไม่พอในระบบ แต่สามารถยืนยันเพื่อขายต่อได้' : 'การเพิ่มออเดอร์นี้จะทำให้วัตถุดิบต่ำกว่าเกณฑ์ปลอดภัย') }}
          </p>
        </div>
      </div></template>
  <div class="space-y-2 text-xs">
        <div
          v-for="(item, idx) in store.modals.lowStockWarning.warningItems"
          :key="idx"
          class="flex items-center justify-between p-2.5 rounded-xl border"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-50/70 border-rose-200/70' : 'bg-amber-50/70 border-amber-200/60'"
        >
          <div class="flex items-center gap-2">
            <span class="text-base">{{ item.emoji }}</span>
            <div>
              <div class="font-medium text-stone-900">{{ item.name }} <span v-if="item.inventoryType" class="stock-type">{{ item.inventoryType==='packaging'?'บรรจุภัณฑ์':'วัตถุดิบ' }}</span></div>
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
        <p v-if="store.modals.lowStockWarning.warningItems.some(item=>item.inventoryType==='packaging')" class="package-shortage-copy">Package ที่ขาดจะหยุดตัดที่ศูนย์ สต็อกไม่ติดลบ และไม่บันทึกของทดแทน ระบบเก็บยอดขาดเป็นเหตุการณ์ของออเดอร์เท่านั้น</p>
      </div>
  <template #footer><div class="decision-actions">
        <button
          type="button"
          data-decision-cancel @click="cancel"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="confirm"
          class="px-5 py-2 text-xs font-semibold text-white rounded-xl shadow-xs transition-all cursor-pointer"
          :class="store.modals.lowStockWarning.isOutOfStock ? 'bg-rose-700 hover:bg-rose-800' : 'bg-brand-600 hover:bg-brand-800'"
        >
          {{ store.modals.lowStockWarning.isOutOfStock ? 'ยืนยันขายต่อ (Backorder)' : 'ยืนยันและดำเนินการต่อ' }}
        </button>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import {AlertTriangle} from 'lucide-vue-next'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { usePosStore } from '@/stores/posStore'

const store = usePosStore()

function cancel() {
  store.modals.lowStockWarning.isOpen = false
  store.modals.lowStockWarning.warningItems = []
  store.modals.lowStockWarning.onConfirm = null
}

function confirm() {
  if (!store.modals.lowStockWarning.isOpen) return
  const cb = store.modals.lowStockWarning.onConfirm
  store.modals.lowStockWarning.isOpen = false
  store.modals.lowStockWarning.onConfirm = null
  if (typeof cb === 'function') cb()
}
</script>
<style scoped>
.decision-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;width:100%}.decision-actions>button{min-height:44px;font-size:.8125rem}
.stock-type{display:inline-block;margin-left:4px;padding:1px 5px;border-radius:999px;background:#fff;color:#78716c;font-size:.625rem}.package-shortage-copy{margin-top:12px;padding:10px;border-radius:10px;background:#fff7ed;color:#9a3412;line-height:1.6}
</style>
