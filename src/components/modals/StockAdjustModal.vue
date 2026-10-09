<template>
  <ModalShell labelled-by="StockAdjustModal-title" :open="store.modals.stockAdjust.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @request-close="requestClose(close)"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Header -->
      <div class="px-7 py-5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 id="StockAdjustModal-title" class="text-base font-semibold text-stone-900 flex items-center gap-2">
            <span>⚖️</span>
            <span>ปรับยอดสต็อกจริง (Stock Adjust)</span>
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">เทียบยอดนับจริงกับระบบและบันทึกเหตุผลผลต่าง</p>
        </div>
        <button @click="requestClose(close)" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer" aria-label="ปิดหน้าต่าง">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Pure Flat Body -->
      <div class="p-7 space-y-5 overflow-y-auto flex-1 text-xs">
        <div>
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-medium text-stone-700">เลือกวัตถุดิบ <span class="text-rose-500">*</span></label>
            <button
              v-if="selectedMatId"
              type="button"
              @click="store.openActivityLog('stock', selectedMatId)"
              class="inline-flex items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900 hover:underline cursor-pointer"
              title="ดูประวัติการตรวจนับและการเคลื่อนไหวของวัตถุดิบนี้"
            >
              <History class="w-3.5 h-3.5" />
              <span>ดูประวัติการเคลื่อนไหว</span>
            </button>
          </div>
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

        <!-- Lot Selection Strip (If material has multiple lots) -->
        <div v-if="selectedMaterial?.lots && selectedMaterial.lots.length > 1" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-medium text-stone-700">ขอบเขตล็อตที่ต้องการตรวจนับ/ปรับยอด</label>
            <span class="text-[10px] text-stone-400">มีทั้งหมด {{ selectedMaterial.lots.length }} ล็อต</span>
          </div>
          <select
            v-model="selectedLotId"
            class="soft-input w-full px-3.5 py-2 rounded-xl text-xs font-medium text-stone-900"
          >
            <option value="all">
              📦 ปรับยอดรวมคลังทั้งหมด (ตัด/เพิ่มที่ล็อตกำลังใช้งานก่อน)
            </option>
            <option
              v-for="l in selectedMaterial.lots"
              :key="l.id"
              :value="l.id"
            >
              {{ l.isInUse ? '⭐ [กำลังใช้งาน] ' : '• ' }}ล็อตวันที่ {{ formatThaiDate(l.receiveDate) }} (คงเหลือ: {{ Number(l.qty || 0).toLocaleString() }} {{ selectedMaterial.unit }})
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
            <div class="flex items-center gap-1.5">
              <button
                type="button"
                @click="stepAdjustStock(-1)"
                :disabled="unitMode === 'pack' ? actualPackStock <= 0 : actualStock <= 0"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="ลด 1"
              >
                <Minus class="w-4 h-4" />
              </button>

              <div class="relative flex-1">
                <input
                  v-if="unitMode === 'pack'"
                  v-model.number="actualPackStock"
                  @input="onPackStockInput"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-center text-xs font-number font-semibold text-stone-900"
                />
                <input
                  v-else
                  v-model.number="actualStock"
                  @input="onBaseStockInput"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  class="soft-input w-full px-3.5 py-2.5 rounded-xl text-center text-xs font-number font-semibold text-stone-900"
                />
              </div>

              <button
                type="button"
                @click="stepAdjustStock(1)"
                class="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition-colors cursor-pointer shrink-0"
                title="เพิ่ม 1"
              >
                <Plus class="w-4 h-4" />
              </button>

              <span class="text-stone-500 text-xs shrink-0 font-medium w-8 text-center">
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
          @click="requestClose(close)"
          class="px-5 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <Check class="w-4 h-4" />
          <span>บันทึกปรับยอด</span>
        </button>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed, watch, nextTick } from 'vue'
import { usePosStore, formatThaiDate } from '@/stores/posStore'
import { useModalForm } from '@/composables/useModalForm'
import { X, Check, Plus, Minus, History } from 'lucide-vue-next'

const store = usePosStore()

const selectedMatId = ref('')
const selectedLotId = ref('all')
const unitMode = ref('base') // 'base' | 'pack'
const actualStock = ref(0)
const actualPackStock = ref(0)
const reason = ref('นับสต็อกจริงรายวัน')
const note = ref('')

const { saveSnapshot, requestClose } = useModalForm(() => ({
  selectedMatId: selectedMatId.value,
  selectedLotId: selectedLotId.value,
  actualStock: actualStock.value,
  reason: reason.value,
  note: note.value
}))

const selectedMaterial = computed(() => {
  return store.matMap[selectedMatId.value]
})

const selectedLot = computed(() => {
  if (!selectedMaterial.value || selectedLotId.value === 'all') return null
  return selectedMaterial.value.lots?.find(l => l.id === selectedLotId.value) || null
})

const currentStock = computed(() => {
  if (selectedLot.value) {
    return Number(selectedLot.value.qty) || 0
  }
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
  actualPackStock.value = (Number(actualStock.value) || 0) / pSize
}

function stepAdjustStock(delta) {
  if (unitMode.value === 'pack') {
    const cur = Number(actualPackStock.value) || 0
    const next = Math.max(0, Math.round((cur + delta) * 10) / 10)
    actualPackStock.value = next
    onPackStockInput()
  } else {
    const step = selectedMaterial.value?.packSize > 1 ? Number(selectedMaterial.value.packSize) : (selectedMaterial.value?.unit === 'g' || selectedMaterial.value?.unit === 'ml' ? 100 : 1)
    const cur = Number(actualStock.value) || 0
    const next = Math.max(0, Math.round((cur + (delta * step)) * 100) / 100)
    actualStock.value = next
    onBaseStockInput()
  }
}

function initForMaterial(mat, targetLotId = 'all') {
  if (!mat) return
  const pSize = mat.packSize > 0 ? mat.packSize : 1
  selectedLotId.value = targetLotId || 'all'

  if (targetLotId && targetLotId !== 'all' && mat.lots) {
    const lot = mat.lots.find(l => l.id === targetLotId)
    if (lot) {
      actualStock.value = Number(lot.qty) || 0
      actualPackStock.value = (Number(lot.qty) || 0) / pSize
      unitMode.value = mat.packUnit && mat.packSize > 1 ? 'pack' : 'base'
      reason.value = 'นับสต็อกจริงรายวัน'
      note.value = ''
      return
    }
  }

  actualStock.value = mat.stock
  actualPackStock.value = mat.stock / pSize
  unitMode.value = mat.packUnit && mat.packSize > 1 ? 'pack' : 'base'
  reason.value = 'นับสต็อกจริงรายวัน'
  note.value = ''
}

watch(selectedLotId, (newLotId) => {
  if (!selectedMaterial.value) return
  const pSize = selectedMaterial.value.packSize > 0 ? selectedMaterial.value.packSize : 1
  if (newLotId !== 'all') {
    const lot = selectedMaterial.value.lots?.find(l => l.id === newLotId)
    if (lot) {
      actualStock.value = Number(lot.qty) || 0
      actualPackStock.value = (Number(lot.qty) || 0) / pSize
    }
  } else {
    actualStock.value = selectedMaterial.value.stock
    actualPackStock.value = selectedMaterial.value.stock / pSize
  }
})

watch(() => store.modals.stockAdjust.isOpen, (open) => {
  if (open) {
    const id = store.modals.stockAdjust.materialId || (store.activeMaterials[0]?.id || '')
    const lotId = store.modals.stockAdjust.lotId || 'all'
    selectedMatId.value = id
    initForMaterial(store.matMap[id], lotId)
    nextTick(() => {
      saveSnapshot()
    })
  }
})

watch(selectedMatId, (newId) => {
  initForMaterial(store.matMap[newId], 'all')
}, { flush: 'sync' })

function close() {
  store.modals.stockAdjust.isOpen = false
  store.modals.stockAdjust.materialId = null
  store.modals.stockAdjust.lotId = null
}

async function submit() {
  if (!selectedMatId.value || !selectedMaterial.value) {
    store.showToast('กรุณาเลือกวัตถุดิบ', 'error')
    return
  }
  if (actualStock.value < 0) {
    store.showToast('ยอดนับจริงต้องไม่ติดลบ', 'error')
    return
  }

  const mat = selectedMaterial.value
  const targetLotId = selectedLotId.value !== 'all' ? selectedLotId.value : null

  if (targetLotId) {
    // Adjusting specific lot
    const lot = mat.lots?.find(l => l.id === targetLotId)
    if (lot && lot.isInUse && actualStock.value <= 0) {
      // Lot is in-use and adjusted to 0!
      const nextLot = mat.lots?.filter(l => l.id !== lot.id && l.qty > 0)[0]
      if (nextLot) {
        const willSwitch = await store.promptLotDepletion({
          material: mat,
          currentLot: lot,
          nextLot,
          neededQty: currentStock.value,
          availableInCurrent: currentStock.value,
          actionContext: 'adjust'
        })
        if (!willSwitch) {
          store.showToast('ยกเลิกการปรับยอด (ไม่ต้องการสลับล็อตใหม่)', 'info')
          return
        }
      }
    }
    const result = store.stockAdjust(selectedMatId.value, actualStock.value, reason.value, note.value, true, targetLotId)
    if (result?.ok || result?.success) close()
    return
  }

  // Adjusting all / total material stock
  const diff = difference.value
  if (diff < 0) {
    const check = store.checkLotDepletion(mat.id, Math.abs(diff))
    if (check.willDeplete && check.nextLot) {
      const willSwitch = await store.promptLotDepletion({
        material: mat,
        currentLot: check.currentLot,
        nextLot: check.nextLot,
        neededQty: Math.abs(diff),
        availableInCurrent: check.availableInCurrent,
        actionContext: 'adjust'
      })

      if (!willSwitch) {
        // Capped adjustment: adjust only up to what current lot has
        const cappedNewStock = Math.max(0, currentStock.value - check.availableInCurrent)
        const result = store.stockAdjust(selectedMatId.value, cappedNewStock, reason.value, `${note.value} (ปรับลดเฉพาะเท่าที่ล็อตเดิมมี)`.trim(), true)
        if (!result?.ok && !result?.success) return
        store.showToast(`ปรับลดเฉพาะเท่าที่ล็อตเดิมมี (คงเหลือ ${cappedNewStock} ${mat.unit})`, 'info')
        close()
        return
      }
    }
  }

  const result = store.stockAdjust(selectedMatId.value, actualStock.value, reason.value, note.value, true)
  if (result?.ok || result?.success) close()
}
</script>
