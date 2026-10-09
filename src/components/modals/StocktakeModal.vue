<template>
  <ModalShell labelled-by="StocktakeModal-title" @request-close="close" :open="store.modals.stocktake?.isOpen"
    class="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150"
  >
    <div
      class="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full h-[90vh] max-h-[820px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      @click.stop
    >
      <!-- 1. Header Bar -->
      <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-amber-100/80 text-amber-900 flex items-center justify-center text-xl shrink-0 shadow-2xs">
            📋
          </div>
          <div>
            <h3 id="StocktakeModal-title" class="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>ตรวจนับสต็อกปิดร้าน (Stocktake Sheet)</span>
              <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                {{ activeMaterials.length }} รายการ
              </span>
            </h3>
            <p class="text-[11px] text-stone-500">
              กรอกยอดจริงที่นับได้ ระบบคำนวณผลต่าง (ดิฟ) และจัดสรรล็อต FIFO ให้อัตโนมัติ
            </p>
          </div>
        </div>

        <button
          type="button"
          @click="close"
          class="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-200/50 rounded-xl transition-colors cursor-pointer"
         aria-label="ปิดหน้าต่าง">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 2. Controls & Filter Bar -->
      <div class="px-6 py-3 border-b border-stone-100 bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
        <!-- Category Filters -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 max-w-full text-xs">
          <button
            type="button"
            v-for="cat in categories"
            :key="cat"
            @click="selectedCategory = cat"
            class="px-2.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-all cursor-pointer"
            :class="selectedCategory === cat ? 'bg-stone-900 text-white font-semibold shadow-2xs' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'"
          >
            {{ cat === 'all' ? 'ทั้งหมด' : cat }}
          </button>
        </div>

        <!-- Search & Quick Action -->
        <div class="flex items-center gap-2.5 ml-auto">
          <div class="relative w-44 sm:w-56">
            <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาวัตถุดิบ..."
              class="soft-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 font-medium"
            />
          </div>

          <button
            type="button"
            @click="matchAllSystemStock"
            class="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            title="ตั้งค่ายอดนับจริงของทุกรายการเท่ากับยอดในระบบ เพื่อความสะดวกรวดเร็วในการนับเฉพาะตัวที่ดิฟ"
          >
            <CheckCheck class="w-3.5 h-3.5 text-amber-800" />
            <span>ยอดเท่าเดิมทั้งหมด</span>
          </button>
        </div>
      </div>

      <!-- 3. Counting Table (Scrollable Body) -->
      <div class="flex-1 overflow-y-auto px-6 py-4">
        <div class="border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs bg-white">
          <table class="w-full text-left text-xs">
            <thead class="bg-stone-50 border-b border-stone-200/80 text-[11px] font-semibold text-stone-600 sticky top-0 z-10">
              <tr>
                <th class="py-3 px-4">วัตถุดิบ</th>
                <th class="py-3 px-3 text-center">ยอดในระบบ</th>
                <th class="py-3 px-4 text-center w-56">ยอดนับจริง</th>
                <th class="py-3 px-3 text-right">ผลต่าง (Variance)</th>
                <th class="py-3 px-4 text-right">มูลค่ากระทบ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-stone-100">
              <tr
                v-for="mat in filteredMaterials"
                :key="mat.id"
                class="hover:bg-[#FAF9F6] transition-colors"
                :class="getVariance(mat.id) !== 0 ? 'bg-amber-50/20' : ''"
              >
                <!-- Material Info -->
                <td class="py-3 px-4">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-xl shrink-0">{{ mat.emoji }}</span>
                    <div class="min-w-0">
                      <div class="font-bold text-stone-900 truncate">{{ mat.name }}</div>
                      <div class="text-[10px] text-stone-400 font-number truncate">
                        {{ mat.category }} • ต้นทุน ~฿{{ (mat.unitCost || 0).toFixed(2) }}/{{ mat.unit }}
                        <span v-if="mat.packUnit && mat.packSize > 1"> (1 {{ mat.packUnit }} = {{ mat.packSize }} {{ mat.unit }})</span>
                      </div>
                    </div>
                  </div>
                </td>

                <!-- System Expected Stock -->
                <td class="py-3 px-3 text-center font-number tabular-nums">
                  <div class="font-bold text-stone-900 text-xs">
                    {{ (mat.stock || 0).toLocaleString() }} <span class="text-stone-400 font-normal text-[10px]">{{ mat.unit }}</span>
                  </div>
                  <div v-if="mat.packUnit && mat.packSize > 1" class="text-[10px] text-stone-400">
                    ≈ {{ ((mat.stock || 0) / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                  </div>
                </td>

                <!-- Actual Count Input (Support Base Unit & Pack Unit toggle) -->
                <td class="py-2.5 px-4">
                  <div class="flex items-center gap-1.5 justify-center">
                    <div class="relative w-28">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        :value="counts[mat.id].value" @input="setCountValue(mat.id, $event.target.value)"
                        placeholder="0"
                        class="w-full text-right font-number font-bold text-xs py-1.5 px-2.5 rounded-xl border border-stone-300 focus:border-stone-900 focus:ring-1 focus:ring-stone-900 transition-all bg-white"
                        :class="getVariance(mat.id) !== 0 ? 'border-amber-400 bg-amber-50/30' : ''"
                      />
                    </div>

                    <!-- Unit Selector (Base vs Pack) -->
                    <button
                      v-if="mat.packUnit && mat.packSize > 1"
                      type="button"
                      @click="toggleCountUnit(mat.id)"
                      class="px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-colors shrink-0 cursor-pointer"
                      :class="counts[mat.id].unitMode === 'pack' ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-stone-100 border-stone-200 text-stone-600 hover:bg-stone-200'"
                      :title="counts[mat.id].unitMode === 'pack' ? `สลับเป็นหน่วยย่อย (${mat.unit})` : `สลับเป็นหน่วยแพ็ค (${mat.packUnit})`"
                    >
                      {{ counts[mat.id].unitMode === 'pack' ? mat.packUnit : mat.unit }}
                    </button>
                    <span v-else class="text-[11px] font-medium text-stone-500 shrink-0 w-8">
                      {{ mat.unit }}
                    </span>

                    <!-- Quick Match System Button -->
                    <button
                      type="button"
                      @click="matchSystemStock(mat)"
                      class="p-1 text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="กำหนดยอดเท่ากับในระบบ"
                    >
                      <RotateCcw class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>

                <!-- Variance (Difference) -->
                <td class="py-3 px-3 text-right font-number tabular-nums">
                  <div
                    class="font-bold text-xs"
                    :class="[
                      getVariance(mat.id) > 0 ? 'text-emerald-600' : getVariance(mat.id) < 0 ? 'text-rose-600' : 'text-stone-400'
                    ]"
                  >
                    {{ getVariance(mat.id) > 0 ? `+${getVariance(mat.id).toLocaleString()}` : getVariance(mat.id).toLocaleString() }}
                    <span class="text-[10px] font-normal text-stone-400 ml-0.5">{{ mat.unit }}</span>
                  </div>
                  <div v-if="getVariance(mat.id) !== 0 && mat.packUnit && mat.packSize > 1" class="text-[9px] text-stone-400">
                    (≈ {{ (getVariance(mat.id) / mat.packSize).toFixed(1) }} {{ mat.packUnit }})
                  </div>
                </td>

                <!-- Valuation Cost Impact -->
                <td class="py-3 px-4 text-right font-number tabular-nums">
                  <span
                    class="font-bold text-xs"
                    :class="[
                      getCostImpact(mat) > 0 ? 'text-emerald-700' : getCostImpact(mat) < 0 ? 'text-rose-700' : 'text-stone-400'
                    ]"
                  >
                    {{ getCostImpact(mat) > 0 ? `+฿${getCostImpact(mat).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : getCostImpact(mat) < 0 ? `-฿${Math.abs(getCostImpact(mat)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '฿0.00' }}
                  </span>
                </td>
              </tr>

              <tr v-if="filteredMaterials.length === 0">
                <td colspan="5" class="py-12 text-center text-stone-400 text-xs">
                  🔍 ไม่พบวัตถุดิบตามเงื่อนไขที่เลือก
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 4. Footer Summary & Confirm Button -->
      <div class="px-6 py-4 border-t border-stone-200 bg-stone-50/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <!-- Summary Stats -->
        <div class="flex items-center gap-4 text-xs font-number">
          <div class="flex items-center gap-1.5">
            <span class="text-stone-400">รายการที่ยอดดิฟ:</span>
            <span class="font-bold" :class="varianceStats.changedCount > 0 ? 'text-amber-800' : 'text-stone-700'">
              {{ varianceStats.changedCount }} / {{ activeMaterials.length }} รายการ
            </span>
          </div>

          <div class="h-3.5 w-px bg-stone-300"></div>

          <div class="flex items-center gap-1.5">
            <span class="text-stone-400">กระทบมูลค่าสต็อก:</span>
            <span
              class="font-bold"
              :class="varianceStats.netCostImpact > 0 ? 'text-emerald-700' : varianceStats.netCostImpact < 0 ? 'text-rose-700' : 'text-stone-700'"
            >
              {{ varianceStats.netCostImpact > 0 ? `+฿${varianceStats.netCostImpact.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : varianceStats.netCostImpact < 0 ? `-฿${Math.abs(varianceStats.netCostImpact).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '฿0.00' }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center gap-2.5">
          <button
            type="button"
            @click="close"
            class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            @click="submitStocktake"
            :disabled="varianceStats.changedCount === 0"
            class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check class="w-4 h-4" />
            <span>บันทึกผลการตรวจนับ (แบบร่าง)</span>
          </button>
        </div>
      </div>
    </div>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, Search, RotateCcw, CheckCheck } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedCategory = ref('all')

// Local count map: { [matId]: { value: Number, unitMode: 'base' | 'pack' } }
const counts = ref({})

const categories = computed(() => {
  const cats = new Set(store.materials.filter(m => !m.isDeleted).map(m => m.category).filter(Boolean))
  return ['all', ...Array.from(cats)]
})

const activeMaterials = computed(() => {
  return store.materials.filter(m => !m.isDeleted)
})

const filteredMaterials = computed(() => {
  return activeMaterials.value.filter(m => {
    if (selectedCategory.value !== 'all' && m.category !== selectedCategory.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchCat = m.category?.toLowerCase().includes(q)
      if (!matchName && !matchId && !matchCat) return false
    }
    return true
  })
})

// Initialize count map when modal opens
watch(() => store.modals.stocktake?.isOpen, (isOpen) => {
  if (isOpen) {
    searchQuery.value = ''
    selectedCategory.value = 'all'
    const newCounts = {}
    activeMaterials.value.forEach(m => {
      newCounts[m.id] = {
        value: Number(m.stock) || 0,
        baseQty: Number(m.stock) || 0,
        unitMode: 'base'
      }
    })
    counts.value = newCounts
  }
}, { immediate: true })

// Helper to convert input to base units
function getActualBaseQty(matId) {
  const item = counts.value[matId]
  if (!item) return 0
  const mat = store.matMap[matId]
  if (!mat) return 0

  return item.unitMode === 'base' ? Number(item.value) : item.baseQty
}

function setCountValue(matId, value) {
  const item = counts.value[matId]
  const mat = store.matMap[matId]
  item.value = Number(value)
  item.baseQty = item.value * (item.unitMode === 'pack' ? mat.packSize : 1)
}
function getVariance(matId) {
  const mat = store.matMap[matId]
  if (!mat) return 0
  const actual = getActualBaseQty(matId)
  return Math.round((actual - (Number(mat.stock) || 0)) * 100) / 100
}

function getCostImpact(mat) {
  const variance = getVariance(mat.id)
  const cost = Number(mat.unitCost) || 0
  return Math.round(variance * cost * 100) / 100
}

function toggleCountUnit(matId) {
  const item = counts.value[matId]
  if (!item) return
  const mat = store.matMap[matId]
  if (!mat || !mat.packSize || mat.packSize <= 1) return

  if (item.unitMode === 'base') item.baseQty = Number(item.value)
  item.unitMode = item.unitMode === 'base' ? 'pack' : 'base'
  item.value = item.unitMode === 'pack' ? item.baseQty / mat.packSize : item.baseQty
}
function matchSystemStock(mat) {
  if (!counts.value[mat.id]) return
  counts.value[mat.id].value = Number(mat.stock) || 0
  counts.value[mat.id].baseQty = Number(mat.stock) || 0
  counts.value[mat.id].unitMode = 'base'
}

function matchAllSystemStock() {
  activeMaterials.value.forEach(mat => {
    matchSystemStock(mat)
  })
}

const varianceStats = computed(() => {
  let changedCount = 0
  let netCostImpact = 0

  activeMaterials.value.forEach(mat => {
    const v = getVariance(mat.id)
    if (v !== 0) {
      changedCount++
      netCostImpact += getCostImpact(mat)
    }
  })

  return {
    changedCount,
    netCostImpact: Math.round(netCostImpact * 100) / 100
  }
})

function close() {
  if (store.modals.stocktake) {
    store.modals.stocktake.isOpen = false
  }
}

function submitStocktake() {
  const changedItems = []
  activeMaterials.value.forEach(mat => {
    const diff = getVariance(mat.id)
    if (diff !== 0) {
      const newStock = getActualBaseQty(mat.id)
      changedItems.push({
        materialId: mat.id,
        newStock,
        diff
      })
    }
  })

  if (changedItems.length === 0) {
    store.showToast('ไม่มีรายการที่มีผลต่าง ยอดตรงตามระบบทั้งหมด', 'info')
    close()
    return
  }

  // Stage changes via draft system
  if (typeof store.batchStocktake === 'function') {
    const result = store.batchStocktake(changedItems, true)
    if (!result?.ok && !result?.success) return
  } else {
    changedItems.forEach(item => {
      store.stockAdjust(
        item.materialId,
        item.newStock,
        'ตรวจนับสต็อกปิดร้าน (Stocktake)',
        `ตรวจนับสต็อกปิดร้าน (ปรับแก้ ${item.diff > 0 ? '+' : ''}${item.diff.toLocaleString()})`,
        true
      )
    })
    store.showToast(`เพิ่มผลตรวจนับ ${changedItems.length} รายการ เข้าแบบร่างเรียบร้อย (รอยืนยันที่แถบด้านล่าง)`, 'success')
  }

  close()
}
</script>
