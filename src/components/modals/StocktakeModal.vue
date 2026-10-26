<template>
  <DialogFrame id="StocktakeModal" title="ตรวจนับสต็อกปิดร้าน" description="กรอกยอดจริง แล้วตรวจผลต่างก่อนบันทึก" :open="Boolean(store.modals.stocktake?.isOpen)" width="980px" :teleport="false" contained-body @request-close="close">


      <template #header><div class="stocktake-heading"><span class="stocktake-heading-icon"><ClipboardCheck :size="22" aria-hidden="true" /></span><div><h3 id="StocktakeModal-title">ตรวจนับสต็อกปิดร้าน</h3><p>กรอกยอดจริง แล้วตรวจผลต่างก่อนบันทึก</p></div></div></template>
      <div class="stocktake-toolbar">
        <div class="stocktake-controls">
          <AppSearch v-model="searchQuery" label="ค้นหาวัตถุดิบ" placeholder="ค้นหาวัตถุดิบหรือประเภท" class="stocktake-search"/>
          <AppSelect v-model="selectedCategory" aria-label="ประเภทตรวจนับ" class="stocktake-category"><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.label }}</option></AppSelect>
          <AppCheckbox v-model="onlyDifferences" label="เฉพาะยอดต่าง" class="stocktake-diff-filter" />
        </div>
        <div class="stocktake-list-meta">
          <p>{{ filteredMaterials.length }} จาก {{ activeMaterials.length }} รายการ <span class="stocktake-keyboard-hint">· กด <kbd>Enter</kbd> เพื่อไปช่องถัดไป</span></p>
          <button type="button" @click="matchAllSystemStock" class="stocktake-reset-all" :disabled="varianceStats.changedCount === 0" title="คืนยอดนับจริงทุกรายการให้เท่ากับยอดระบบ"><RotateCcw :size="13" aria-hidden="true" />คืนยอดทั้งหมด</button>
        </div>
      </div>

      <div class="stocktake-body" role="region" aria-label="รายการตรวจนับ" tabindex="0">
        <table class="stocktake-table">
          <thead><tr><th>วัตถุดิบ</th><th>ยอดในระบบ</th><th>ยอดนับจริง</th><th class="stocktake-variance-heading">ผลต่าง</th></tr></thead>
          <tbody>
            <tr v-for="mat in filteredMaterials" :key="mat.id" :class="{'stocktake-row-changed':getVariance(mat.id) !== 0}">
              <td class="stocktake-material">
                <div class="stocktake-material-info"><span class="stocktake-emoji" aria-hidden="true">{{ mat.emoji || '📦' }}</span><div><strong>{{ mat.name }}</strong><small>{{ getMaterialKindLabel(mat) }}</small></div></div>
              </td>
              <td class="stocktake-expected"><span class="stocktake-mobile-label">ยอดในระบบ</span><strong>{{ (mat.stock || 0).toLocaleString() }} <span>{{ mat.unit }}</span></strong><small v-if="mat.packUnit && mat.packSize > 1">≈ {{ ((mat.stock || 0) / mat.packSize).toLocaleString(undefined,{maximumFractionDigits:2}) }} {{ mat.packUnit }}</small></td>
              <td class="stocktake-count">
                <span class="stocktake-mobile-label">ยอดนับจริง</span>
                <div class="stocktake-count-control">
                  <AppInput data-count-input type="number" inputmode="decimal" step="any" min="0" :aria-label="`ยอดนับจริง ${mat.name}`" :aria-describedby="mat.packUnit && mat.packSize > 1 ? `stocktake-unit-${mat.id}` : undefined"
                    :model-value="counts[mat.id].value" @focus="editingMaterialId = mat.id" @blur="editingMaterialId = null" @input="setCountValue(mat.id,$event.target.value)" @keydown.enter.prevent="focusNextCount($event)" />
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
            <tr v-if="filteredMaterials.length === 0"><td colspan="4" class="stocktake-empty"><Search :size="24" aria-hidden="true" /><strong>{{ onlyDifferences ? 'ไม่พบรายการที่ยอดต่างตามตัวกรอง' : 'ไม่พบวัตถุดิบตามตัวกรอง' }}</strong><span>ลองเปลี่ยนคำค้นหรือประเภท</span></td></tr>
          </tbody>
        </table>
      </div>

      <template #footer><footer class="stocktake-footer">
        <div class="stocktake-summary" aria-live="polite"><p class="stocktake-summary-line"><span class="stocktake-summary-count"><span>ยอดต่าง</span><strong>{{ varianceStats.changedCount }} รายการ</strong></span><span class="stocktake-impact" :class="varianceStats.netCostImpact>0 ? 'text-emerald-700' : varianceStats.netCostImpact<0 ? 'text-rose-700' : ''">{{ formatImpact(varianceStats.netCostImpact) }}</span></p><small>ยังไม่ปรับสต็อกจนกว่าจะยืนยันแบบร่าง</small></div>
        <div class="stocktake-actions"><Button variant="quiet" @click="close" class="stocktake-cancel">ยกเลิก</Button><Button data-stage-stocktake @click="submitStocktake" :disabled="varianceStats.changedCount === 0" class="stocktake-submit"><Check :size="16" aria-hidden="true" />เพิ่มเข้าแบบร่าง<span v-if="varianceStats.changedCount">({{ varianceStats.changedCount }})</span></Button></div>
      </footer></template>
  </DialogFrame>
</template>

<script setup>
import AppInput from '@/components/ui/AppInput.vue'
import AppSearch from '@/components/ui/AppSearch.vue'
import {getMaterialKind, getMaterialKindLabel} from '@/domain/materialClassification'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import { ref, computed, watch } from 'vue'
import { useInventoryStore } from '@/composables/useInventoryStore'
import { Check, Search, RotateCcw, ClipboardCheck } from 'lucide-vue-next'

const store = useInventoryStore()

const searchQuery = ref('')
const selectedCategory = ref('all')
const onlyDifferences = ref(false)
const editingMaterialId = ref(null)

// Local count map: { [matId]: { value: Number, unitMode: 'base' | 'pack' } }
const counts = ref({})

const categories = computed(() => [{id:'all',label:'ทุกประเภท'}, ...store.materialKindOptions])

const activeMaterials = computed(() => {
  return store.materials.filter(m => !m.isDeleted)
})

const filteredMaterials = computed(() => {
  return activeMaterials.value.filter(m => {
    if (onlyDifferences.value && getVariance(m.id) === 0 && editingMaterialId.value !== m.id) return false
    if (selectedCategory.value !== 'all' && getMaterialKind(m) !== selectedCategory.value) {
      return false
    }
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchCat = getMaterialKindLabel(m).toLowerCase().includes(q)
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
.stocktake-heading{display:flex;align-items:center;gap:12px;min-width:0}.stocktake-heading h3{font-size:18px;font-weight:600;line-height:1.5}.stocktake-heading p{margin-top:4px;font-size:12px;line-height:1.6;color:var(--text-muted)}.stocktake-heading-icon{display:grid;place-items:center;width:44px;height:44px;flex-shrink:0;border-radius:12px;background:var(--bg-soft);color:var(--accent-brand)}
:global(#StocktakeModal .dialog-frame-header){padding:20px 24px 16px}:global(#StocktakeModal .dialog-frame-body){padding:0}:global(#StocktakeModal .dialog-frame-footer){padding:16px 24px;background:var(--bg-soft)}
.stocktake-toolbar{padding:0 24px 12px;flex-shrink:0}.stocktake-controls{display:flex;align-items:center;gap:10px}.stocktake-search{flex:1;min-width:0}.stocktake-category{width:174px;flex-shrink:0}.stocktake-diff-filter{white-space:nowrap;color:var(--text-muted);font-size:12px}.stocktake-list-meta{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px;color:var(--text-muted);font-size:11px;line-height:1.6}.stocktake-keyboard-hint{margin-left:6px}kbd{padding:1px 4px;border-radius:4px;background:var(--bg-soft);font:inherit}.stocktake-reset-all{display:flex;align-items:center;gap:6px;min-height:36px;white-space:nowrap;color:var(--accent-brand)}.stocktake-reset-all:disabled{color:var(--text-muted);opacity:.5;cursor:default}
.stocktake-body{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain}.stocktake-body:focus{outline:none}.stocktake-table{width:100%;border-collapse:separate;border-spacing:0;text-align:left}.stocktake-table th{position:sticky;top:0;z-index:1;padding:12px 14px;background:var(--bg-soft);color:var(--text-muted);font-size:11px;font-weight:500}.stocktake-table th:first-child{padding-left:24px;width:36%}.stocktake-table th:nth-child(2){width:18%}.stocktake-table th:nth-child(3){width:30%}.stocktake-table th:last-child{width:16%;text-align:right;padding-right:24px}.stocktake-table td{padding:12px 14px;border-bottom:1px solid var(--border-subtle);vertical-align:middle;font-size:12px}.stocktake-table td:first-child{padding-left:24px}.stocktake-table td:last-child{padding-right:24px}.stocktake-table tbody tr:last-child td{border-bottom:0}.stocktake-row-changed{background:var(--accent-soft)}
.stocktake-material-info{display:flex;align-items:center;gap:10px;min-width:0}.stocktake-emoji{display:grid;place-items:center;width:34px;height:34px;flex-shrink:0;border-radius:10px;background:var(--bg-soft);font-size:20px}.stocktake-material-info strong{display:block;font-weight:500;line-height:1.6;overflow-wrap:anywhere}.stocktake-material-info small{display:block;margin-top:2px;font-size:11px;color:var(--text-muted)}.stocktake-expected strong,.stocktake-variance strong{display:block;font-family:'Plus Jakarta Sans','Prompt',sans-serif;font-size:14px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}.stocktake-expected strong span,.stocktake-variance strong span{font-family:'Prompt',sans-serif;font-size:11px;font-weight:400;color:var(--text-muted)}.stocktake-expected small,.stocktake-variance small{display:block;margin-top:3px;color:var(--text-muted);font-size:11px}
.stocktake-count-control{display:flex;align-items:center;gap:6px;min-width:0}.stocktake-count-control>.app-input{flex:1;width:0;min-width:0}.stocktake-count-control :deep(input){font-family:'Plus Jakarta Sans','Prompt',sans-serif;font-size:16px;font-variant-numeric:tabular-nums;text-align:right}.stocktake-units{display:flex;padding:3px;border-radius:12px;background:var(--bg-soft);flex-shrink:0}.stocktake-units button{min-width:44px;min-height:44px;padding:6px;border-radius:9px;font-size:11px;color:var(--text-muted);white-space:nowrap}.stocktake-units button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);font-weight:600}.stocktake-fixed-unit{color:var(--text-muted);font-size:12px}.stocktake-count-help{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;min-height:18px}.stocktake-count-help small{font-size:11px;color:var(--text-muted)}.stocktake-count-help button{font-size:11px;color:var(--accent-brand);margin-left:auto;min-height:28px;white-space:nowrap}.stocktake-variance{text-align:right}.stocktake-matched{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-muted);white-space:nowrap}.stocktake-mobile-label{display:none}.stocktake-table .stocktake-empty{text-align:center;padding:48px 20px;color:var(--text-muted)}.stocktake-empty svg{margin:0 auto 10px}.stocktake-empty strong,.stocktake-empty span{display:block;margin-top:6px}
.stocktake-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;width:100%}.stocktake-summary{min-width:0}.stocktake-summary-line{display:flex;align-items:center;flex-wrap:wrap;gap:8px 16px;font-size:12px;line-height:1.6}.stocktake-summary-count{display:flex;align-items:center;gap:8px;color:var(--text-muted)}.stocktake-summary-count strong{color:var(--accent-brand);font-weight:600}.stocktake-impact{font-family:'Plus Jakarta Sans','Prompt',sans-serif;font-size:15px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}.stocktake-summary>small{display:block;margin-top:4px;font-size:11px;line-height:1.6;color:var(--text-muted)}.stocktake-actions{display:flex;gap:8px;flex-shrink:0}.stocktake-submit{gap:6px}
@media(min-width:640px) and (max-width:850px){.stocktake-category{width:145px}.stocktake-table th:first-child{width:32%}.stocktake-table th:nth-child(3){width:34%}.stocktake-count-control{flex-wrap:wrap}.stocktake-count-control>.app-input{flex-basis:100%;width:100%}.stocktake-keyboard-hint{display:none}}
@media(max-width:639px){:global(#StocktakeModal .dialog-frame-header){padding:16px}:global(#StocktakeModal .dialog-frame-footer){padding:12px 16px max(12px,env(safe-area-inset-bottom))}.stocktake-heading{gap:10px}.stocktake-heading-icon{width:38px;height:38px}.stocktake-toolbar{padding:0 16px 10px}.stocktake-controls{flex-wrap:wrap;gap:8px}.stocktake-search{flex-basis:100%}.stocktake-category{flex:1;width:auto}.stocktake-diff-filter{font-size:11px}.stocktake-list-meta{font-size:10px}.stocktake-keyboard-hint{display:none}.stocktake-reset-all{min-height:44px}.stocktake-table,.stocktake-table tbody{display:block}.stocktake-table thead{display:none}.stocktake-table tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);padding:14px 16px;border-bottom:1px solid var(--border-subtle);gap:12px}.stocktake-table td,.stocktake-table td:first-child,.stocktake-table td:last-child{display:block;border:0;padding:0}.stocktake-table .stocktake-material{grid-column:1/-1}.stocktake-table .stocktake-count{grid-column:1/-1}.stocktake-mobile-label{display:block;margin-bottom:6px;font-size:11px;color:var(--text-muted)}.stocktake-table .stocktake-variance{grid-row:2;grid-column:2;text-align:right}.stocktake-table .stocktake-expected{grid-row:2;grid-column:1}.stocktake-count-control>.app-input{flex:1}.stocktake-count-help button{min-height:44px}.stocktake-table .stocktake-empty{grid-column:1/-1;padding:28px 0}.stocktake-footer{flex-direction:column;align-items:stretch;gap:12px}.stocktake-summary-line{justify-content:space-between}.stocktake-actions{width:100%}.stocktake-cancel{flex:1}.stocktake-submit{flex:2}}
</style>
