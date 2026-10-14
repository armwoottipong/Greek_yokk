<template>
  <div class="menu-workspace">
    <StockSummary :valuation="store.totalInventoryValuation" :draft-diff="store.draftInventoryValuationDiff" :projected="store.projectedInventoryValuation" :budget="store.reorderBudgetNeeded" :low-count="store.lowStockMaterials.length" :out-count="store.outOfStockMaterials.length" />
    <StockToolbar v-model:search="searchQuery" :role="selectedRole" :kind="selectedKind" :show-deleted="showDeleted" :kinds="kinds" :deleted-count="deletedCount" @apply-filters="applyStockFilters" @receive="openStockIn()" @stocktake="openStocktake" @adjust="openStockAdjust()" @create="openCreateMaterial" @history="store.openActivityLog('stock')" />
    <section class="menu-directory" aria-label="รายการในคลัง"><header class="menu-directory-heading"><h3>วัตถุดิบและบรรจุภัณฑ์</h3><span>{{ filteredMaterials.length }} รายการ</span></header><div class="menu-directory-list">
      <StockMaterialCard v-for="mat in filteredMaterials" :key="mat.id" :material="mat" :usage="store.materialUsageById.get(mat.id)" :draft-diff="getDraftDiff(mat)" :pack-cost="getDisplayPackCost(mat)" :lot-count="getDisplayLots(mat).length" :tracking-mode="store.getMaterialTrackingMode(mat)" :more-open="activeActionMenuId===mat.id" @more="toggleActionMenu" @details="detailMaterialId=$event" @receive="openStockIn" />
      <p v-if="!filteredMaterials.length" class="p-6 text-sm">ไม่พบรายการวัตถุดิบตามเงื่อนไขที่เลือก ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
    </div></section>
    <MaterialDetails :open="Boolean(detailMaterialId)" :material="detailMaterial" :usage="store.materialUsageById.get(detailMaterialId)" :lots="detailMaterial?getDisplayLots(detailMaterial):[]" :tracking-mode="detailMaterial?store.getMaterialTrackingMode(detailMaterial):'none'" :pack-cost="detailMaterial?getDisplayPackCost(detailMaterial):0" :draft-diff="detailMaterial?getDraftDiff(detailMaterial):0" @close="detailMaterialId=null" @adjust="onActionStockAdjustLot" @waste="onActionWasteLot" @switch="onActionSwitchLot" @restore="onActionRestore" @delete="onActionPermanentDelete" @edit="openEditMaterial" @receive="openStockIn" />
    <StockDraftReview :open="showDraftDetails" :has-drafts="store.hasStockDrafts" :items="store.stockDraftSummary.items" :snapshot="store.stockDraftSnapshot" :materials="store.materials" @open="showDraftDetails=true" @close="showDraftDetails=false" @commit="savePendingChanges" @discard="revertPendingChanges" />
    <!-- Teleported Floating Action Menu (Never clipped by table rows or overflow-x container) -->
    <DialogFrame id="stock-material-actions" :open="Boolean(activeActionMenuId&&activeMenuMat)" :title="activeMenuMat?.name||'งานวัตถุดิบ'" presentation="sheet" description="เลือกงานที่ต้องการจัดการกับรายการนี้" @request-close="closeActionMenu">
 <div v-if="activeMenuMat" class="stock-context-actions">
  <Button v-if="!activeMenuMat.isDeleted" variant="secondary" @click="onActionStockIn(activeMenuMat.id)">{{ activeMenuMat.hasSubRecipe?'ผลิตตามสูตร':'รับเข้าสต็อก' }}</Button>
  <Button v-if="!activeMenuMat.isDeleted" variant="secondary" @click="onActionStockAdjust(activeMenuMat.id)">ปรับยอดนับจริง</Button>
  <Button variant="secondary" @click="onActionEdit(activeMenuMat.id)">แก้ไขข้อมูล</Button>
  <Button variant="quiet" @click="onActionHistory(activeMenuMat.id)">ประวัติสต็อก</Button>
  <Button v-if="!activeMenuMat.isDeleted" variant="quiet" @click="onActionWaste(activeMenuMat.id)">บันทึกของเสีย</Button>
  <Button v-if="!activeMenuMat.isDeleted" variant="quiet" @click="onActionArchive(activeMenuMat)">จัดเก็บรายการ</Button>
  <template v-else><Button variant="secondary" @click="onActionRestore(activeMenuMat)">กู้คืนรายการ</Button><Button variant="danger" @click="onActionPermanentDelete(activeMenuMat)">ลบถาวร</Button></template>
 </div>
</DialogFrame>

    <DialogFrame id="stock-delete-material" title="ยืนยันลบวัตถุดิบถาวร" :open="showDeleteModal" width="440px" initial-focus="[data-delete-cancel]" @request-close="closeDeleteModal">
      <template v-if="materialToDelete">
        <p class="font-semibold">{{ materialToDelete.name }} · {{ materialToDelete.id }}</p>
        <template v-if="deleteUsageWarning?.isInUse"><p class="mt-3">รายการนี้ยังอยู่ในสูตร จัดเก็บแทนเพื่อรักษาข้อมูลสูตร</p><ul class="mt-3 space-y-2"><li v-for="name in [...deleteUsageWarning.usedInMenus,...deleteUsageWarning.usedInAddons,...deleteUsageWarning.usedInMaterials]" :key="name">{{ name }}</li></ul></template>
        <p v-else class="mt-3 text-sm">ข้อมูลวัตถุดิบและล็อตจะถูกลบอย่างถาวร และกู้คืนไม่ได้</p>
      </template>
      <template #footer><Button variant="secondary" data-delete-cancel @click="closeDeleteModal">ยกเลิก</Button><Button v-if="deleteUsageWarning?.isInUse" @click="confirmArchiveInstead">จัดเก็บแทน</Button><Button v-else variant="danger" data-delete-material @click="confirmDeletePermanently">ลบถาวร</Button></template>
    </DialogFrame>
  </div>
</template>

<script setup>
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import StockDraftReview from '@/components/inventory/StockDraftReview.vue'
import StockMaterialCard from '@/components/inventory/StockMaterialCard.vue'
import MaterialDetails from '@/components/inventory/MaterialDetails.vue'
import StockToolbar from '@/components/inventory/StockToolbar.vue'
import StockSummary from '@/components/inventory/StockSummary.vue'
import MaterialUsage from '@/components/inventory/MaterialUsage.vue'
import { getMaterialKindLabel, matchesMaterialFilter } from '@/domain/materialClassification'
import ModalShell from '@/components/ui/ModalShell.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  usePosStore,
  getExpiryStatus,
  formatThaiDate,
  formatDisplayDate,
  isExpired,
  getTodayString,
  addDays,
  getReceiveAgeStatus
} from '@/stores/posStore'
import {
  Plus,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Edit3,
  EyeOff,
  RotateCcw,
  MoreHorizontal,
  Check,
  Undo2,
  History,
  ChevronDown,
  ChevronUp,
  Trash2,
  Zap,
  Archive,
  AlertTriangle,
  ClipboardCheck
} from 'lucide-vue-next'

const store = usePosStore()
function applyStockFilters(values){selectedRole.value=values.role;selectedKind.value=values.kind;showDeleted.value=values.showDeleted}

const detailMaterialId=ref(null)
const detailMaterial=computed(()=>store.materials.find(m=>m.id===detailMaterialId.value)||null)
const searchQuery = ref('')
const selectedRole = ref('all') // 'all' | 'main' | 'sub'
const selectedKind = ref('all')
const showDeleted = ref(false)

// Expandable sub-lots state
const expandedMaterialIds = ref(new Set())

function toggleExpand(matId) {
  if (expandedMaterialIds.value.has(matId)) {
    expandedMaterialIds.value.delete(matId)
  } else {
    expandedMaterialIds.value.add(matId)
  }
}

function isExpanded(matId) {
  return expandedMaterialIds.value.has(matId)
}

function getActiveLotsCount(mat) {
  if (!mat || !mat.lots) return 0
  return mat.lots.filter(l => Number(l.qty) > 0).length
}

function hasMultipleLots(mat) {
  if (!mat || !mat.lots) return false
  if (store.getMaterialTrackingMode(mat) === 'none') return false
  return getActiveLotsCount(mat) > 1
}

function getDisplayLots(mat) {
  return store.getMaterialLots(mat)
}

function getLotAge(lot) {
  return lot?.receiveDate ? getReceiveAgeStatus(lot.receiveDate) : null
}

function isLotExpired(lot) {
  return lot?.expiryDate ? isExpired({ expiryDate: lot.expiryDate }) : false
}

function onActionWaste(matId) {
  closeActionMenu()
  store.openWasteModal(matId)
}

// Action menu dropdown state & positioning
const activeActionMenuId = ref(null)
const actionMenuPosition = ref({ top: '0px', right: '0px' })

const activeMenuMat = computed(() => {
  if (!activeActionMenuId.value) return null
  return store.materials.find(m => m.id === activeActionMenuId.value) || null
})

// Permanent Delete & Usage Warning state
const showDeleteModal = ref(false)
const materialToDelete = ref(null)
const deleteUsageWarning = ref(null)

// Draft helpers & diff calculation
function getDraftDiff(mat) {
  if (!store.stockDraftSnapshot) return 0
  const snap = store.stockDraftSnapshot.find(s => s.id === mat.id)
  if (!snap) return 0
  return Math.round(((Number(mat.stock) || 0) - (Number(snap.stock) || 0)) * 100) / 100
}

function getBaselineStock(matId) {
  if (!store.stockDraftSnapshot) return null
  const snap = store.stockDraftSnapshot.find(s => s.id === matId)
  return snap ? (Number(snap.stock) || 0) : null
}

onMounted(() => {
  if (!store.stockDraftSnapshot) {
    store.initStockDraftSnapshot()
  }
})

onUnmounted(() => {
})

function toggleActionMenu(matId, event) {
  event?.stopPropagation()
  if (activeActionMenuId.value === matId) {
    closeActionMenu()
    return
  }

  const trigger = event?.currentTarget
  if (trigger) {
    const rect = trigger.getBoundingClientRect()
    const menuWidth = 208 // w-52
    const menuHeight = 280

    let top = rect.bottom + 6
    let transformOrigin = 'top right'

    // If near bottom of viewport, flip upwards
    if (rect.bottom + menuHeight > window.innerHeight - 10) {
      top = Math.max(10, rect.top - menuHeight - 6)
      transformOrigin = 'bottom right'
    }

    let right = window.innerWidth - rect.right
    if (right < 10) right = 10

    actionMenuPosition.value = {
      top: `${top}px`,
      right: `${right}px`,
      transformOrigin
    }
  }

  activeActionMenuId.value = matId
}

function closeActionMenu() {
  activeActionMenuId.value = null
}

function onActionHistory(matId) {
  closeActionMenu()
  store.openActivityLog('stock', matId)
}

function onActionStockIn(matId) {
  closeActionMenu()
  openStockIn(matId)
}

function onActionStockAdjust(matId) {
  closeActionMenu()
  openStockAdjust(matId)
}

function onActionEdit(matId) {
  closeActionMenu()
  openEditMaterial(matId)
}

function onActionArchive(mat) {
  closeActionMenu()
  store.softDeleteMaterial(mat.id)
}

function onActionRestore(mat) {
  closeActionMenu()
  store.restoreMaterial(mat.id)
}

function onActionPermanentDelete(mat) {
  closeActionMenu()
  materialToDelete.value = mat
  deleteUsageWarning.value = store.getMaterialUsage(mat.id)
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  materialToDelete.value = null
  deleteUsageWarning.value = null
}

function confirmArchiveInstead() {
  if (materialToDelete.value) {
    store.softDeleteMaterial(materialToDelete.value.id)
  }
  closeDeleteModal()
}

function confirmDeletePermanently() {
  if(!showDeleteModal.value || deleteUsageWarning.value?.isInUse)return
  if (materialToDelete.value) {
    store.deleteMaterialPermanently(materialToDelete.value.id)
  }
  closeDeleteModal()
}

function onActionStockAdjustLot(matId, lotId) {
  closeActionMenu()
  openStockAdjust(matId, lotId)
}

function onActionWasteLot(matId, lotId) {
  closeActionMenu()
  store.openWasteModal(matId, lotId)
}

function onActionSwitchLot(matId, lotId) {
  closeActionMenu()
  store.switchActiveLot(matId, lotId, true)
}

// -------------------------------------------------------------
// Floating Bottom Save Bar Logic (Real Final Save at Main Stock Popup)
// -------------------------------------------------------------
const showDraftDetails = ref(false)

function savePendingChanges() {
  const result=store.commitStockDrafts()
  if(result?.ok || result?.success)showDraftDetails.value = false
  else store.showToast(result?.message||'บันทึกไม่สำเร็จ แบบร่างยังอยู่ กรุณาลองอีกครั้ง','error')
}

async function revertPendingChanges() {
  const discard=await store.confirmDialog({title:'ยกเลิกแบบร่างทั้งหมด?',message:'ยอดในแบบร่างจะกลับไปเป็นยอดที่บันทึกไว้ก่อนหน้า',type:'danger',confirmText:'ยกเลิกแบบร่าง',cancelText:'เก็บแบบร่างไว้'})
  if(!discard)return
  store.discardStockDrafts()
  showDraftDetails.value = false
}

// -------------------------------------------------------------
// Filters & Other Helpers
// -------------------------------------------------------------
const kinds = computed(() => [{id:'all',label:'ทุกประเภท'}, ...store.materialKindOptions])

const deletedCount = computed(() => {
  return store.materials.filter(m => m.isDeleted).length
})

const filteredMaterials = computed(() => {
  return store.materials.filter(m => {
    // Deleted filter
    if (!showDeleted.value && m.isDeleted) return false

    if (!matchesMaterialFilter(m, store.materialUsageById.get(m.id), {kind:selectedKind.value,role:selectedRole.value})) return false

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchUnit = m.unit?.toLowerCase().includes(q)
      const matchCat = getMaterialKindLabel(m).toLowerCase().includes(q)
      if (!matchName && !matchId && !matchUnit && !matchCat) return false
    }

    return true
  })
})

function openCreateMaterial() {
  store.modals.materialEdit = { isOpen: true, materialId: null }
}

function openEditMaterial(id) {
  store.modals.materialEdit = { isOpen: true, materialId: id }
}

function openStockIn(id = null) {
  store.modals.stockIn = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null)
  }
}

function openStockAdjust(id = null, lotId = null) {
  store.modals.stockAdjust = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null),
    lotId: lotId || null
  }
}

function openStocktake() {
  store.openStocktakeModal()
}

function archiveMaterial(mat) {
  store.softDeleteMaterial(mat.id)
}

function getDisplayPackCost(mat) {
  const pCost = Number(mat.packCost)
  if (pCost && pCost > 0) return pCost
  const uCost = Number(mat.unitCost) || 0
  const pSize = Number(mat.packSize) || 1
  return Math.round(uCost * pSize * 100) / 100
}
</script>

<style scoped src="@/components/catalog/catalogManagement.css"></style>

<style scoped>.stock-context-actions{display:grid;gap:10px}</style>