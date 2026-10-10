<template>
  <ModalShell labelled-by="WasteModal-title" :open="store.modals.waste.isOpen && Boolean(currentMaterial)"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @request-close="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 id="WasteModal-title" class="text-sm font-semibold text-rose-900 flex items-center gap-2">
            <span>🗑️</span>
            <span>บันทึกตัดทิ้งของเสีย (Waste Spoilage)</span>
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">
            ตัดสต็อกจากล็อตที่เสียหาย พร้อมคำนวณมูลค่าขาดทุนจริง
          </p>
        </div>
        <button
          @click="close"
          class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
         aria-label="ปิดหน้าต่าง">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        <!-- Target Material & Lot Info Card -->
        <div class="p-3.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl">{{ currentMaterial.emoji }}</span>
              <div>
                <div class="font-bold text-stone-900 text-xs">{{ currentMaterial.name }}</div>
                <div class="text-[10px] text-stone-500">หมวดหมู่: {{ currentMaterial.category }}</div>
              </div>
            </div>
            <span
              v-if="currentLot?.isInUse"
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800"
            >
              🟢 ล็อตที่ใช้อยู่
            </span>
          </div>

          <!-- Lot Details Strip -->
          <div v-if="currentLot" class="pt-2 border-t border-stone-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-number">
            <div>
              <span class="text-stone-400 font-sans">วันที่รับ: </span>
              <span class="font-medium text-stone-800">{{ formatThaiDate(currentLot.receiveDate) }}</span>
              <span v-if="receiveAge" class="text-stone-400 ml-1">({{ receiveAge.text }})</span>
            </div>
            <div v-if="currentLot.expiryDate">
              <span class="text-stone-400 font-sans">หมดอายุ: </span>
              <span class="font-medium text-stone-800">{{ formatThaiDate(currentLot.expiryDate) }}</span>
            </div>
          </div>
        </div>

        <!-- Available Stock in this lot -->
        <div class="flex items-center justify-between px-3 py-2 rounded-xl bg-[#FBF5EA] border border-stone-200/60 text-xs">
          <span class="text-stone-600 font-medium">คงเหลือในล็อตนี้:</span>
          <div class="text-right">
            <span class="font-bold font-number text-stone-900 text-sm">
              {{ currentLotQty.toLocaleString() }}
            </span>
            <span class="text-stone-500 ml-1">{{ currentMaterial.unit }}</span>
            <span v-if="currentMaterial.packSize > 1" class="text-[10px] text-stone-400 ml-1.5 font-number">
              (≈ {{ (currentLotQty / currentMaterial.packSize).toFixed(1) }} {{ currentMaterial.packUnit }})
            </span>
          </div>
        </div>

        <!-- Quantity to Discard Input -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs font-semibold text-stone-800">
              จำนวนที่ต้องการตัดทิ้ง <span class="text-rose-500">*</span>
            </label>
            <button
              type="button"
              @click="dumpAll"
              class="text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
            >
              ทิ้งทั้งหมดในล็อตนี้ ({{ currentLotQty }} {{ currentMaterial.unit }})
            </button>
          </div>

          <div class="flex items-center gap-2">
            <input
              v-model.number="wasteQty"
              type="number"
              min="0.1"
              :max="currentLotQty"
              step="any"
              placeholder="0"
              class="soft-input flex-1 px-3.5 py-2.5 rounded-xl text-center text-sm font-bold font-number text-rose-900 placeholder:text-stone-300"
            />
            <span class="text-xs font-medium text-stone-600 shrink-0 w-12 text-center">
              {{ currentMaterial.unit }}
            </span>
          </div>
        </div>

        <!-- Quick Reason Tags -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-800 block">สาเหตุการตัดทิ้ง</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="r in reasonPresets"
              :key="r"
              type="button"
              @click="selectedReason = r"
              :class="[
                'px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
                selectedReason === r
                  ? 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
              ]"
            >
              {{ r }}
            </button>
          </div>
        </div>

        <!-- Optional Note -->
        <div class="space-y-1.5">
          <label class="text-xs font-semibold text-stone-800 block">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
          <input
            v-model="wasteNote"
            type="text"
            placeholder="เช่น ผลช้ำที่ก้นลัง, ลืมแช่ตู้เย็นข้ามคืน..."
            class="soft-input w-full px-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <!-- Financial Loss Preview Card -->
        <div class="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/80 space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="text-rose-900 font-medium">มูลค่าความสูญเสีย (Estimated Loss):</span>
            <span class="text-base font-bold font-number text-rose-800">
              -฿{{ estimatedLossValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
            </span>
          </div>
          <div class="text-[10px] text-rose-700/80 font-number">
            คำนวณจาก: {{ (wasteQty || 0).toLocaleString() }} {{ currentMaterial.unit }} × ฿{{ Number(currentLot?.unitCost || currentMaterial.unitCost || 0).toFixed(4) }}/{{ currentMaterial.unit }}
          </div>
        </div>
      </div>

      <!-- Footer Actions -->
      <div class="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-end gap-2.5 shrink-0">
        <button
          type="button"
          @click="close"
          class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200 transition-colors cursor-pointer"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="confirmWaste"
          :disabled="!isValid"
          class="px-5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 class="w-3.5 h-3.5" />
          <span>บันทึกตัดของเสีย</span>
        </button>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore, formatThaiDate, getReceiveAgeStatus } from '@/stores/posStore'
import { X, Trash2 } from 'lucide-vue-next'

const store = usePosStore()

const wasteQty = ref(0)
const selectedReason = ref('ผลไม้ช้ำ/ขึ้นรา')
const wasteNote = ref('')

const reasonPresets = [
  'ผลไม้ช้ำ/ขึ้นรา',
  'หมดอายุ/กลิ่นเปลี่ยน',
  'โยเกิร์ตแยกชั้น/บูด',
  'ทำตก/หกเสียหาย',
  'รสชาติเปลี่ยน',
  'คัดทิ้งตอนตัดแต่ง'
]

const currentMaterial = computed(() => {
  const id = store.modals.waste.materialId
  return id ? store.materials.find(m => m.id === id) : null
})

const currentLot = computed(() => {
  if (!currentMaterial.value) return null
  const lotId = store.modals.waste.lotId
  if (lotId && currentMaterial.value.lots) {
    const found = currentMaterial.value.lots.find(l => l.id === lotId)
    if (found) return found
  }
  // Default to in-use lot or first positive lot
  return (
    currentMaterial.value.lots?.find(l => l.isInUse && l.qty > 0) ||
    currentMaterial.value.lots?.find(l => l.qty > 0) ||
    currentMaterial.value.lots?.[0] ||
    null
  )
})

const currentLotQty = computed(() => {
  return Number(currentLot.value?.qty) || 0
})

const receiveAge = computed(() => {
  if (!currentLot.value?.receiveDate) return null
  return getReceiveAgeStatus(currentLot.value.receiveDate)
})

const estimatedLossValue = computed(() => {
  const qty = Number(wasteQty.value) || 0
  const cost = Number(currentLot.value?.unitCost) || Number(currentMaterial.value?.unitCost) || 0
  return Math.round((qty * cost) * 100) / 100
})

const isValid = computed(() => {
  const qty = Number(wasteQty.value) || 0
  return qty > 0 && qty <= currentLotQty.value
})

watch(() => store.modals.waste.isOpen, (open) => {
  if (open) {
    wasteQty.value = 0
    wasteNote.value = ''
    selectedReason.value = 'ผลไม้ช้ำ/ขึ้นรา'
  }
})

function dumpAll() {
  wasteQty.value = currentLotQty.value
}

function close() {
  store.closeWasteModal()
}

async function confirmWaste() {
  if (!isValid.value || !currentMaterial.value || !currentLot.value) return

  const qty = Number(wasteQty.value) || 0
  const curLot = currentLot.value
  const mat = currentMaterial.value

  // If this lot is in use and will be completely depleted
  if (curLot.isInUse && qty >= currentLotQty.value) {
    const otherLots = mat.lots
      ?.filter(l => l.id !== curLot.id && l.qty > 0)
      .sort((a, b) => {
        if (a.expiryDate && b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate)
        return (a.receiveDate || '').localeCompare(b.receiveDate || '')
      })
    const nextLot = otherLots ? otherLots[0] : null

    if (nextLot) {
      const willSwitch = await store.promptLotDepletion({
        material: mat,
        currentLot: curLot,
        nextLot,
        neededQty: qty,
        availableInCurrent: currentLotQty.value,
        actionContext: 'waste'
      })

      if (!willSwitch) {
        store.showToast('ยกเลิกการตัดของเสีย (ไม่ต้องการสลับล็อตใหม่)', 'info')
        return
      }
    }
  }

  const success = store.recordLotWaste({
    materialId: currentMaterial.value.id,
    lotId: currentLot.value.id,
    wasteQty: wasteQty.value,
    reason: selectedReason.value,
    note: wasteNote.value
  }, true)

  if (success?.ok || success?.success) {
    close()
  }
}
</script>
