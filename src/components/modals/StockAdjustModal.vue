<template>
  <div
    v-if="store.modals.stockAdjust.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Header -->
      <div class="px-7 py-5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-base font-semibold text-stone-900 flex items-center gap-2">
            <span>⚖️</span>
            <span>ปรับยอดสต็อกจริง (Stock Adjust)</span>
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">เทียบยอดนับจริงกับระบบและบันทึกเหตุผลผลต่าง</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Pure Flat Body -->
      <div class="p-7 space-y-5 overflow-y-auto flex-1 text-xs">
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">เลือกวัตถุดิบ <span class="text-rose-500">*</span></label>
          <select
            v-model="selectedMatId"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
          >
            <option
              v-for="m in store.activeMaterials"
              :key="m.id"
              :value="m.id"
            >
              {{ m.emoji }} {{ m.name }} (ในระบบ: {{ m.stock }} {{ m.unit }})
            </option>
          </select>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="px-4 py-3 rounded-xl bg-[#FAF9F6] flex flex-col justify-center">
            <span class="block text-[11px] text-stone-500 mb-0.5">ยอดในระบบปัจจุบัน:</span>
            <span class="text-sm font-number font-bold text-stone-900">
              {{ currentStock.toLocaleString() }} {{ selectedMaterial?.unit }}
            </span>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ยอดนับจริงใหม่ <span class="text-rose-500">*</span></label>
            <div class="flex items-center gap-2">
              <input
                v-model.number="actualStock"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-400 text-xs shrink-0 font-medium w-8">{{ selectedMaterial?.unit }}</span>
            </div>
          </div>
        </div>

        <!-- Difference Line -->
        <div class="flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF9F6] text-xs">
          <span class="text-stone-500">ผลต่างที่ปรับ:</span>
          <span
            class="font-number font-bold text-sm"
            :class="difference === 0 ? 'text-stone-600' : difference > 0 ? 'text-emerald-700' : 'text-rose-600'"
          >
            {{ difference > 0 ? `+${difference.toLocaleString()}` : difference.toLocaleString() }} {{ selectedMaterial?.unit }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">สาเหตุการปรับยอด</label>
          <select
            v-model="reason"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
          >
            <option value="นับสต็อกจริงรายวัน">📋 นับสต็อกจริงรายวัน / ตรวจสอบรอบ</option>
            <option value="ของเสีย/หมดอายุ">🗑️ ของเสีย / หมดอายุ / คุณภาพไม่ผ่าน</option>
            <option value="ทำหก/แตกเสียหาย">💥 ทำหก / ตกแตก / เสียหายหน้างาน</option>
            <option value="ชิม/เทรนนิ่ง">🧑‍🍳 ตักชิม / ทดลองสูตร / เทรนพนักงาน</option>
            <option value="อื่นๆ">✏️ อื่นๆ (ระบุในหมายเหตุ)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1.5">หมายเหตุเพิ่มเติม</label>
          <input
            v-model="note"
            type="text"
            placeholder="เช่น ปรับยอดหลังปิดกะรอบเย็น"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      <!-- Spacious Calm Footer -->
      <div class="px-7 py-4 border-t border-stone-100 bg-white flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          @click="close"
          class="px-5 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>บันทึกปรับยอด</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check } from 'lucide-vue-next'

const store = usePosStore()

const selectedMatId = ref('')
const actualStock = ref(0)
const reason = ref('นับสต็อกจริงรายวัน')
const note = ref('')

const selectedMaterial = computed(() => {
  return store.matMap[selectedMatId.value]
})

const currentStock = computed(() => {
  return selectedMaterial.value ? selectedMaterial.value.stock : 0
})

const difference = computed(() => {
  return (Number(actualStock.value) || 0) - currentStock.value
})

watch(() => store.modals.stockAdjust.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockAdjust.materialId || (store.activeMaterials[0]?.id || '')
    selectedMatId.value = id
    const mat = store.matMap[id]
    actualStock.value = mat ? mat.stock : 0
    reason.value = 'นับสต็อกจริงรายวัน'
    note.value = ''
  }
})

watch(selectedMatId, (newId) => {
  const mat = store.matMap[newId]
  if (mat) {
    actualStock.value = mat.stock
  }
})

function close() {
  store.modals.stockAdjust.isOpen = false
  store.modals.stockAdjust.materialId = null
}

function submit() {
  if (!selectedMatId.value) {
    store.showToast('กรุณาเลือกวัตถุดิบ', 'error')
    return
  }
  if (actualStock.value < 0) {
    store.showToast('ยอดนับจริงต้องไม่ติดลบ', 'error')
    return
  }

  store.stockAdjust(selectedMatId.value, actualStock.value, reason.value, note.value)
  close()
}
</script>
