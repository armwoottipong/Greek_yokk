<template>
  <div
    v-if="store.modals.activityLog?.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <!-- Modal Card Container: Focused max-w-2xl if specific item, max-w-3xl if overview -->
    <div
      :class="[
        'bg-white rounded-2xl border border-stone-200/80 shadow-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150',
        isItemMode ? 'max-w-2xl' : 'max-w-3xl'
      ]"
    >
      <!-- ======================================================= -->
      <!-- CASE A: SPECIFIC ITEM HISTORY (แสดงเฉพาะรายการที่กดดู) -->
      <!-- ======================================================= -->
      <template v-if="isItemMode">
        <!-- Item Clean Header -->
        <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 flex items-center justify-center text-2xl shadow-2xs shrink-0">
              {{ activeTargetMaterial?.emoji || '📦' }}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-stone-900 truncate">
                  {{ activeTargetMaterial?.name }}
                </h3>
                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-500 shrink-0">
                  {{ activeTargetMaterial?.id }}
                </span>
              </div>
              <p class="text-xs text-stone-500 mt-0.5 flex items-center gap-2">
                <span>คงเหลือปัจจุบัน: <strong class="text-stone-900 font-number">{{ Number(activeTargetMaterial?.stock || 0).toLocaleString() }} {{ activeTargetMaterial?.unit }}</strong></span>
                <span v-if="activeTargetMaterial?.packUnit && activeTargetMaterial?.packSize > 1" class="text-stone-400">
                  (≈ {{ ((activeTargetMaterial?.stock || 0) / activeTargetMaterial?.packSize).toFixed(1) }} {{ activeTargetMaterial?.packUnit }})
                </span>
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <!-- Export CSV -->
            <button
              @click="exportCsv"
              :disabled="filteredLogs.length === 0"
              class="px-2.5 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="ดาวน์โหลดประวัติของรายการนี้เป็นไฟล์ CSV"
            >
              <Download class="w-3.5 h-3.5 text-stone-500" />
              <span class="hidden sm:inline">CSV</span>
            </button>

            <!-- Close Button -->
            <button
              @click="close"
              class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Clean Toolbar for this Item Only (No cross-module dropdowns) -->
        <div class="px-6 py-2.5 bg-[#FAF9F6] border-b border-stone-100 flex items-center justify-between gap-3 shrink-0">
          <!-- Filter Pills (Only relevant to this item) -->
          <div class="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <button
              @click="itemActionFilter = 'all'"
              :class="[
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px]',
                itemActionFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs font-semibold'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/60'
              ]"
            >
              ทั้งหมด ({{ itemAllLogs.length }})
            </button>

            <button
              v-if="itemStockInLogs.length > 0"
              @click="itemActionFilter = 'stock_in'"
              :class="[
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px] flex items-center gap-1',
                itemActionFilter === 'stock_in'
                  ? 'bg-emerald-800 text-white shadow-2xs font-semibold'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-200/60'
              ]"
            >
              <span>📥 รับเข้า</span>
              <span class="font-number text-[10px]">({{ itemStockInLogs.length }})</span>
            </button>

            <button
              v-if="itemAdjustLogs.length > 0"
              @click="itemActionFilter = 'adjust'"
              :class="[
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px] flex items-center gap-1',
                itemActionFilter === 'adjust'
                  ? 'bg-amber-800 text-white shadow-2xs font-semibold'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-200/60'
              ]"
            >
              <span>⚖️ ตรวจนับจริง</span>
              <span class="font-number text-[10px]">({{ itemAdjustLogs.length }})</span>
            </button>

            <button
              v-if="itemProduceLogs.length > 0"
              @click="itemActionFilter = 'produce'"
              :class="[
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px] flex items-center gap-1',
                itemActionFilter === 'produce'
                  ? 'bg-purple-800 text-white shadow-2xs font-semibold'
                  : 'bg-white text-purple-800 hover:bg-purple-50 border border-purple-200/60'
              ]"
            >
              <span>🥣 ผลิต/ใช้ผลิต</span>
              <span class="font-number text-[10px]">({{ itemProduceLogs.length }})</span>
            </button>
          </div>

          <!-- Quick Search within this item -->
          <div class="relative w-40 sm:w-52 shrink-0">
            <Search class="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาในประวัตินี้..."
              class="soft-input w-full pl-8 pr-2.5 py-1 rounded-lg text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>
      </template>

      <!-- ======================================================= -->
      <!-- CASE B: GLOBAL OVERVIEW (เมื่อเปิดจากแถบบนสุด Header) -->
      <!-- ======================================================= -->
      <template v-else>
        <!-- Overview Header -->
        <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center text-lg border border-amber-200/60 shadow-2xs">
              📜
            </div>
            <div>
              <h3 class="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>ประวัติกิจกรรม & บันทึกการจัดการ</span>
                <span class="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-number">
                  {{ filteredLogs.length }} รายการ
                </span>
              </h3>
              <p class="text-[11px] text-stone-400 mt-0.5">
                ตรวจสอบประวัติการรับเข้า ตรวจนับสต็อกจริง ผลิตตามสูตร และการขายทั้งหมด
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="exportCsv"
              :disabled="filteredLogs.length === 0"
              class="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
              title="ดาวน์โหลดประวัติเป็นไฟล์ CSV"
            >
              <Download class="w-3.5 h-3.5 text-stone-500" />
              <span class="hidden sm:inline">ส่งออก CSV</span>
            </button>

            <button
              @click="close"
              class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Clean Module Tabs -->
        <div class="px-6 pt-3 border-b border-stone-100 bg-[#FAF9F6] shrink-0">
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2.5 text-xs font-medium">
            <button
              v-for="tab in moduleTabs"
              :key="tab.id"
              @click="activeModule = tab.id"
              :class="[
                'px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
                activeModule === tab.id
                  ? 'bg-stone-900 text-white shadow-xs font-semibold'
                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200/60'
              ]"
            >
              <span>{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
              <span
                :class="[
                  'text-[10px] px-1.5 py-0.2 rounded-full font-number',
                  activeModule === tab.id ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'
                ]"
              >
                {{ tab.count }}
              </span>
            </button>
          </div>
        </div>

        <!-- Clean Search & Date Toolbar -->
        <div class="px-6 py-2.5 bg-white border-b border-stone-100 flex items-center justify-between gap-3 shrink-0 text-xs">
          <div class="relative flex-1 max-w-sm">
            <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาชื่อวัตถุดิบ, เหตุผล, หมายเหตุ..."
              class="soft-input w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <select
              v-model="dateFilter"
              class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700"
            >
              <option value="all">ทุกช่วงเวลา</option>
              <option value="today">วันนี้</option>
              <option value="week">7 วันล่าสุด</option>
              <option value="month">30 วันล่าสุด</option>
            </select>
          </div>
        </div>
      </template>

      <!-- ======================================================= -->
      <!-- LOG LIST (Shared Clean Card List) -->
      <!-- ======================================================= -->
      <div class="overflow-y-auto flex-1 p-5 space-y-2.5 text-xs bg-[#FAF9F6]">
        <!-- Empty State -->
        <div v-if="filteredLogs.length === 0" class="py-12 text-center bg-white rounded-2xl border border-stone-200/60 p-6">
          <div class="text-3xl mb-2">📜</div>
          <p class="text-xs font-semibold text-stone-700">
            {{ isItemMode ? `ยังไม่มีประวัติการเคลื่อนไหวของ ${activeTargetMaterial?.name}` : 'ไม่พบประวัติกิจกรรมตามเงื่อนไขที่เลือก' }}
          </p>
          <p class="text-[11px] text-stone-400 mt-1">
            {{ isItemMode ? 'เมื่อมีการรับเข้า ปรับยอดนับจริง หรือผลิต รายการจะถูกบันทึกที่นี่อัตโนมัติ' : 'ลองเปลี่ยนคำค้นหา หรือเลือกดูช่วงเวลาอื่น' }}
          </p>
          <button
            v-if="searchQuery || (isItemMode && itemActionFilter !== 'all') || (!isItemMode && (dateFilter !== 'all' || activeModule !== 'all'))"
            @click="resetFilters"
            class="mt-3 px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
          >
            ล้างตัวกรอง
          </button>
        </div>

        <!-- Log Item Cards -->
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="bg-white p-3.5 rounded-xl border border-stone-200/70 shadow-2xs hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <!-- Left Info -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <span class="text-xl shrink-0 mt-0.5">
              {{ log.targetEmoji || getActionIcon(log.action) }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-1.5 mb-1">
                <!-- Action Badge -->
                <span
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0"
                  :class="getActionBadgeClass(log.action)"
                >
                  <span>{{ getActionIcon(log.action) }}</span>
                  <span>{{ log.title }}</span>
                </span>

                <!-- Target Name (Only show in Overview mode) -->
                <span v-if="!isItemMode && log.targetName" class="font-bold text-stone-900 truncate">
                  {{ log.targetName }}
                </span>

                <!-- User/Operator -->
                <span v-if="log.user" class="text-[10px] text-stone-400 shrink-0">
                  • {{ log.user }}
                </span>
              </div>

              <!-- Movement Description / Stock transition -->
              <p class="text-xs text-stone-700">
                <span v-if="log.beforeStock !== null && log.afterStock !== null" class="font-medium text-stone-500">
                  {{ log.beforeStock.toLocaleString() }} ➔ <strong class="text-stone-900">{{ log.afterStock.toLocaleString() }}</strong> {{ log.unit }}:
                </span>
                <span class="text-stone-600 ml-1">{{ log.description }}</span>
              </p>

              <!-- Reason & Note tags -->
              <div v-if="log.reason || log.note" class="flex flex-wrap items-center gap-1.5 mt-1.5 text-[10px]">
                <span
                  v-if="log.reason"
                  class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium"
                >
                  เหตุผล: {{ log.reason }}
                </span>
                <span
                  v-if="log.note"
                  class="text-stone-400 italic truncate max-w-sm"
                >
                  "{{ log.note }}"
                </span>
              </div>
            </div>
          </div>

          <!-- Right: Delta Badge & Timestamp -->
          <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 shrink-0 pl-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
            <!-- Delta Badge -->
            <div class="font-number font-bold text-xs">
              <span
                v-if="log.delta > 0"
                class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/50"
              >
                +{{ log.delta.toLocaleString() }} {{ log.unit }}
              </span>
              <span
                v-else-if="log.delta < 0"
                class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/50"
              >
                {{ log.delta.toLocaleString() }} {{ log.unit }}
              </span>
              <span
                v-else
                class="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-600"
              >
                0 {{ log.unit }}
              </span>
            </div>

            <!-- Timestamp -->
            <span class="text-[10px] text-stone-400 font-mono" :title="log.timestamp">
              {{ formatTime(log.timestamp) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-3 border-t border-stone-100 bg-white flex items-center justify-between shrink-0 text-xs text-stone-500">
        <div>
          <span>แสดง {{ filteredLogs.length }} รายการ</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            v-if="!isItemMode"
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
import { usePosStore } from '@/stores/posStore'
import {
  X,
  Search,
  Download
} from 'lucide-vue-next'

const store = usePosStore()

// State for overview mode
const activeModule = ref('all') // 'all' | 'stock' | 'pos' | 'menu' | 'system'
const dateFilter = ref('all') // 'all' | 'today' | 'week' | 'month'

// State for item mode
const itemActionFilter = ref('all') // 'all' | 'stock_in' | 'adjust' | 'produce'

// Shared state
const searchQuery = ref('')

const activeTargetMaterialId = computed(() => {
  return store.modals.activityLog?.targetMaterialId || null
})

const activeTargetMaterial = computed(() => {
  if (!activeTargetMaterialId.value) return null
  return store.materials.find(m => m.id === activeTargetMaterialId.value) || store.matMap[activeTargetMaterialId.value] || null
})

const isItemMode = computed(() => {
  return Boolean(activeTargetMaterialId.value && activeTargetMaterial.value)
})

// Item-specific all logs
const itemAllLogs = computed(() => {
  if (!activeTargetMaterialId.value) return []
  const id = activeTargetMaterialId.value
  return (store.activityLogs || []).filter(l => l.targetId === id || l.materialId === id)
})

const itemStockInLogs = computed(() => {
  return itemAllLogs.value.filter(l => l.action === 'stock_in')
})

const itemAdjustLogs = computed(() => {
  return itemAllLogs.value.filter(l => l.action === 'adjust' || (l.action && l.action.startsWith('stock_adjust')))
})

const itemProduceLogs = computed(() => {
  return itemAllLogs.value.filter(l => l.action === 'produce' || l.action === 'produce_deduct' || (l.action && l.action.startsWith('produce')))
})

watch(() => store.modals.activityLog?.isOpen, (open) => {
  if (open) {
    itemActionFilter.value = 'all'
    dateFilter.value = 'all'
    searchQuery.value = ''
    if (store.modals.activityLog.module) {
      activeModule.value = store.modals.activityLog.module
    } else {
      activeModule.value = 'all'
    }
  }
})

function close() {
  store.closeActivityLog()
}

function resetFilters() {
  itemActionFilter.value = 'all'
  activeModule.value = 'all'
  dateFilter.value = 'all'
  searchQuery.value = ''
}

// Module Tabs Definition for Overview mode
const moduleTabs = computed(() => {
  const allLogs = store.activityLogs || []
  const countModule = (mod) => allLogs.filter(l => l.module === mod).length
  return [
    { id: 'all', label: 'ภาพรวมทั้งหมด', icon: '📋', count: allLogs.length },
    { id: 'stock', label: 'คลังวัตถุดิบ & สต็อก', icon: '📦', count: countModule('stock') },
    { id: 'pos', label: 'แคชเชียร์ & ออเดอร์', icon: '🛒', count: countModule('pos') },
    { id: 'menu', label: 'เมนู & Add-on', icon: '🍽️', count: countModule('menu') + countModule('addon') },
    { id: 'system', label: 'ระบบ & ซิงค์', icon: '⚙️', count: countModule('system') }
  ]
})

// Filtered Logs
const filteredLogs = computed(() => {
  let list = []

  if (isItemMode.value) {
    // 1. In Item Mode: Start with all logs for this specific item
    list = itemAllLogs.value

    // Filter by item action pill
    if (itemActionFilter.value === 'stock_in') {
      list = list.filter(l => l.action === 'stock_in')
    } else if (itemActionFilter.value === 'adjust') {
      list = list.filter(l => l.action === 'adjust' || (l.action && l.action.startsWith('stock_adjust')))
    } else if (itemActionFilter.value === 'produce') {
      list = list.filter(l => l.action === 'produce' || l.action === 'produce_deduct' || (l.action && l.action.startsWith('produce')))
    }
  } else {
    // 2. In Overview Mode: Start with all logs
    list = store.activityLogs || []

    // Filter by Module
    if (activeModule.value !== 'all') {
      if (activeModule.value === 'menu') {
        list = list.filter(l => l.module === 'menu' || l.module === 'addon')
      } else {
        list = list.filter(l => l.module === activeModule.value)
      }
    }

    // Date Filter
    if (dateFilter.value !== 'all') {
      const now = new Date()
      list = list.filter(l => {
        const logDate = new Date(l.timestamp)
        const diffMs = now - logDate
        if (dateFilter.value === 'today') {
          return logDate.toDateString() === now.toDateString()
        } else if (dateFilter.value === 'week') {
          return diffMs <= 7 * 24 * 60 * 60 * 1000
        } else if (dateFilter.value === 'month') {
          return diffMs <= 30 * 24 * 60 * 60 * 1000
        }
        return true
      })
    }
  }

  // Common Search Filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(l => {
      return (
        (l.targetName && l.targetName.toLowerCase().includes(q)) ||
        (l.title && l.title.toLowerCase().includes(q)) ||
        (l.description && l.description.toLowerCase().includes(q)) ||
        (l.reason && l.reason.toLowerCase().includes(q)) ||
        (l.note && l.note.toLowerCase().includes(q)) ||
        (l.targetId && l.targetId.toLowerCase().includes(q)) ||
        (l.user && l.user.toLowerCase().includes(q))
      )
    })
  }

  return list
})

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
    case 'delete':
      return 'bg-rose-50 text-rose-800 border border-rose-200/60'
    default:
      return 'bg-stone-100 text-stone-700 border border-stone-200/60'
  }
}

function formatTime(isoString) {
  if (!isoString) return ''
  const d = new Date(isoString)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  if (isToday) {
    return `วันนี้ ${timeStr} น.`
  }
  const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
  return `${dateStr} ${timeStr}`
}

function exportCsv() {
  const headers = ['วันที่-เวลา', 'ประเภทกิจกรรม', 'รายการ', 'การเปลี่ยนแปลง', 'หน่วย', 'ก่อนปรับ', 'หลังปรับ', 'เหตุผล', 'หมายเหตุ', 'ผู้ทำรายการ']
  const rows = filteredLogs.value.map(l => [
    `"${l.timestamp}"`,
    `"${l.title}"`,
    `"${l.targetName || ''}"`,
    l.delta !== null ? l.delta : '',
    `"${l.unit || ''}"`,
    l.beforeStock !== null ? l.beforeStock : '',
    l.afterStock !== null ? l.afterStock : '',
    `"${l.reason || ''}"`,
    `"${l.note || ''}"`,
    `"${l.user || ''}"`
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const itemName = isItemMode.value && activeTargetMaterial.value ? `_${activeTargetMaterial.value.name.replace(/\s+/g, '_')}` : '_all'
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
