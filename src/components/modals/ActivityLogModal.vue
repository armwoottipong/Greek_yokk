<template>
  <div
    v-if="store.modals.activityLog?.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
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
              ตรวจสอบประวัติการรับเข้า ตรวจนับสต็อกจริง ผลิตตามสูตร และการขาย
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Export CSV -->
          <button
            @click="exportCsv"
            :disabled="filteredLogs.length === 0"
            class="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-950 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
            title="ดาวน์โหลดประวัติเป็นไฟล์ CSV"
          >
            <Download class="w-3.5 h-3.5 text-stone-500" />
            <span class="hidden sm:inline">ส่งออก CSV</span>
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

      <!-- Main Module Tabs (ภาพรวม vs แยก Module) -->
      <div class="px-6 pt-3 border-b border-stone-100 bg-[#FAF9F6] shrink-0">
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2.5 text-xs font-medium">
          <button
            v-for="tab in moduleTabs"
            :key="tab.id"
            @click="activeModule = tab.id"
            :class="[
              'px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer',
              activeModule === tab.id
                ? 'bg-stone-900 text-white shadow-xs font-semibold'
                : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 border border-stone-200/60'
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

      <!-- Context Banner (When filtered by specific material) -->
      <div
        v-if="activeTargetMaterialId && activeTargetMaterial"
        class="px-6 py-2 bg-amber-50/70 border-b border-amber-200/50 flex items-center justify-between text-xs text-amber-950 shrink-0"
      >
        <div class="flex items-center gap-2">
          <span>🔍</span>
          <span>กำลังแสดงประวัติเฉพาะ: <strong>{{ activeTargetMaterial.emoji }} {{ activeTargetMaterial.name }}</strong> ({{ activeTargetMaterial.id }})</span>
        </div>
        <button
          @click="clearMaterialFilter"
          class="text-amber-800 hover:text-amber-950 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <X class="w-3.5 h-3.5" />
          <span>ดูทุกรายการ</span>
        </button>
      </div>

      <!-- Sub-filter Toolbar & Mini KPI Cards -->
      <div class="p-6 pb-3 space-y-3 bg-white border-b border-stone-100 shrink-0">
        <!-- KPI Cards -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          <div class="p-2.5 rounded-xl bg-[#FAF9F6] border border-stone-200/50">
            <span class="text-[10px] text-stone-400 block mb-0.5">รวมประวัติทั้งหมด</span>
            <span class="text-base font-number font-bold text-stone-900">{{ filteredLogs.length }}</span>
            <span class="text-[10px] text-stone-400 ml-1">รายการ</span>
          </div>

          <div class="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200/50">
            <span class="text-[10px] text-amber-700 block mb-0.5 flex items-center gap-1">
              <span>⚖️</span> ปรับยอดนับจริง
            </span>
            <span class="text-base font-number font-bold text-amber-950">{{ kpiCounts.adjust }}</span>
            <span class="text-[10px] text-amber-600 ml-1">ครั้ง</span>
          </div>

          <div class="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200/50">
            <span class="text-[10px] text-emerald-700 block mb-0.5 flex items-center gap-1">
              <span>📥</span> รับเข้าสต็อก
            </span>
            <span class="text-base font-number font-bold text-emerald-950">{{ kpiCounts.stockIn }}</span>
            <span class="text-[10px] text-emerald-600 ml-1">ครั้ง</span>
          </div>

          <div class="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/50">
            <span class="text-[10px] text-purple-700 block mb-0.5 flex items-center gap-1">
              <span>🥣</span> ผลิตตามสูตร
            </span>
            <span class="text-base font-number font-bold text-purple-950">{{ kpiCounts.produce }}</span>
            <span class="text-[10px] text-purple-600 ml-1">ครั้ง</span>
          </div>
        </div>

        <!-- Filter Row -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
          <!-- Search box -->
          <div class="relative flex-1 min-w-[200px]">
            <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="ค้นหาตามชื่อวัตถุดิบ, เหตุผล, หมายเหตุ..."
              class="soft-input w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>

          <!-- Action filter dropdown -->
          <select
            v-model="selectedAction"
            class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 shrink-0"
          >
            <option value="all">ทุกประเภทกิจกรรม</option>
            <option value="adjust">⚖️ ปรับยอดนับจริง (Audit)</option>
            <option value="stock_in">📥 รับเข้าสต็อก (Stock In)</option>
            <option value="produce">🥣 ผลิตตามสูตร (Produce)</option>
            <option value="quick_adjust">⚡ ปรับสต็อกด่วน (+ / -)</option>
            <option value="sale_deduct">🛍️ ตัดสต็อกขาย (Sale Deduct)</option>
            <option value="order_complete">🧾 ขายหน้าร้าน (POS Order)</option>
          </select>

          <!-- Material filter dropdown -->
          <select
            v-if="activeModule === 'all' || activeModule === 'stock'"
            v-model="selectedMaterialId"
            class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 shrink-0 max-w-[180px]"
          >
            <option value="all">ทุกวัตถุดิบ</option>
            <option
              v-for="m in store.materials"
              :key="m.id"
              :value="m.id"
            >
              {{ m.emoji }} {{ m.name }}
            </option>
          </select>

          <!-- Date filter -->
          <select
            v-model="dateFilter"
            class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-700 shrink-0"
          >
            <option value="all">ทุกช่วงเวลา</option>
            <option value="today">วันนี้</option>
            <option value="week">7 วันล่าสุด</option>
            <option value="month">30 วันล่าสุด</option>
          </select>
        </div>
      </div>

      <!-- Logs Content Area -->
      <div class="overflow-y-auto flex-1 p-6 space-y-2.5 text-xs bg-[#FAF9F6]">
        <!-- Empty State -->
        <div v-if="filteredLogs.length === 0" class="py-14 text-center bg-white rounded-2xl border border-stone-200/60 p-6">
          <div class="text-3xl mb-2">🔍</div>
          <p class="text-xs font-semibold text-stone-700">ไม่พบประวัติกิจกรรมตามเงื่อนไขที่เลือก</p>
          <p class="text-[11px] text-stone-400 mt-1">ลองเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
          <button
            @click="resetFilters"
            class="mt-3 px-3 py-1.5 text-[11px] font-medium text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors cursor-pointer"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>

        <!-- Log Item Card -->
        <div
          v-for="log in filteredLogs"
          :key="log.id"
          class="bg-white p-3.5 rounded-xl border border-stone-200/70 shadow-2xs hover:border-stone-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <!-- Left: Icon, Action Badge, Target & Details -->
          <div class="flex items-start gap-3 min-w-0 flex-1">
            <span class="text-xl shrink-0 mt-0.5">{{ log.targetEmoji || getModuleIcon(log.module) }}</span>
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

                <!-- Target Name -->
                <span class="font-bold text-stone-900 truncate">
                  {{ log.targetName }}
                </span>

                <!-- Operator -->
                <span v-if="log.user" class="text-[10px] text-stone-400 shrink-0">
                  • {{ log.user }}
                </span>
              </div>

              <!-- Movement Numbers / Description -->
              <p class="text-xs text-stone-600">
                {{ log.description }}
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

          <!-- Right: Delta Pill & Timestamp -->
          <div class="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
            <!-- Numeric Delta Pill -->
            <div v-if="log.delta !== null && log.delta !== undefined" class="font-number font-bold text-xs mb-1">
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
          <span>แสดง {{ filteredLogs.length }} จาก {{ (store.activityLogs || []).length }} รายการ</span>
        </div>
        <div class="flex items-center gap-2">
          <button
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
            ปิดหน้าต่าง
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
  Download,
  Trash2
} from 'lucide-vue-next'

const store = usePosStore()

const activeModule = ref('all') // 'all' | 'stock' | 'pos' | 'menu' | 'system'
const selectedAction = ref('all')
const selectedMaterialId = ref('all')
const dateFilter = ref('all') // 'all' | 'today' | 'week' | 'month'
const searchQuery = ref('')

const activeTargetMaterialId = computed(() => {
  return store.modals.activityLog?.targetMaterialId || null
})

const activeTargetMaterial = computed(() => {
  if (!activeTargetMaterialId.value) return null
  return store.materials.find(m => m.id === activeTargetMaterialId.value)
})

watch(() => store.modals.activityLog?.isOpen, (open) => {
  if (open) {
    if (store.modals.activityLog.module) {
      activeModule.value = store.modals.activityLog.module
    }
    if (store.modals.activityLog.targetMaterialId) {
      selectedMaterialId.value = store.modals.activityLog.targetMaterialId
    } else {
      selectedMaterialId.value = 'all'
    }
    selectedAction.value = 'all'
    dateFilter.value = 'all'
    searchQuery.value = ''
  }
})

function close() {
  store.closeActivityLog()
}

function clearMaterialFilter() {
  if (store.modals.activityLog) {
    store.modals.activityLog.targetMaterialId = null
  }
  selectedMaterialId.value = 'all'
}

function resetFilters() {
  activeModule.value = 'all'
  selectedAction.value = 'all'
  selectedMaterialId.value = 'all'
  dateFilter.value = 'all'
  searchQuery.value = ''
  if (store.modals.activityLog) {
    store.modals.activityLog.targetMaterialId = null
  }
}

// Module Tabs Definition
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

// KPI Counters
const kpiCounts = computed(() => {
  const logs = filteredLogs.value
  return {
    adjust: logs.filter(l => l.action === 'adjust').length,
    stockIn: logs.filter(l => l.action === 'stock_in').length,
    produce: logs.filter(l => l.action === 'produce').length
  }
})

// Filtered Logs
const filteredLogs = computed(() => {
  let list = store.activityLogs || []

  // 1. Filter by Module
  if (activeModule.value !== 'all') {
    if (activeModule.value === 'menu') {
      list = list.filter(l => l.module === 'menu' || l.module === 'addon')
    } else {
      list = list.filter(l => l.module === activeModule.value)
    }
  }

  // 2. Filter by Specific Target Material
  const targetId = activeTargetMaterialId.value || (selectedMaterialId.value !== 'all' ? selectedMaterialId.value : null)
  if (targetId) {
    list = list.filter(l => l.targetId === targetId)
  }

  // 3. Filter by Action Type
  if (selectedAction.value !== 'all') {
    if (selectedAction.value === 'quick_adjust') {
      list = list.filter(l => l.action === 'quick_adjust' || l.action === 'quick_increase' || l.action === 'quick_decrease')
    } else {
      list = list.filter(l => l.action === selectedAction.value)
    }
  }

  // 4. Date Filter
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

  // 5. Search Query
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

function getModuleIcon(module) {
  switch (module) {
    case 'stock': return '📦'
    case 'pos': return '🛒'
    case 'menu': return '🍽️'
    case 'addon': return '✨'
    case 'system': return '⚙️'
    default: return '📋'
  }
}

function getActionIcon(action) {
  switch (action) {
    case 'adjust': return '⚖️'
    case 'stock_in': return '📥'
    case 'produce': return '🥣'
    case 'sale_deduct': return '🛍️'
    case 'order_complete': return '🧾'
    case 'create': return '✨'
    case 'edit': return '✏️'
    case 'delete': return '🗑️'
    case 'sync': return '☁️'
    default: return '•'
  }
}

function getActionBadgeClass(action) {
  switch (action) {
    case 'adjust':
      return 'bg-amber-50 text-amber-900 border border-amber-200/60'
    case 'stock_in':
      return 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
    case 'produce':
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
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  if (isToday) {
    return `วันนี้ ${timeStr} น.`
  }
  const dateStr = d.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: '2-digit' })
  return `${dateStr} ${timeStr}`
}

function exportCsv() {
  const headers = ['วันที่-เวลา', 'หมวดหมู่', 'ประเภทกิจกรรม', 'รายการ', 'การเปลี่ยนแปลง', 'หน่วย', 'ก่อนปรับ', 'หลังปรับ', 'เหตุผล', 'หมายเหตุ', 'ผู้ทำรายการ']
  const rows = filteredLogs.value.map(l => [
    `"${l.timestamp}"`,
    `"${l.module}"`,
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
  link.setAttribute('href', url)
  link.setAttribute('download', `greek_yogg_activity_logs_${dateStr}.csv`)
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
