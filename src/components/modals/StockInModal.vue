<template>
  <div
    v-if="store.modals.stockIn.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div>
          <h3 class="text-base font-semibold text-stone-900">รับเข้าวัตถุดิบ (Stock In)</h3>
          <p class="text-[11px] text-stone-400 mt-0.5">เพิ่มยอดคงเหลือและอัปเดตต้นทุนรับเข้าล่าสุด</p>
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
              {{ m.emoji }} {{ m.name }} (คงเหลือ: {{ m.stock }} {{ m.unit }})
            </option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">จำนวนที่รับเข้า <span class="text-rose-500">*</span></label>
            <div class="flex items-center gap-1.5">
              <input
                v-model.number="qty"
                type="number"
                min="0.1"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-400 text-xs shrink-0 w-8">{{ selectedMaterial?.unit }}</span>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1">ต้นทุนต่อหน่วย (฿)</label>
            <input
              v-model.number="unitCost"
              type="number"
              step="any"
              placeholder="0.00"
              class="soft-input w-full px-3 py-2 rounded-xl text-xs font-number font-semibold text-stone-900"
            />
          </div>
        </div>

        <!-- Total batch valuation card -->
        <div class="p-3 bg-[#FAF9F6] rounded-xl border border-stone-100 flex items-center justify-between text-xs">
          <span class="text-stone-600">งบต้นทุนการรับเข้ารอบนี้:</span>
          <span class="font-number font-bold text-sm text-emerald-800">
            ฿{{ (qty * (unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
          </span>
        </div>

        <div>
          <label class="block text-xs font-medium text-stone-700 mb-1">บันทึกเพิ่มเติม / ซัพพลายเออร์</label>
          <input
            v-model="note"
            type="text"
            placeholder="เช่น ซื้อจากแม็คโคร, ล็อตวันหมดอายุ 15/10"
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
          class="px-5 py-2 text-xs font-semibold bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Check class="w-3.5 h-3.5" />
          <span>บันทึกรับเข้า</span>
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
const qty = ref(100)
const unitCost = ref(0)
const note = ref('')

const selectedMaterial = computed(() => {
  return store.matMap[selectedMatId.value]
})

watch(() => store.modals.stockIn.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockIn.materialId || (store.activeMaterials[0] ? store.activeMaterials[0].id : '')
    selectedMatId.value = id
    const mat = store.matMap[id]
    unitCost.value = mat ? mat.unitCost : 0
    qty.value = mat && mat.unit === 'g' ? 1000 : 10
    note.value = ''
  }
})

watch(selectedMatId, (newId) => {
  const mat = store.matMap[newId]
  if (mat) {
    unitCost.value = mat.unitCost
  }
})

function close() {
  store.modals.stockIn.isOpen = false
  store.modals.stockIn.materialId = null
}

function submit() {
  if (!selectedMatId.value) {
    store.showToast('กรุณาเลือกวัตถุดิบ', 'error')
    return
  }
  if (!qty.value || qty.value <= 0) {
    store.showToast('กรุณาระบุจำนวนที่รับเข้ามากกว่า 0', 'error')
    return
  }

  store.stockIn(selectedMatId.value, qty.value, unitCost.value, note.value)
  close()
}
</script>
