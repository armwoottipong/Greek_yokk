<template>
  <div
    v-if="store.modals.stockAdjust.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 class="text-base font-semibold text-stone-900">ปรับยอดสต็อกจริง (Stock Adjust)</h3>
          <p class="text-[11px] text-stone-400 mt-0.5">เทียบยอดนับจริงกับระบบและบันทึกเหตุผลผลต่าง</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="space-y-3.5 text-xs">
        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">เลือกวัตถุดิบ <span class="text-rose-500">*</span></label>
          <select
            v-model="selectedMatId"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
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

        <div class="grid grid-cols-2 gap-3">
          <div class="p-3 bg-[#FAF9F6] rounded-xl border border-stone-100">
            <span class="block text-[11px] text-stone-500 mb-1">ยอดในระบบปัจจุบัน:</span>
            <span class="text-sm font-number font-bold text-stone-800">
              {{ currentStock }} {{ selectedMaterial?.unit }}
            </span>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">ยอดนับจริงใหม่ <span class="text-rose-500">*</span></label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="actualStock"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-400 text-xs shrink-0 w-8">{{ selectedMaterial?.unit }}</span>
            </div>
          </div>
        </div>

        <!-- Difference Card -->
        <div
          :class="[
            'p-3 rounded-xl border flex items-center justify-between text-xs transition-colors',
            difference === 0
              ? 'bg-stone-50 border-stone-200 text-stone-600'
              : difference > 0
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          ]"
        >
          <span>ผลต่างที่ปรับ:</span>
          <span class="font-number font-bold text-sm">
            {{ difference > 0 ? `+${difference}` : difference }} {{ selectedMaterial?.unit }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">สาเหตุการปรับยอด</label>
          <select
            v-model="reason"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
          >
            <option value="นับสต็อกจริงรายวัน">📋 นับสต็อกจริงรายวัน / ตรวจสอบรอบ</option>
            <option value="ของเสีย/หมดอายุ">🗑️ ของเสีย / หมดอายุ / คุณภาพไม่ผ่าน</option>
            <option value="ทำหก/แตกเสียหาย">💥 ทำหก / ตกแตก / เสียหายหน้างาน</option>
            <option value="ชิม/เทรนนิ่ง">🧑‍🍳 ตักชิม / ทดลองสูตร / เทรนพนักงาน</option>
            <option value="อื่นๆ">✏️ อื่นๆ (ระบุในหมายเหตุ)</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">หมายเหตุเพิ่มเติม</label>
          <input
            v-model="note"
            type="text"
            placeholder="เช่น ปรับยอดหลังปิดกะรอบเย็น"
            class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
        <button
          type="button"
          @click="close"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-5 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
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
  return Math.round(((actualStock.value || 0) - currentStock.value) * 100) / 100
})

watch(() => store.modals.stockAdjust.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockAdjust.materialId || (store.activeMaterials[0] ? store.activeMaterials[0].id : '')
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
  if (actualStock.value === undefined || actualStock.value < 0) {
    store.showToast('ยอดคงเหลือต้องไม่ติดลบ', 'error')
    return
  }

  store.stockAdjust(selectedMatId.value, actualStock.value, reason.value, note.value)
  close()
}
</script>
