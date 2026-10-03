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
          <div v-if="store.activeMaterials.length === 0" class="p-4 text-center text-stone-400 bg-[#FAF9F6] rounded-xl border border-stone-100">
            ยังไม่มีรายการวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบในหน้าคลังก่อน
          </div>
          <select
            v-else
            v-model="selectedMatId"
            class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900"
          >
            <option
              v-for="m in store.activeMaterials"
              :key="m.id"
              :value="m.id"
            >
              {{ m.emoji }} {{ m.name }} (ในระบบ: {{ m.stock.toLocaleString() }} {{ m.unit }} {{ m.packSize > 1 ? `≈ ${(m.stock / m.packSize).toFixed(1)} ${m.packUnit}` : '' }})
            </option>
          </select>
        </div>

        <!-- Unit Switch Capsule (if material has packUnit) -->
        <div v-if="selectedMaterial?.packUnit && selectedMaterial?.packSize > 1" class="space-y-1.5">
          <label class="block text-xs font-medium text-stone-700">หน่วยที่ใช้นับตรวจนับจริง</label>
          <div class="flex items-center gap-1.5 p-1 bg-[#F5F4F0] rounded-xl text-xs font-semibold">
            <button
              type="button"
              @click="setUnitMode('pack')"
              :class="[
                'flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5',
                unitMode === 'pack'
                  ? 'bg-amber-900 text-white shadow-xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              ]"
            >
              <span>📦 นับเป็น{{ selectedMaterial.packUnit }} (1 {{ selectedMaterial.packUnit }} = {{ selectedMaterial.packSize }} {{ selectedMaterial.unit }})</span>
            </button>
            <button
              type="button"
              @click="setUnitMode('base')"
              :class="[
                'flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5',
                unitMode === 'base'
                  ? 'bg-white text-stone-900 shadow-xs font-bold'
                  : 'text-stone-500 hover:text-stone-900'
              ]"
            >
              <span>⚖️ นับเป็น{{ selectedMaterial.unit }}</span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="px-4 py-3 rounded-xl bg-[#FAF9F6] flex flex-col justify-center">
            <span class="block text-[11px] text-stone-500 mb-0.5">ยอดในระบบปัจจุบัน:</span>
            <span class="text-sm font-number font-bold text-stone-900">
              {{ currentStock.toLocaleString() }} {{ selectedMaterial?.unit }}
              <span v-if="selectedMaterial?.packSize > 1" class="text-xs font-normal text-stone-500">
                (≈ {{ (currentStock / selectedMaterial.packSize).toFixed(1) }} {{ selectedMaterial.packUnit }})
              </span>
            </span>
          </div>

          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">
              ยอดนับจริงใหม่ ({{ unitMode === 'pack' ? selectedMaterial?.packUnit : selectedMaterial?.unit }}) <span class="text-rose-500">*</span>
            </label>
            <div class="flex items-center gap-2">
              <input
                v-if="unitMode === 'pack'"
                v-model.number="actualPackStock"
                @input="onPackStockInput"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <input
                v-else
                v-model.number="actualStock"
                @input="onBaseStockInput"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-number font-semibold text-stone-900"
              />
              <span class="text-stone-500 text-xs shrink-0 font-medium w-8">
                {{ unitMode === 'pack' ? selectedMaterial?.packUnit : selectedMaterial?.unit }}
              </span>
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
            <span v-if="selectedMaterial?.packSize > 1" class="text-xs font-normal">
              ({{ difference > 0 ? `+${(difference / selectedMaterial.packSize).toFixed(2)}` : (difference / selectedMaterial.packSize).toFixed(2) }} {{ selectedMaterial.packUnit }})
            </span>
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
const unitMode = ref('base') // 'base' | 'pack'
const actualStock = ref(0)
const actualPackStock = ref(0)
const reason = ref('นับสต็อกจริงรายวัน')
const note = ref('')

const selectedMaterial = computed(() => {
  return store.matMap[selectedMatId.value]
})

const currentStock = computed(() => {
  return selectedMaterial.value ? Number(selectedMaterial.value.stock) || 0 : 0
})

const difference = computed(() => {
  return (Number(actualStock.value) || 0) - currentStock.value
})

function setUnitMode(mode) {
  unitMode.value = mode
}

function onPackStockInput() {
  const pSize = selectedMaterial.value?.packSize > 0 ? selectedMaterial.value.packSize : 1
  actualStock.value = Math.round((Number(actualPackStock.value) || 0) * pSize * 100) / 100
}

function onBaseStockInput() {
  const pSize = selectedMaterial.value?.packSize > 0 ? selectedMaterial.value.packSize : 1
  actualPackStock.value = Number(((Number(actualStock.value) || 0) / pSize).toFixed(2))
}

function initForMaterial(mat) {
  if (!mat) return
  const pSize = mat.packSize > 0 ? mat.packSize : 1
  actualStock.value = mat.stock
  actualPackStock.value = Number((mat.stock / pSize).toFixed(2))
  unitMode.value = mat.packUnit && mat.packSize > 1 ? 'pack' : 'base'
  reason.value = 'นับสต็อกจริงรายวัน'
  note.value = ''
}

watch(() => store.modals.stockAdjust.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockAdjust.materialId || (store.activeMaterials[0]?.id || '')
    selectedMatId.value = id
    initForMaterial(store.matMap[id])
  }
})

watch(selectedMatId, (newId) => {
  initForMaterial(store.matMap[newId])
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
