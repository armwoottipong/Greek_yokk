<template>
 <div class="menu-workspace">
  <CatalogToolbar id="addon-catalog" label="Add-on" v-model:search="searchQuery" placeholder="ค้นหาชื่อ Add-on" :platform="displayPlatformId" :platforms="store.platforms" inline-platform @apply-filters="applyCatalogFilters" @add="openAddAddon"/>
  <AddonGroupManager/>
  <section class="menu-directory" aria-label="รายการ Add-on">
   <header class="menu-directory-heading"><h3>รายการ Add-on</h3><span>{{ filteredAddons.length }} รายการ</span></header>
   <div class="menu-directory-list"><AddonCard v-for="addon in filteredAddons" :key="addon.id" :addon="addon" :platforms="store.platforms" :selected-id="displayPlatformId" :ingredient-count="(addon.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType!=='packaging').length" :package-count="(addon.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType==='packaging').length" @details="detailAddonId=$event" @edit="editAddon" @delete="deleteAddon"/></div>
   <div v-if="!filteredAddons.length" class="menu-directory-empty"><strong>{{ searchQuery?'ไม่พบ Add-on ที่ค้นหา':'ยังไม่มี Add-on' }}</strong><p>{{ searchQuery?'ลองค้นหาด้วยชื่ออื่น':'เพิ่มท็อปปิ้งแรก พร้อมกำหนดราคาและสูตรที่ใช้' }}</p><Button v-if="searchQuery" variant="secondary" @click="searchQuery=''">แสดง Add-on ทั้งหมด</Button></div>
  </section>
  <DialogFrame id="addon-details" :title="detailAddon?.name||'รายละเอียด Add-on'" description="สูตรและราคาบวกเพิ่มของ Add-on นี้" :open="Boolean(detailAddonId)" presentation="sheet" @request-close="detailAddonId=null">
   <template v-if="detailAddon">
    <section class="recipe-prices"><h4>ราคาบวกเพิ่มแต่ละช่องทาง</h4><PlatformPriceSummary all :prices="detailAddon.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId"/></section>
    <p v-if="!detailAddon.recipe?.length" class="recipe-help">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์</p>
    <section v-for="group in detailRecipeGroups" :key="group.type" :data-addon-ingredients="group.type==='ingredient'?'':undefined" :data-addon-packaging="group.type==='packaging'?'':undefined" :aria-label="group.label" class="recipe-group">
     <h4>{{ group.label }} <span>ต่อ 1 ที่ · {{ group.rows.length }} รายการ</span></h4>
     <p class="recipe-help">ต้นทุนประมาณ ฿{{ group.cost.toFixed(2) }}</p>
     <p v-if="!group.rows.length" class="recipe-help">ไม่มีรายการ{{ group.label }}</p>
     <article v-for="(row,idx) in group.rows" :key="idx" class="recipe-item"><div><strong>{{ row.material.name }}</strong><p>{{ row.qty }} {{ row.material.unit }}</p><small v-if="row.material.isDeleted||row.material.isArchived">ถูกจัดเก็บ กรุณาแก้ไขสูตร</small></div><b>฿{{ (Math.max(0,Number(row.qty)||0)*Math.max(0,Number(row.material.unitCost)||0)).toFixed(2) }}</b></article>
    </section>
    <p v-for="(row,idx) in missingDetailRows" :key="idx" role="status" class="stock-form-error">ไม่พบวัตถุดิบ {{ row.materialId }} · {{ row.qty }} กรุณาแก้ไข Add-on เพื่อเลือกใหม่หรือลบรายการจากสูตร</p>
   </template><p v-else>ไม่พบ Add-on รายการนี้อาจถูกลบแล้ว</p>
   <template #footer><Button variant="secondary" @click="detailAddonId=null">ปิด</Button><Button v-if="detailAddon" @click="editAddon(detailAddon.id);detailAddonId=null">แก้ไข Add-on</Button></template>
  </DialogFrame>
 </div>
</template>
<script setup>
import AddonCard from '@/components/catalog/AddonCard.vue'
import AddonGroupManager from '@/components/catalog/AddonGroupManager.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import CatalogToolbar from '@/components/catalog/CatalogToolbar.vue'
import PlatformPriceSummary from '@/components/catalog/PlatformPriceSummary.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'


const store = usePosStore()

const detailAddonId=ref(null)
const detailAddon=computed(()=>store.addons.find(a=>a.id===detailAddonId.value)||null)
const detailRecipeGroups = computed(() => [
  { type: 'ingredient', label: 'วัตถุดิบ' },
  { type: 'packaging', label: 'บรรจุภัณฑ์' }
].map(group => {
  const rows = (detailAddon.value?.recipe || []).map(row => ({ ...row, material: store.matMap[row.materialId] })).filter(row => row.material?.inventoryType === group.type)
  return { ...group, rows, cost: rows.reduce((sum, row) => sum + Math.max(0, Number(row.qty) || 0) * Math.max(0, Number(row.material.unitCost) || 0), 0) }
}))
const missingDetailRows = computed(() => (detailAddon.value?.recipe || []).filter(row => !store.matMap[row.materialId]))
const searchQuery = ref('')
const displayPlatformId=ref(store.platforms[0]?.id||'')
watch(()=>store.platforms.map(p=>p.id),ids=>{if(!ids.includes(displayPlatformId.value))displayPlatformId.value=ids[0]||''})
function applyCatalogFilters(values){displayPlatformId.value=values.platform}
const filteredAddons = computed(() => {
  return store.addons.filter(a => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || a.name.toLowerCase().includes(q)
    return matchQ
  })
})

function openAddAddon() {
  store.modals.addonEdit = { isOpen: true, addonId: null }
}

function editAddon(addonId) {
  store.modals.addonEdit = { isOpen: true, addonId }
}

async function deleteAddon(addon) {
  if (await store.confirmDialog({title:'ลบ Add-on?',message:addon.name+' · '+addon.id,confirmText:'ลบ Add-on',cancelText:'ยกเลิก',type:'danger'})) {
    store.deleteAddon(addon.id)
  }
}
</script>

<style scoped src="@/components/catalog/catalogManagement.css"></style>
<style scoped src="@/components/catalog/catalogRecipe.css"></style>
