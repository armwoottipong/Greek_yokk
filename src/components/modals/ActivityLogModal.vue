<template>
  <div
    v-if="store.modals.activityLog?.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <!-- Modal Container -->
    <div
      :class="[
        'bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150',
        isItemMode ? 'max-w-2xl' : 'max-w-3xl'
      ]"
    >
      <!-- ======================================================= -->
      <!-- 1. TOP HEADER & UNIFIED CLEAN TOOLBAR                   -->
      <!-- ======================================================= -->
      <div class="px-5 sm:px-6 py-4 border-b border-stone-100 bg-white shrink-0">
        <!-- Row 1: Title & Main Quick Controls -->
        <div class="flex items-center justify-between gap-3">
          <!-- Case A: Item Mode Title -->
          <div v-if="isItemMode" class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 flex items-center justify-center text-2xl shadow-2xs shrink-0">
              {{ activeTargetMaterial?.emoji || '📦' }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-sm sm:text-base font-bold text-stone-900 truncate">
                  {{ activeTargetMaterial?.name }}
                </h3>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 shrink-0">
                  {{ activeTargetMaterial?.id }}
                </span>
              </div>
              <p class="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                <span>คงเหลือปัจจุบัน: <strong class="text-stone-900 font-number">{{ formatNum(activeTargetMaterial?.stock) }} {{ activeTargetMaterial?.unit }}</strong></span>
                <span v-if="activeTargetMaterial?.packUnit && activeTargetMaterial?.packSize > 1" class="text-stone-400">
                  (≈ {{ ((activeTargetMaterial?.stock || 0) / activeTargetMaterial?.packSize).toFixed(1) }} {{ activeTargetMaterial?.packUnit }})
                </span>
              </p>
            </div>
          </div>

          <!-- Case B: Stock Mode Title -->
          <div v-else-if="isStockMode" class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/60 flex items-center justify-center text-xl shadow-2xs shrink-0">
              📦
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                <span>ประวัติสต็อก (Stock History)</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-number">
                  {{ filteredLogs.length }} รายการ
                </span>
              </h3>
              <p class="text-xs text-stone-400 mt-0.5 truncate">
                บันทึกการรับเข้า ตรวจนับสต็อกจริง ผลิต และของเสียทั้งหมด
              </p>
            </div>
          </div>

          <!-- Case C: Global Overview Title -->
          <div v-else class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/60 flex items-center justify-center text-xl shadow-2xs shrink-0">
              📜
            </div>
            <div class="min-w-0">
              <h3 class="text-sm sm:text-base font-bold text-stone-900 flex items-center gap-2">
                <span>ประวัติกิจกรรมระบบ (Activity Log)</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-number">
                  {{ filteredLogs.length }} รายการ
                </span>
              </h3>
              <p class="text-xs text-stone-400 mt-0.5 truncate">
                ตรวจสอบประวัติการรับเข้า นับสต็อก ออเดอร์ขาย และกิจกรรมระบบ
              </p>
            </div>
          </div>

          <!-- Right Action Strip: Search, Filter Popover Trigger, CSV, Close -->
          <div class="flex items-center gap-2 shrink-0 relative">
            <!-- Search Input (Clean and always visible) -->
            <div class="relative w-36 sm:w-56">
              <Search class="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="ค้นหาประวัติ..."
                class="soft-input w-full pl-8 pr-7 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 font-medium"
              />
              <button
                v-if="searchQuery"
                @click="searchQuery = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded"
              >
                <X class="w-3 h-3" />
              </button>
            </div>

            <!-- Filter Popover Trigger Button -->
            <div class="relative">
              <button
                type="button"
                @click="toggleFilterPopover"
                class="relative p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center shrink-0"
                :class="[
                  showFilterPopover
                    ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                    : hasActiveFilter
                      ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border-transparent hover:text-stone-900'
                ]"
                title="เปิดแผงตัวกรอง (Filter)"
              >
                <Filter class="w-4 h-4" />
                <!-- Active Filter Count Dot/Badge -->
                <span
                  v-if="activeFilterCount > 0"
                  class="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-white shadow-2xs font-number"
                >
                  {{ activeFilterCount }}
                </span>
              </button>

              <!-- ======================================================= -->
              <!-- FLOATING FILTER POPOVER                                 -->
              <!-- ======================================================= -->
              <div
                v-if="showFilterPopover"
                v-click-outside="closeFilterPopover"
                class="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-stone-200 shadow-2xl z-30 p-4 space-y-4 animate-in fade-in zoom-in-95 duration-100"
              >
                <!-- Popover Header -->
                <div class="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div class="flex items-center gap-1.5 font-bold text-xs text-stone-900">
                    <Filter class="w-3.5 h-3.5 text-amber-800" />
                    <span>ตัวกรองประวัติ (Filter)</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button
                      v-if="hasActiveFilter"
                      type="button"
                      @click="resetFilters"
                      class="text-[11px] font-medium text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                    >
                      ล้างตัวกรอง
                    </button>
                    <button
                      type="button"
                      @click="closeFilterPopover"
                      class="text-stone-400 hover:text-stone-700 p-1 rounded-lg hover:bg-stone-100"
                    >
                      <X class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <!-- Section 1: Module Selector (Only for Global Overview) -->
                <div v-if="isGlobalMode" class="space-y-1.5">
                  <label class="text-[11px] font-semibold text-stone-500 block">หมวดหมู่ระบบ (Module)</label>
                  <div class="grid grid-cols-2 gap-1.5 text-xs">
                    <button
                      type="button"
                      v-for="m in moduleOptions"
                      :key="m.id"
                      @click="activeModule = m.id"
                      class="px-2.5 py-1.5 rounded-xl border text-left font-medium transition-all cursor-pointer flex items-center gap-1.5 truncate text-[11px]"
                      :class="activeModule === m.id ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'"
                    >
                      <span>{{ m.icon }}</span>
                      <span class="truncate">{{ m.label }}</span>
                    </button>
                  </div>
                </div>

                <!-- Section 2: Material Selector (When in Stock Mode) -->
                <div v-if="isStockMode" class="space-y-1.5">
                  <label class="text-[11px] font-semibold text-stone-500 block">เลือกวัตถุดิบเฉพาะ</label>
                  <select
                    v-model="selectedMaterialId"
                    class="soft-input w-full px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 border border-stone-200"
                  >
                    <option value="all">📦 ทุกวัตถุดิบ</option>
                    <option v-for="m in store.materials" :key="m.id" :value="m.id">
                      {{ m.emoji }} {{ m.name }}
                    </option>
                  </select>
                </div>

                <!-- Section 3: Action Type Filter -->
                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold text-stone-500 block">ประเภทการเคลื่อนไหว (Action)</label>
                  <div class="flex items-center gap-1.5 flex-wrap text-[11px]">
                    <button
                      type="button"
                      v-for="act in availableActionOptions"
                      :key="act.id"
                      @click="selectedActionFilter = act.id"
                      class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer font-medium flex items-center gap-1"
                      :class="selectedActionFilter === act.id ? 'bg-stone-900 text-white border-stone-900 shadow-2xs font-semibold' : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'"
                    >
                      <span>{{ act.icon }}</span>
                      <span>{{ act.label }}</span>
                    </button>
                  </div>
                </div>

                <!-- Section 4: Interactive Date Range Calendar -->
                <div class="space-y-1.5">
                  <label class="text-[11px] font-semibold text-stone-500 block">ช่วงวันที่ (Date Range)</label>
                  <DateRangeCalendar
                    v-model:startDate="filterStartDate"
                    v-model:endDate="filterEndDate"
                  />
                </div>

                <!-- Popover Footer Action -->
                <div class="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span class="text-[11px] text-stone-400 font-number">
                    พบ {{ filteredLogs.length }} รายการ
                  </span>
                  <button
                    type="button"
                    @click="closeFilterPopover"
                    class="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    ดูผลลัพธ์
                  </button>
                </div>
              </div>
            </div>

            <!-- Export CSV Button -->
            <button
              type="button"
              @click="exportCsv"
              :disabled="filteredLogs.length === 0"
              class="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40 shrink-0"
              title="ดาวน์โหลดประวัติเป็นไฟล์ CSV"
            >
              <Download class="w-4 h-4 text-stone-500" />
              <span class="hidden sm:inline">CSV</span>
            </button>

            <!-- Close Modal Button -->
            <button
              type="button"
              @click="close"
              class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              title="ปิดหน้าต่าง"
            >
              <X class="w-5 h-5" />
            </button>
          </div>
        </div>

        <!-- Row 2: Active Filter Pills (Shown only when filters are active) -->
        <div v-if="hasActiveFilter" class="flex items-center gap-1.5 flex-wrap pt-2.5 mt-2 border-t border-stone-100 text-[11px]">
          <span class="text-stone-400 text-[10px] font-semibold">ตัวกรองที่เลือก:</span>

          <!-- Module Chip -->
          <span
            v-if="isGlobalMode && activeModule !== 'all'"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 font-medium"
          >
            <span>{{ getModuleLabel(activeModule) }}</span>
            <button @click="activeModule = 'all'" class="hover:text-rose-600"><X class="w-3 h-3" /></button>
          </span>

          <!-- Material Chip -->
          <span
            v-if="isStockMode && selectedMaterialId !== 'all'"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-stone-100 text-stone-800 font-medium"
          >
            <span>{{ getMaterialName(selectedMaterialId) }}</span>
            <button @click="selectedMaterialId = 'all'" class="hover:text-rose-600"><X class="w-3 h-3" /></button>
          </span>

          <!-- Action Chip -->
          <span
            v-if="selectedActionFilter !== 'all'"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100/70 text-amber-900 font-medium"
          >
            <span>{{ getActionLabel(selectedActionFilter) }}</span>
            <button @click="selectedActionFilter = 'all'" class="hover:text-rose-600"><X class="w-3 h-3" /></button>
          </span>

          <!-- Date Range Chip -->
          <span
            v-if="filterStartDate || filterEndDate"
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100/70 text-amber-900 font-medium"
          >
            <span>📅 {{ formatDateRangeLabel(filterStartDate, filterEndDate) }}</span>
            <button @click="clearDateRange" class="hover:text-rose-600"><X class="w-3 h-3" /></button>
          </span>

          <!-- Clear All -->
          <button
            type="button"
            @click="resetFilters"
            class="text-[10px] text-rose-600 hover:text-rose-800 hover:underline font-medium ml-1 cursor-pointer"
          >
            ล้างทั้งหมด
          </button>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- 2. LOG LIST (Grouped by Date, Minimalist Clean Cards)   -->
      <!-- ======================================================= -->
      <div class="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6 text-xs bg-[#FAF9F6]">
        <!-- Empty State -->
        <div v-if="filteredLogs.length === 0" class="py-16 text-center bg-white rounded-3xl border border-stone-200/60 p-6 shadow-2xs">
          <div class="text-4xl mb-3">📜</div>
          <p class="text-sm font-bold text-stone-800">
            {{ isItemMode ? `ยังไม่มีประวัติการเคลื่อนไหวของ ${activeTargetMaterial?.name}` : 'ไม่พบประวัติกิจกรรมตามเงื่อนไขที่เลือก' }}
          </p>
          <p class="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
            {{ isItemMode ? 'เมื่อมีการรับเข้า ปรับยอดนับจริง หรือผลิต รายการจะถูกบันทึกที่นี่อัตโนมัติ' : 'ลองเปลี่ยนคำค้นหา หรือเลือกปรับช่วงวันใหม่ในแผงตัวกรอง' }}
          </p>
          <button
            v-if="hasActiveFilter"
            @click="resetFilters"
            class="mt-4 px-4 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>

        <!-- Date Groups -->
        <div
          v-for="group in groupedLogs"
          :key="group.dateKey"
          class="space-y-2.5"
        >
          <!-- Date Group Sticky Header -->
          <div class="flex items-center justify-between sticky top-0 z-10 py-1 bg-[#FAF9F6]/90 backdrop-blur-xs">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-amber-700"></span>
              <h4 class="text-xs font-bold text-stone-800 tracking-tight">
                {{ group.dateLabel }}
              </h4>
            </div>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-stone-200/70 text-stone-600 font-number font-semibold">
              {{ group.items.length }} รายการ
            </span>
          </div>

          <!-- Log Item Cards in this group -->
          <div class="space-y-2">
            <div
              v-for="log in group.items"
              :key="log.id"
              class="bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200/70 shadow-2xs hover:border-stone-300 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <!-- Left Content Area -->
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <!-- Emoji Avatar -->
                <div class="w-9 h-9 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center text-lg shrink-0 mt-0.5">
                  {{ log.targetEmoji || getActionIcon(log.action) }}
                </div>

                <div class="min-w-0 flex-1 space-y-1">
                  <!-- Row 1: Action Badge & Target Title -->
                  <div class="flex flex-wrap items-center gap-1.5">
                    <!-- Action Pill -->
                    <span
                      class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0"
                      :class="getActionBadgeClass(log.action)"
                    >
                      <span>{{ getActionIcon(log.action) }}</span>
                      <span>{{ log.title || 'กิจกรรม' }}</span>
                    </span>

                    <!-- Target Name -->
                    <span v-if="!isItemMode && log.targetName" class="font-bold text-stone-900 truncate text-xs">
                      {{ log.targetName }}
                    </span>

                    <!-- Operator -->
                    <span v-if="log.user" class="text-[10px] text-stone-400 shrink-0">
                      • {{ log.user }}
                    </span>
                  </div>

                  <!-- Row 2: Stock Transition / Description -->
                  <p class="text-xs text-stone-700 leading-relaxed">
                    <span v-if="hasStockTransition(log)" class="font-medium text-stone-500">
                      {{ formatNum(log.beforeStock) }} ➔ <strong class="text-stone-900">{{ formatNum(log.afterStock) }}</strong> {{ log.unit || '' }}:
                    </span>
                    <span class="text-stone-600 ml-0.5">{{ log.description || log.note || '' }}</span>
                  </p>

                  <!-- Row 3: Meta Badges (Reason, Expiry, Dates, Notes) -->
                  <div v-if="log.reason || log.receiveDate || log.expiryDate || log.note" class="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px]">
                    <span
                      v-if="log.receiveDate"
                      class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium font-number"
                      :title="`วันที่รับเข้าหรือผลิต: ${log.receiveDate}`"
                    >
                      📅 {{ formatThaiDate(log.receiveDate) }}
                    </span>
                    <span
                      v-if="log.expiryDate"
                      class="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium font-number"
                      :title="`วันหมดอายุ: ${log.expiryDate}`"
                    >
                      ⏳ หมดอายุ: {{ formatThaiDate(log.expiryDate) }}
                    </span>
                    <span
                      v-if="log.reason"
                      class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium"
                    >
                      เหตุผล: {{ log.reason }}
                    </span>
                    <span
                      v-if="log.note && log.note !== log.description"
                      class="text-stone-400 italic truncate max-w-sm"
                    >
                      "{{ log.note }}"
                    </span>
                  </div>
                </div>
              </div>

              <!-- Right Content Area: Delta Badge & Timestamp -->
              <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                <!-- Delta Badge -->
                <div v-if="hasDelta(log)" class="font-number font-bold text-xs">
                  <span
                    v-if="Number(log.delta) > 0"
                    class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/50"
                  >
                    +{{ formatNum(log.delta) }} {{ log.unit || '' }}
                  </span>
                  <span
                    v-else-if="Number(log.delta) < 0"
                    class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/50"
                  >
                    {{ formatNum(log.delta) }} {{ log.unit || '' }}
                  </span>
                </div>
                <div v-else class="text-[10px] text-stone-400 font-number">
                  -
                </div>

                <!-- Time of day -->
                <span class="text-[10px] text-stone-400 font-mono" :title="log.timestamp || ''">
                  {{ formatTimeOfDay(log.timestamp) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ======================================================= -->
      <!-- 3. FOOTER BAR                                           -->
      <!-- ======================================================= -->
      <div class="px-6 py-3 border-t border-stone-100 bg-white flex items-center justify-between shrink-0 text-xs text-stone-500">
        <div>
          <span>แสดง <strong class="text-stone-800 font-number">{{ filteredLogs.length }}</strong> รายการ</span>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="!isItemMode"
            type="button"
            @click="confirmClearLogs"
            :disabled="(store.activityLogs || []).length === 0"
            class="text-[11px] text-rose-600 hover:text-rose-800 hover:underline px-2 py-1 transition-colors cursor-pointer disabled:opacity-30"
          >
            ล้างประวัติทั้งหมด
          </button>
          <button
            type="button"
            @click="close"
            class="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold shadow-xs transition-colors cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore, formatThaiDate } from '@/stores/posStore'
import DateRangeCalendar from '@/components/ui/DateRangeCalendar.vue'
import {
  X,
  Search,
  Download,
  Filter
} from 'lucide-vue-next'

const store = usePosStore()

// Popover state
const showFilterPopover = ref(false)

function toggleFilterPopover() {
  showFilterPopover.value = !showFilterPopover.value
}

function closeFilterPopover() {
  showFilterPopover.value = false
}

// Click outside directive for popover
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutsideHandler = (event) => {
      if (!el.contains(event.target) && !event.target.closest('[title="เปิดแผงตัวกรอง (Filter)"]')) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutsideHandler)
  },
  unmounted(el) {
    if (el._clickOutsideHandler) {
      document.removeEventListener('click', el._clickOutsideHandler)
    }
  }
}

// Filter States
const searchQuery = ref('')
const activeModule = ref('all') // 'all' | 'stock' | 'pos' | 'menu' | 'system'
const selectedActionFilter = ref('all') // 'all' | 'stock_in' | 'adjust' | 'produce' | 'waste' | 'sale_deduct' etc.
const selectedMaterialId = ref('all')
const filterStartDate = ref(null) // 'YYYY-MM-DD'
const filterEndDate = ref(null) // 'YYYY-MM-DD'

// Active Target Material for single item mode
const activeTargetMaterialId = computed(() => {
  return store.modals.activityLog?.targetMaterialId || null
})

const activeTargetMaterial = computed(() => {
  if (!activeTargetMaterialId.value) return null
  return store.materials.find(m => m.id === activeTargetMaterialId.value) || store.matMap[activeTargetMaterialId.value] || null
})

// Modes
const isItemMode = computed(() => {
  return Boolean(activeTargetMaterialId.value && activeTargetMaterial.value)
})

const isStockMode = computed(() => {
  return !isItemMode.value && store.modals.activityLog?.module === 'stock'
})

const isGlobalMode = computed(() => {
  return !isItemMode.value && !isStockMode.value
})

// Options
const moduleOptions = [
  { id: 'all', label: 'ทั้งหมด', icon: '📋' },
  { id: 'stock', label: 'คลังสต็อก', icon: '📦' },
  { id: 'pos', label: 'แคชเชียร์/POS', icon: '🛒' },
  { id: 'menu', label: 'เมนู/ท็อปปิ้ง', icon: '🍽️' },
  { id: 'system', label: 'ระบบ/การตั้งค่า', icon: '⚙️' }
]

const availableActionOptions = computed(() => {
  if (isStockMode.value || isItemMode.value) {
    return [
      { id: 'all', label: 'ทุกกิจกรรม', icon: '✨' },
      { id: 'stock_in', label: 'รับเข้าสต็อก', icon: '📥' },
      { id: 'adjust', label: 'ตรวจนับจริง', icon: '⚖️' },
      { id: 'produce', label: 'ผลิตตามสูตร', icon: '🥣' },
      { id: 'waste', label: 'ของเสีย', icon: '🗑️' },
      { id: 'switch_lot', label: 'สลับล็อต', icon: '⚡' }
    ]
  }

  // Global mode actions
  return [
    { id: 'all', label: 'ทุกกิจกรรม', icon: '✨' },
    { id: 'stock_in', label: 'รับเข้าสต็อก', icon: '📥' },
    { id: 'adjust', label: 'ตรวจนับจริง', icon: '⚖️' },
    { id: 'produce', label: 'ผลิตตามสูตร', icon: '🥣' },
    { id: 'order_complete', label: 'ขายหน้าร้าน', icon: '🧾' },
    { id: 'waste', label: 'ของเสีย', icon: '🗑️' }
  ]
})

// Watch modal open
watch(() => store.modals.activityLog?.isOpen, (open) => {
  if (open) {
    showFilterPopover.value = false
    selectedActionFilter.value = 'all'
    selectedMaterialId.value = 'all'
    filterStartDate.value = null
    filterEndDate.value = null
    searchQuery.value = ''
    if (store.modals.activityLog.module) {
      activeModule.value = store.modals.activityLog.module
    } else {
      activeModule.value = 'all'
    }
  }
})

function close() {
  showFilterPopover.value = false
  store.closeActivityLog()
}

// Active Filter Checks
const hasActiveFilter = computed(() => {
  if (isItemMode.value) {
    return selectedActionFilter.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
  }
  if (isStockMode.value) {
    return selectedActionFilter.value !== 'all' || selectedMaterialId.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
  }
  return activeModule.value !== 'all' || selectedActionFilter.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
})

const activeFilterCount = computed(() => {
  let count = 0
  if (isGlobalMode.value && activeModule.value !== 'all') count++
  if (isStockMode.value && selectedMaterialId.value !== 'all') count++
  if (selectedActionFilter.value !== 'all') count++
  if (filterStartDate.value !== null || filterEndDate.value !== null) count++
  return count
})

function resetFilters() {
  activeModule.value = 'all'
  selectedActionFilter.value = 'all'
  selectedMaterialId.value = 'all'
  filterStartDate.value = null
  filterEndDate.value = null
  searchQuery.value = ''
}

function clearDateRange() {
  filterStartDate.value = null
  filterEndDate.value = null
}

function getModuleLabel(modId) {
  const opt = moduleOptions.find(o => o.id === modId)
  return opt ? `${opt.icon} ${opt.label}` : modId
}

function getMaterialName(matId) {
  const mat = store.materials.find(m => m.id === matId)
  return mat ? `${mat.emoji} ${mat.name}` : matId
}

function getActionLabel(actId) {
  const opt = availableActionOptions.value.find(o => o.id === actId)
  return opt ? `${opt.icon} ${opt.label}` : actId
}

function formatDateRangeLabel(start, end) {
  if (start && end) {
    if (start === end) return formatThaiDate(start)
    return `${formatThaiDate(start)} – ${formatThaiDate(end)}`
  }
  if (start) return `ตั้งแต่ ${formatThaiDate(start)}`
  if (end) return `ถึง ${formatThaiDate(end)}`
  return ''
}

// Filtered Logs
const filteredLogs = computed(() => {
  let list = store.activityLogs || []

  // 1. Context Filtering
  if (isItemMode.value) {
    const id = activeTargetMaterialId.value
    list = list.filter(l => l.targetId === id || l.materialId === id)
  } else if (isStockMode.value) {
    list = list.filter(l => l.module === 'stock')
    if (selectedMaterialId.value !== 'all') {
      list = list.filter(l => l.targetId === selectedMaterialId.value || l.materialId === selectedMaterialId.value)
    }
  } else {
    // Global Mode
    if (activeModule.value !== 'all') {
      if (activeModule.value === 'menu') {
        list = list.filter(l => l.module === 'menu' || l.module === 'addon')
      } else {
        list = list.filter(l => l.module === activeModule.value)
      }
    }
  }

  // 2. Action Type Filter
  if (selectedActionFilter.value !== 'all') {
    const act = selectedActionFilter.value
    if (act === 'adjust') {
      list = list.filter(l => l.action === 'adjust' || (l.action && String(l.action).startsWith('stock_adjust')))
    } else if (act === 'produce') {
      list = list.filter(l => l.action === 'produce' || l.action === 'produce_deduct' || (l.action && String(l.action).startsWith('produce')))
    } else {
      list = list.filter(l => l.action === act)
    }
  }

  // 3. Date Range Filter
  if (filterStartDate.value || filterEndDate.value) {
    list = list.filter(l => {
      if (!l.timestamp) return false
      const logDay = l.timestamp.slice(0, 10)
      if (filterStartDate.value && logDay < filterStartDate.value) return false
      if (filterEndDate.value && logDay > filterEndDate.value) return false
      return true
    })
  }

  // 4. Search Filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(l => {
      return (
        (l.targetName && String(l.targetName).toLowerCase().includes(q)) ||
        (l.title && String(l.title).toLowerCase().includes(q)) ||
        (l.description && String(l.description).toLowerCase().includes(q)) ||
        (l.reason && String(l.reason).toLowerCase().includes(q)) ||
        (l.note && String(l.note).toLowerCase().includes(q)) ||
        (l.targetId && String(l.targetId).toLowerCase().includes(q)) ||
        (l.user && String(l.user).toLowerCase().includes(q))
      )
    })
  }

  return list
})

// Group logs by date
const groupedLogs = computed(() => {
  const groups = {}
  const now = new Date()
  const todayStr = toDateString(now)
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  const yestStr = toDateString(yest)

  filteredLogs.value.forEach(log => {
    const dateKey = log.timestamp ? log.timestamp.slice(0, 10) : 'unknown'
    if (!groups[dateKey]) {
      let label = ''
      if (dateKey === todayStr) {
        label = 'วันนี้'
      } else if (dateKey === yestStr) {
        label = 'เมื่อวาน'
      } else if (dateKey !== 'unknown') {
        label = formatThaiDate(dateKey, true)
      } else {
        label = 'ไม่ระบุวันที่'
      }
      groups[dateKey] = {
        dateKey,
        dateLabel: label,
        items: []
      }
    }
    groups[dateKey].items.push(log)
  })

  return Object.values(groups)
})

function toDateString(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatTimeOfDay(isoString) {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
  } catch (e) {
    return ''
  }
}

// Helpers
function hasStockTransition(log) {
  return (
    log &&
    log.beforeStock !== null &&
    log.beforeStock !== undefined &&
    log.afterStock !== null &&
    log.afterStock !== undefined &&
    !isNaN(Number(log.beforeStock)) &&
    !isNaN(Number(log.afterStock))
  )
}

function hasDelta(log) {
  return (
    log &&
    log.delta !== null &&
    log.delta !== undefined &&
    log.delta !== '' &&
    !isNaN(Number(log.delta)) &&
    Number(log.delta) !== 0
  )
}

function formatNum(val) {
  if (val === null || val === undefined || val === '') return '0'
  const n = Number(val)
  return isNaN(n) ? String(val) : n.toLocaleString()
}

function getActionIcon(action) {
  switch (action) {
    case 'adjust':
    case 'stock_adjust_add':
    case 'stock_adjust_reduce':
      return '⚖️'
    case 'stock_in':
      return '📥'
    case 'produce':
    case 'produce_batch':
    case 'produce_deduct':
      return '🥣'
    case 'sale_deduct':
      return '🛍️'
    case 'order_complete':
      return '🧾'
    case 'waste':
      return '🗑️'
    case 'switch_lot':
      return '⚡'
    case 'create':
      return '✨'
    case 'edit':
      return '✏️'
    case 'delete':
      return '🗑️'
    case 'sync':
      return '☁️'
    default:
      return '•'
  }
}

function getActionBadgeClass(action) {
  switch (action) {
    case 'adjust':
    case 'stock_adjust_add':
    case 'stock_adjust_reduce':
      return 'bg-amber-50 text-amber-900 border border-amber-200/60'
    case 'stock_in':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
    case 'produce':
    case 'produce_batch':
    case 'produce_deduct':
      return 'bg-purple-50 text-purple-900 border border-purple-200/60'
    case 'sale_deduct':
    case 'order_complete':
      return 'bg-blue-50 text-blue-900 border border-blue-200/60'
    case 'waste':
    case 'delete':
      return 'bg-rose-50 text-rose-800 border border-rose-200/60'
    case 'switch_lot':
      return 'bg-amber-100 text-amber-900 border border-amber-300'
    default:
      return 'bg-stone-100 text-stone-700 border border-stone-200/60'
  }
}

function exportCsv() {
  const headers = ['วันที่-เวลา', 'ประเภทกิจกรรม', 'รายการ', 'การเปลี่ยนแปลง', 'หน่วย', 'ก่อนปรับ', 'หลังปรับ', 'เหตุผล', 'หมายเหตุ', 'ผู้ทำรายการ']
  const rows = filteredLogs.value.map(l => [
    `"${l.timestamp || ''}"`,
    `"${l.title || ''}"`,
    `"${l.targetName || ''}"`,
    hasDelta(l) ? formatNum(l.delta) : '',
    `"${l.unit || ''}"`,
    l.beforeStock !== null && l.beforeStock !== undefined ? formatNum(l.beforeStock) : '',
    l.afterStock !== null && l.afterStock !== undefined ? formatNum(l.afterStock) : '',
    `"${l.reason || ''}"`,
    `"${l.note || ''}"`,
    `"${l.user || ''}"`
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const itemName = isItemMode.value && activeTargetMaterial.value 
    ? `_${activeTargetMaterial.value.name.replace(/\s+/g, '_')}` 
    : isStockMode.value 
      ? '_stock' 
      : '_all'
  link.setAttribute('href', url)
  link.setAttribute('download', `greek_yogg_log${itemName}_${dateStr}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  store.showToast('ส่งออกไฟล์ CSV สำเร็จ', 'success')
}

async function confirmClearLogs() {
  const ok = await store.confirmDialog({
    title: 'ล้างประวัติกิจกรรมทั้งหมด?',
    message: 'ประวัติการรับเข้า ปรับยอดนับจริง และกิจกรรมทั้งหมดจะถูกล้างอย่างถาวร ยืนยันหรือไม่?',
    confirmText: 'ล้างประวัติ',
    cancelText: 'ยกเลิก',
    type: 'danger'
  })
  if (ok) {
    store.clearActivityLogs()
  }
}
</script>
