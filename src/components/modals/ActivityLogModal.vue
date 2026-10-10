<template>
  <ModalShell labelled-by="ActivityLogModal-title" :open="store.modals.activityLog?.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-stone-900/40" @request-close="close">
    <section class="history-modal bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90dvh] flex flex-col overflow-hidden">
      <header class="px-4 py-4 sm:px-5 border-b border-stone-100 flex items-start justify-between gap-3 shrink-0">
        <div class="min-w-0">
          <h3 id="ActivityLogModal-title" class="font-semibold text-base text-stone-900 break-words">{{ isItemMode ? activeTargetMaterial?.name : isStockMode ? 'ประวัติสต็อก' : 'ประวัติกิจกรรม' }}</h3>
          <p class="mt-1 text-xs text-stone-500">{{ isItemMode ? `คงเหลือ ${formatNum(activeTargetMaterial?.stock)} ${activeTargetMaterial?.unit || ''}` : 'รับเข้า ผลิต ขาย และการเปลี่ยนแปลงในระบบ' }}</p>
        </div>
        <button type="button" @click="close" aria-label="ปิดประวัติ" class="history-icon-button"><X class="h-4 w-4" /></button>
      </header>

      <div class="px-4 py-3 sm:px-5 border-b border-stone-100 shrink-0 space-y-3">
        <div class="flex flex-wrap gap-2">
          <div class="relative flex-1 min-w-0">
            <Search class="absolute left-3 top-3 h-4 w-4 text-stone-400 pointer-events-none" />
            <input v-model="searchQuery" aria-label="ค้นหาประวัติ" placeholder="ค้นหารายการหรือหมายเหตุ" class="history-control pl-9 pr-9 w-full" />
            <button v-if="searchQuery" type="button" @click="searchQuery = ''" aria-label="ล้างข้อความค้นหา" class="absolute right-1 top-1 history-icon-button !h-8 !w-8"><X class="h-3.5 w-3.5" /></button>
          </div>
          <button ref="filterButton" type="button" @click="toggleFilterPopover" aria-controls="history-filters" aria-haspopup="dialog" :aria-expanded="showFilterPopover" class="history-button"
            :class="hasActiveAdvancedFilter ? 'border-emerald-300 text-emerald-800 bg-emerald-50' : ''">
            <SlidersHorizontal class="h-4 w-4" /><span>ตัวกรอง</span><span v-if="advancedFilterCount" class="text-xs">{{ advancedFilterCount }}</span><ChevronDown class="h-3.5 w-3.5" :class="showFilterPopover ? 'rotate-180' : ''" />
          </button>
        </div>
        <div class="flex items-center justify-between gap-2 text-xs">
          <p class="text-stone-500" aria-live="polite">{{ filteredLogs.length }} รายการ<span v-if="filterStartDate || filterEndDate"> · {{ formatDateRangeLabel(filterStartDate, filterEndDate) }}</span></p>
          <button v-if="hasActiveFilter" type="button" aria-label="ล้างตัวกรองทั้งหมด" @click="resetFilters" class="text-stone-600 underline underline-offset-4 hover:text-stone-900">ล้างตัวกรอง</button>
          <span v-else class="text-stone-400">กดรายการเพื่อดูรายละเอียด</span>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain history-list">
        <div v-if="!filteredLogs.length" class="px-5 py-16 text-center">
          <p class="text-sm font-semibold text-stone-700">{{ hasActiveFilter ? 'ไม่พบรายการที่ตรงกับตัวกรอง' : 'ยังไม่มีประวัติ' }}</p>
          <p class="mt-2 text-xs text-stone-500">{{ hasActiveFilter ? 'ลองเปลี่ยนคำค้นหาหรือช่วงวันที่' : 'รายการจะแสดงเมื่อมีการบันทึกกิจกรรม' }}</p>
        </div>
        <section v-for="group in groupedLogs" :key="group.dateKey" :aria-label="group.dateLabel">
          <h4 class="sticky top-0 z-10 flex items-center justify-between bg-stone-50 px-4 py-2 sm:px-5 text-xs font-medium text-stone-600 border-y border-stone-100"><span>{{ group.dateLabel }}</span><span class="text-stone-400">{{ group.items.length }} รายการ</span></h4>
          <HistoryLogEntry v-for="log in group.items" :key="log.id" :log="log" :item-mode="isItemMode" />
        </section>
      </div>

      <footer class="px-4 py-3 sm:px-5 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <button type="button" @click="exportCsv" :disabled="!filteredLogs.length" class="history-button"><Download class="h-4 w-4" />ส่งออก CSV</button>
        <div class="flex items-center gap-3">
          <details v-if="!isItemMode" class="relative">
            <summary tabindex="0" class="history-button cursor-pointer list-none" aria-label="จัดการประวัติ"><MoreHorizontal class="h-4 w-4" />เพิ่มเติม</summary>
            <div class="absolute right-0 bottom-full mb-2 p-1 bg-white rounded-lg border border-stone-200 shadow-lg whitespace-nowrap">
              <button type="button" @click="confirmClearLogs" :disabled="!(store.activityLogs || []).length" class="px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-40">ล้างประวัติทั้งหมด</button>
            </div>
          </details>
          <button type="button" @click="close" class="history-button !bg-stone-900 !border-stone-900 !text-white hover:!bg-stone-800 px-5">ปิด</button>
        </div>
      </footer>
    </section>
  </ModalShell>
  <FilterDropdown id="history-filters" title="ตัวกรองประวัติ" :open="showFilterPopover && store.modals.activityLog?.isOpen" :anchor="filterButton" :values="filterValues" :fields="filterFields" @close="showFilterPopover = false" @apply="applyFilters" />
</template>

<script setup>
import { businessDateKey } from '@/domain/businessDate'
import { csvField } from '@/domain/csv'
import ModalShell from '@/components/ui/ModalShell.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore, formatThaiDate } from '@/stores/posStore'
import HistoryLogEntry from '@/components/ui/HistoryLogEntry.vue'
import FilterDropdown from '@/components/ui/FilterDropdown.vue'
import {
  X,
  Search,
  Download,
  SlidersHorizontal, MoreHorizontal, ChevronDown
} from 'lucide-vue-next'

const store = usePosStore()

// Popover state
const showFilterPopover = ref(false)
const filterButton = ref(null)
const filterValues = computed(() => ({action:selectedActionFilter.value,module:activeModule.value,material:selectedMaterialId.value,start:filterStartDate.value,end:filterEndDate.value}))
const filterFields = computed(() => {
  const fields = [{key:'action',label:'ประเภทกิจกรรม',options:availableActionOptions.value}]
  if(isGlobalMode.value) fields.push({key:'module',label:'หมวดกิจกรรม',options:moduleOptions})
  if(isStockMode.value) fields.push({key:'material',label:'วัตถุดิบ',options:[{id:'all',label:'ทุกวัตถุดิบ'},...store.materials.map(material=>({id:material.id,label:material.name}))]})
  return fields
})
function toggleFilterPopover() { showFilterPopover.value = true }
function applyFilters(values) {
  selectedActionFilter.value = values.action
  activeModule.value = values.module
  selectedMaterialId.value = values.material
  filterStartDate.value = values.start
  filterEndDate.value = values.end
}
// Filter States
const searchQuery = ref('')
const activeModule = ref('all') // 'all' | 'stock' | 'pos' | 'menu' | 'system'
const selectedActionFilter = ref('all') // 'all' | 'stock_in' | 'adjust' | 'produce' | 'waste' | 'switch_lot' etc.
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
      { id: 'sale_deduct', label: 'ตัดขาย', icon: '🛍️' },
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
    { id: 'sale_deduct', label: 'ตัดขาย', icon: '🛍️' },
    { id: 'order_complete', label: 'ขายหน้าร้าน', icon: '🧾' },
    { id: 'waste', label: 'ของเสีย', icon: '🗑️' },
    { id: 'switch_lot', label: 'สลับล็อต', icon: '⚡' }
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

// Advanced Filter Checks (for the Popover button badge)
const hasActiveAdvancedFilter = computed(() => {
  if (selectedActionFilter.value !== 'all') return true
  if (isGlobalMode.value && activeModule.value !== 'all') return true
  if (isStockMode.value && selectedMaterialId.value !== 'all') return true
  if (filterStartDate.value !== null || filterEndDate.value !== null) return true
  return false
})

const advancedFilterCount = computed(() => {
  let count = 0
  if (selectedActionFilter.value !== 'all') count++
  if (isGlobalMode.value && activeModule.value !== 'all') count++
  if (isStockMode.value && selectedMaterialId.value !== 'all') count++
  if (filterStartDate.value !== null || filterEndDate.value !== null) count++
  return count
})

// Active Filter Checks (for chip strip & empty state)
const hasActiveFilter = computed(() => {
  if (searchQuery.value.trim() !== '') return true
  if (isItemMode.value) {
    return selectedActionFilter.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
  }
  if (isStockMode.value) {
    return selectedActionFilter.value !== 'all' || selectedMaterialId.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
  }
  return activeModule.value !== 'all' || selectedActionFilter.value !== 'all' || filterStartDate.value !== null || filterEndDate.value !== null
})

function resetFilters() {
  activeModule.value = 'all'
  selectedActionFilter.value = 'all'
  selectedMaterialId.value = 'all'
  filterStartDate.value = null
  filterEndDate.value = null
  searchQuery.value = ''
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
    } else if (act === 'waste') {
      list = list.filter(l => l.action === 'waste' || l.reason === 'ของเสีย/หมดอายุ' || (l.action && String(l.action).includes('waste')))
    } else {
      list = list.filter(l => l.action === act)
    }
  }

  // 3. Date Range Filter
  if (filterStartDate.value || filterEndDate.value) {
    list = list.filter(l => {
      if (!l.timestamp) return false
      const logDay = businessDateKey(l.timestamp)
      if (!logDay) return false
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
  const todayStr = businessDateKey(now)
  const yestStr = businessDateKey(now.getTime() - 86400000)

  filteredLogs.value.forEach(log => {
    const dateKey = (log.timestamp && businessDateKey(log.timestamp)) || 'unknown'
    if (!groups[dateKey]) {
      let label = ''
      if (dateKey === todayStr) {
        label = `วันนี้ (${formatThaiDate(dateKey, true)})`
      } else if (dateKey === yestStr) {
        label = `เมื่อวาน (${formatThaiDate(dateKey, true)})`
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

  return Object.values(groups).sort((a, b) => {
    if (a.dateKey === 'unknown') return 1
    if (b.dateKey === 'unknown') return -1
    return b.dateKey.localeCompare(a.dateKey)
  })
})

function formatNum(val) {
  if (val === null || val === undefined || val === '') return '0'
  const n = Number(val)
  return isNaN(n) ? String(val) : n.toLocaleString()
}

function hasDelta(log) {
  return log.delta != null && log.delta !== '' && Number.isFinite(Number(log.delta)) && Number(log.delta) !== 0
}

function exportCsv() {
  const headers = ['วันที่-เวลา', 'ประเภทกิจกรรม', 'รายการ', 'การเปลี่ยนแปลง', 'หน่วย', 'ก่อนปรับ', 'หลังปรับ', 'เหตุผล', 'หมายเหตุ', 'ผู้ทำรายการ']
  const rows = filteredLogs.value.map(l => [
    l.timestamp || '', l.title || '', l.targetName || '',
    hasDelta(l) ? formatNum(l.delta) : '', l.unit || '',
    l.beforeStock != null ? formatNum(l.beforeStock) : '',
    l.afterStock != null ? formatNum(l.afterStock) : '',
    l.reason || '', l.note || '', l.user || ''
  ])
  const csvContent = '\uFEFF' + [headers, ...rows].map(row => row.map(csvField).join(',')).join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const dateStr = businessDateKey().replace(/-/g, '')
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

<style scoped>
.history-button { display:inline-flex; align-items:center; justify-content:center; gap:8px; height:40px; padding:0 12px; border:1px solid #e7e5e4; border-radius:8px; background:#fff; color:#57534e; font-size:12px; font-weight:500; }
.history-button:hover { background:#fafaf9; color:#292524; }
.history-button:disabled { opacity:.4; cursor:not-allowed; }
.history-icon-button { display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:8px; color:#78716c; flex-shrink:0; }
.history-icon-button:hover { background:#f5f5f4; color:#292524; }
.history-control { height:40px; border:1px solid #e7e5e4; border-radius:8px; background:white; font-size:12px; color:#292524; padding:0 12px; }
.history-button:focus-visible,.history-icon-button:focus-visible,.history-control:focus-visible { outline:2px solid #047857; outline-offset:2px; }
input.history-control.pl-9 { padding-left:36px; padding-right:36px; }
.history-list { scrollbar-gutter:stable; }
</style>
