<template>
  <ModalShell labelled-by="StocktakeModal-title" @request-close="close" :open="store.modals.stocktake?.isOpen"
    class="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-5 bg-stone-900/60">
    <section class="stocktake-sheet" @click.stop>
      <header class="stocktake-header">
        <div class="stocktake-heading">
          <span class="stocktake-icon"><ClipboardCheck :size="21" aria-hidden="true" /></span>
          <div><h3 id="StocktakeModal-title">ตรวจนับสต็อกปิดร้าน</h3><p>กรอกยอดจริง แล้วตรวจผลต่างก่อนบันทึก</p></div>
        </div>
        <button type="button" @click="close" class="stocktake-close" aria-label="ปิดหน้าต่าง"><X :size="19" /></button>
      </header>

      <div class="stocktake-toolbar">
        <div class="stocktake-controls">
          <div class="stocktake-search"><Search :size="16" aria-hidden="true" /><input v-model="searchQuery" type="search" aria-label="ค้นหาวัตถุดิบ" placeholder="ค้นหาวัตถุดิบหรือหมวดหมู่" /></div>
          <AppSelect v-model="selectedCategory" aria-label="หมวดหมู่ตรวจนับ" class="stocktake-category"><option v-for="cat in categories" :key="cat" :value="cat">{{ cat === 'all' ? 'ทุกหมวดหมู่' : cat }}</option></AppSelect>
          <AppCheckbox v-model="onlyDifferences" label="เฉพาะยอดต่าง" class="stocktake-diff-filter" />
        </div>
        <div class="stocktake-list-meta">
          <p>{{ filteredMaterials.length }} จาก {{ activeMaterials.length }} รายการ <span class="stocktake-keyboard-hint">· กด <kbd>Enter</kbd> เพื่อไปช่องถัดไป</span></p>
          <button type="button" @click="matchAllSystemStock" class="stocktake-reset-all" :disabled="varianceStats.changedCount === 0" title="คืนยอดนับจริงทุกรายการให้เท่ากับยอดระบบ"><RotateCcw :size="13" aria-hidden="true" />คืนยอดทั้งหมด</button>
        </div>
      </div>

      <div class="stocktake-body">
        <table class="stocktake-table">
          <thead><tr><th>วัตถุดิบ</th><th>ยอดในระบบ</th><th>ยอดนับจริง</th><th class="stocktake-variance-heading">ผลต่าง</th></tr></thead>
          <tbody>
            <tr v-for="mat in filteredMaterials" :key="mat.id" :class="{'stocktake-row-changed':getVariance(mat.id) !== 0}">
              <td class="stocktake-material">
                <div class="stocktake-material-info"><span class="stocktake-emoji" aria-hidden="true">{{ mat.emoji || '📦' }}</span><div><strong>{{ mat.name }}</strong><small>{{ mat.category || 'ไม่ระบุหมวดหมู่' }}</small></div></div>
              </td>
              <td class="stocktake-expected"><span class="stocktake-mobile-label">ยอดในระบบ</span><strong>{{ (mat.stock || 0).toLocaleString() }} <span>{{ mat.unit }}</span></strong><small v-if="mat.packUnit && mat.packSize > 1">≈ {{ ((mat.stock || 0) / mat.packSize).toLocaleString(undefined,{maximumFractionDigits:2}) }} {{ mat.packUnit }}</small></td>
              <td class="stocktake-count">
                <span class="stocktake-mobile-label">ยอดนับจริง</span>
                <div class="stocktake-count-control">
                  <input data-count-input type="number" inputmode="decimal" step="any" min="0" :aria-label="`ยอดนับจริง ${mat.name}`" :aria-describedby="mat.packUnit && mat.packSize > 1 ? `stocktake-unit-${mat.id}` : undefined"
                    :value="counts[mat.id].value" @focus="editingMaterialId = mat.id" @blur="editingMaterialId = null" @input="setCountValue(mat.id,$event.target.value)" @keydown.enter.prevent="focusNextCount($event)" />
                  <div v-if="mat.packUnit && mat.packSize > 1" class="stocktake-units" :aria-label="`หน่วยนับ ${mat.name}`">
                    <button type="button" :aria-label="`นับ ${mat.name} เป็น ${mat.unit}`" :aria-pressed="counts[mat.id].unitMode === 'base'" @click="counts[mat.id].unitMode !== 'base' && toggleCountUnit(mat.id)">{{ mat.unit }}</button>
                    <button type="button" :aria-label="`นับ ${mat.name} เป็น ${mat.packUnit}`" :aria-pressed="counts[mat.id].unitMode === 'pack'" @click="counts[mat.id].unitMode !== 'pack' && toggleCountUnit(mat.id)">{{ mat.packUnit }}</button>
                  </div>
                  <span v-else class="stocktake-fixed-unit">{{ mat.unit }}</span>
                </div>
                <div class="stocktake-count-help"><small v-if="mat.packUnit && mat.packSize > 1" :id="`stocktake-unit-${mat.id}`">1 {{ mat.packUnit }} = {{ mat.packSize.toLocaleString() }} {{ mat.unit }}</small><button v-if="getVariance(mat.id) !== 0" type="button" @click="matchSystemStock(mat)" :aria-label="`คืนยอด ${mat.name} ให้เท่าระบบ`">เท่าระบบ</button></div>
              </td>
              <td class="stocktake-variance">
                <span class="stocktake-mobile-label">ผลต่าง</span>
                <template v-if="getVariance(mat.id) !== 0"><strong :class="getVariance(mat.id)>0 ? 'text-emerald-700' : 'text-rose-700'">{{ getVariance(mat.id)>0 ? '+' : '' }}{{ getVariance(mat.id).toLocaleString() }} <span>{{ mat.unit }}</span></strong><small :class="getCostImpact(mat)>0 ? 'text-emerald-700' : getCostImpact(mat)<0 ? 'text-rose-700' : ''">{{ formatImpact(getCostImpact(mat)) }}</small></template>
                <span v-else class="stocktake-matched"><Check :size="13" aria-hidden="true" />ตรงระบบ</span>
              </td>
            </tr>
            <tr v-if="filteredMaterials.length === 0"><td colspan="4" class="stocktake-empty"><Search :size="24" aria-hidden="true" /><strong>{{ onlyDifferences ? 'ไม่พบรายการที่ยอดต่างตามตัวกรอง' : 'ไม่พบวัตถุดิบตามตัวกรอง' }}</strong><span>ลองเปลี่ยนคำค้นหรือหมวดหมู่</span></td></tr>
          </tbody>
        </table>
      </div>

      <footer class="stocktake-footer">
        <div class="stocktake-summary" aria-live="polite"><p>ยอดต่างทั้งหมด <strong>{{ varianceStats.changedCount }} รายการ</strong><span class="stocktake-impact" :class="varianceStats.netCostImpact>0 ? 'text-emerald-700' : varianceStats.netCostImpact<0 ? 'text-rose-700' : ''">{{ formatImpact(varianceStats.netCostImpact) }}</span></p><small>ยังไม่ปรับสต็อกจนกว่าจะยืนยันแบบร่าง</small></div>
        <div class="stocktake-actions"><button type="button" @click="close" class="stocktake-cancel">ยกเลิก</button><button type="button" data-stage-stocktake @click="submitStocktake" :disabled="varianceStats.changedCount === 0" class="stocktake-submit"><Check :size="16" aria-hidden="true" />เพิ่มเข้าแบบร่าง<span v-if="varianceStats.changedCount">({{ varianceStats.changedCount }})</span></button></div>
      </footer>
    </section>
  </ModalShell>
</template>

<script setup>
import ModalShell from '@/components/ui/ModalShell.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, Search, RotateCcw, ClipboardCheck } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedCategory = ref('all')
const onlyDifferences = ref(false)
const editingMaterialId = ref(null)

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
    if (onlyDifferences.value && getVariance(m.id) === 0 && editingMaterialId.value !== m.id) return false
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
    onlyDifferences.value = false
    editingMaterialId.value = null
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

function focusNextCount(event) {
  const inputs = [...event.target.closest('table').querySelectorAll('[data-count-input]')]
  const next = inputs[inputs.indexOf(event.target) + 1]
  next?.focus()
  next?.select()
}

function formatImpact(value) {
  return `${value < 0 ? '-' : value > 0 ? '+' : ''}฿${Math.abs(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
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
<style scoped>
.stocktake-sheet{display:flex;flex-direction:column;width:100%;max-width:980px;height:90dvh;max-height:820px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:24px;background:var(--bg-card);box-shadow:var(--shadow-popup);color:var(--text-main);font-size:12px}
.stocktake-header{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;border-bottom:1px solid var(--border-subtle);flex-shrink:0}.stocktake-heading{display:flex;align-items:center;gap:12px;min-width:0}.stocktake-icon{display:grid;place-items:center;width:42px;height:42px;flex-shrink:0;border-radius:14px 20px 14px 14px;color:var(--accent-brand);background:var(--accent-soft)}.stocktake-heading h3{font-size:16px;font-weight:600;line-height:1.5}.stocktake-heading p{margin-top:3px;color:var(--text-muted);font-size:11px}.stocktake-close{display:grid;place-items:center;width:34px;height:34px;flex-shrink:0;border-radius:10px;color:var(--text-muted)}.stocktake-close:hover{background:var(--bg-soft);color:var(--accent-brand)}
.stocktake-toolbar{padding:16px 24px 12px;border-bottom:1px solid var(--border-subtle);flex-shrink:0}.stocktake-controls{display:flex;align-items:center;gap:10px}.stocktake-search{display:flex;align-items:center;gap:8px;min-width:0;flex:1;height:40px;padding:0 12px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--bg-card);color:var(--text-muted)}.stocktake-search input{width:100%;min-width:0;background:transparent;outline:0;font-size:12px;color:var(--text-main)}.stocktake-search:focus-within{border-color:var(--accent-brand);box-shadow:0 0 0 2px var(--focus-ring)}.stocktake-category{width:180px;flex-shrink:0}.stocktake-diff-filter{display:flex;align-items:center;gap:7px;white-space:nowrap;color:var(--text-muted);cursor:pointer}
.stocktake-list-meta{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;font-size:11px;color:var(--text-muted)}.stocktake-keyboard-hint{margin-left:6px;color:var(--text-muted)}kbd{padding:1px 4px;border:1px solid var(--border-subtle);border-radius:4px;font:inherit;font-size:10px;background:var(--bg-primary)}.stocktake-reset-all{display:flex;align-items:center;gap:5px;white-space:nowrap;color:var(--text-muted);padding:3px 0}.stocktake-reset-all:hover:not(:disabled){color:var(--accent-brand)}.stocktake-reset-all:disabled{opacity:.45;cursor:default}
.stocktake-body{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain}.stocktake-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left}.stocktake-table thead{position:sticky;top:0;z-index:1;background:var(--bg-primary)}.stocktake-table th{padding:12px 16px;border-bottom:1px solid var(--border-subtle);font-size:11px;font-weight:500;color:var(--text-muted)}.stocktake-table th:first-child{padding-left:24px;width:40%}.stocktake-table th:nth-child(2){width:16%}.stocktake-table th:nth-child(3){width:28%}.stocktake-table th:last-child{padding-right:24px;text-align:right;width:16%}.stocktake-table td{padding:14px 16px;border-bottom:1px solid var(--border-subtle);vertical-align:middle}.stocktake-table td:first-child{padding-left:24px}.stocktake-table td:last-child{padding-right:24px}.stocktake-row-changed{background:#fbf0e94d}.stocktake-material-info{display:flex;align-items:center;gap:10px;min-width:0}.stocktake-emoji{display:grid;place-items:center;flex-shrink:0;width:34px;height:34px;font-size:20px;background:var(--bg-primary);border-radius:10px}.stocktake-material-info strong{display:block;font-size:12px;font-weight:500;line-height:1.6;overflow-wrap:anywhere}.stocktake-material-info small{display:block;color:var(--text-muted);font-size:10px;margin-top:3px}.stocktake-expected strong{display:block;font-family:'Plus Jakarta Sans','Prompt',sans-serif;font-size:13px;font-weight:600;white-space:nowrap}.stocktake-expected strong span,.stocktake-variance strong span{font-family:'Prompt',sans-serif;font-size:10px;color:var(--text-muted);font-weight:400}.stocktake-expected small{display:block;color:var(--text-muted);font-size:10px;margin-top:4px}
.stocktake-count-control{display:flex;align-items:center;gap:6px;min-width:0}.stocktake-count-control input{width:100%;min-width:48px;flex:1;height:42px;border:1px solid #d2c2b0;border-radius:9px;padding:0 10px;background:var(--bg-card);color:var(--text-main);font-family:'Plus Jakarta Sans',sans-serif;font-size:16px;font-weight:600;text-align:right}.stocktake-count-control input:focus-visible{outline:2px solid var(--accent-border);outline-offset:1px;border-color:var(--accent-brand)}.stocktake-units{display:flex;align-items:center;gap:2px;min-width:0;padding:3px;border-radius:8px;background:var(--bg-soft);flex-shrink:0}.stocktake-units button{min-width:28px;max-width:76px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:5px 6px;border-radius:5px;color:var(--text-muted);font-size:10px;line-height:20px}.stocktake-units button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);font-weight:600;box-shadow:0 1px 3px #35252210}.stocktake-fixed-unit{font-size:11px;color:var(--text-muted);padding-left:2px}.stocktake-count-help{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:16px;margin-top:4px}.stocktake-count-help small{font-size:9px;color:var(--text-muted)}.stocktake-count-help button{font-size:10px;color:var(--accent-brand);margin-left:auto;white-space:nowrap}.stocktake-count-help button:hover{text-decoration:underline}.stocktake-variance{text-align:right;white-space:nowrap}.stocktake-variance strong{display:block;font-family:'Plus Jakarta Sans','Prompt',sans-serif;font-size:13px;font-weight:600}.stocktake-variance small{display:block;font-size:10px;margin-top:4px}.stocktake-matched{display:inline-flex;align-items:center;gap:4px;color:var(--text-muted);font-size:10px}.stocktake-mobile-label{display:none}
.stocktake-table .stocktake-empty{text-align:center;padding:64px 20px;color:var(--text-muted)}.stocktake-empty>svg{display:block;margin:0 auto 12px;color:#d2c2b0}.stocktake-empty strong{display:block;font-weight:500;color:var(--text-main)}.stocktake-empty>span{display:block;margin-top:5px;font-size:11px}
.stocktake-footer{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 24px;border-top:1px solid var(--border-subtle);background:var(--bg-card);flex-shrink:0}.stocktake-summary p{font-size:11px;color:var(--text-muted)}.stocktake-summary strong{color:var(--text-main);font-size:12px;font-weight:600;margin-left:6px}.stocktake-impact{font-family:'Plus Jakarta Sans','Prompt',sans-serif;padding-left:10px;margin-left:10px;border-left:1px solid var(--border-subtle);font-weight:600;white-space:nowrap}.stocktake-summary small{display:block;margin-top:5px;font-size:10px;color:var(--text-muted)}.stocktake-actions{display:flex;gap:8px;flex-shrink:0}.stocktake-cancel,.stocktake-submit{display:flex;align-items:center;justify-content:center;gap:6px;height:40px;padding:0 14px;border-radius:10px;font-size:12px;font-weight:500}.stocktake-cancel{border:1px solid var(--border-subtle);color:var(--text-muted)}.stocktake-cancel:hover{background:var(--bg-primary)}.stocktake-submit{background:var(--accent-brand);color:var(--bg-card)}.stocktake-submit:hover:not(:disabled){background:var(--accent-hover)}.stocktake-submit:disabled{opacity:.4;cursor:not-allowed}
@media(max-width:639px){.stocktake-sheet{height:94dvh;border-radius:18px}.stocktake-header{padding:14px 16px;gap:8px}.stocktake-icon{width:34px;height:34px;border-radius:10px}.stocktake-heading{gap:9px}.stocktake-heading h3{font-size:14px}.stocktake-heading p{font-size:10px}.stocktake-toolbar{padding:12px 14px 10px}.stocktake-controls{flex-wrap:wrap;gap:8px}.stocktake-search{flex-basis:100%}.stocktake-category{flex:1;width:auto;min-width:0}.stocktake-diff-filter{font-size:11px}.stocktake-list-meta{font-size:10px}.stocktake-keyboard-hint{display:none}.stocktake-reset-all{font-size:10px}.stocktake-table{display:block}.stocktake-table thead{display:none}.stocktake-table tbody{display:grid;gap:10px;padding:12px}.stocktake-table tr{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);border:1px solid var(--border-subtle);border-radius:12px;background:var(--bg-card);overflow:hidden}.stocktake-table tr.stocktake-row-changed{border-color:var(--accent-border)}.stocktake-table td,.stocktake-table td:first-child,.stocktake-table td:last-child{display:block;border:0;padding:10px 12px}.stocktake-table .stocktake-material{grid-column:1/-1;border-bottom:1px solid var(--border-subtle);padding:12px}.stocktake-mobile-label{display:block;color:var(--text-muted);font-size:10px;margin-bottom:6px}.stocktake-count-control{gap:4px}.stocktake-count-control input{padding:0 7px}.stocktake-units{padding:2px;gap:1px}.stocktake-units button{min-width:23px;max-width:46px;padding:4px;font-size:9px}.stocktake-count-help{flex-wrap:wrap;gap:2px}.stocktake-variance{grid-column:1/-1;display:flex!important;align-items:center;gap:8px;text-align:left;background:var(--bg-primary)}.stocktake-variance .stocktake-mobile-label{margin:0 auto 0 0}.stocktake-variance strong{font-size:12px}.stocktake-variance small{margin:0;font-size:10px}.stocktake-table .stocktake-empty{grid-column:1/-1;padding:40px 15px}.stocktake-footer{flex-wrap:wrap;gap:12px;padding:12px 14px}.stocktake-summary{width:100%}.stocktake-actions{width:100%}.stocktake-cancel{flex:1}.stocktake-submit{flex:2}}
</style>
