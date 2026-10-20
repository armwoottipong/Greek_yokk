<template>
 <div class="menu-workspace addon-workspace">
  <header class="addon-intro"><div><h2>จัดการ Add-on</h2><p>กำหนดท็อปปิ้ง ราคา และสูตรที่ใช้ในแต่ละเมนู</p></div></header>
  <nav class="addon-sections" aria-label="ส่วนจัดการ Add-on">
   <button type="button" data-addon-section="addons" :aria-pressed="activeSection==='addons'" aria-controls="addon-directory" @click="activeSection='addons'">รายการ Add-on <span>{{ store.addons.length }}</span></button>
   <button type="button" data-addon-section="groups" :aria-pressed="activeSection==='groups'" aria-controls="addon-groups" @click="activeSection='groups'">กลุ่มตัวเลือก <span>{{ store.addonGroups.length }}</span></button>
  </nav>
  <CatalogToolbar v-show="activeSection==='addons'" id="addon-catalog" label="Add-on" v-model:search="searchQuery" placeholder="ค้นหาชื่อ Add-on" :platform="displayPlatformId" :platforms="store.platforms" inline-platform @apply-filters="applyCatalogFilters" @add="openAddAddon"/>
  <AddonGroupManager id="addon-groups" v-show="activeSection==='groups'"/>
  <section id="addon-directory" v-show="activeSection==='addons'" class="menu-directory" aria-label="รายการ Add-on">
   <header class="menu-directory-heading"><h3>รายการ Add-on</h3><span role="status">{{ filteredAddons.length }} รายการ</span></header>
   <div v-if="filteredAddons.length" class="addon-columns" aria-hidden="true"><span>ชื่อ Add-on</span><span>สูตรต่อ 1 ที่</span><span>ราคาบวกเพิ่ม</span><span>จัดการ</span></div><div class="menu-directory-list"><AddonCard v-for="addon in filteredAddons" :key="addon.id" :addon="addon" :platforms="store.platforms" :selected-id="displayPlatformId" :ingredient-count="(addon.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType!=='packaging').length" :package-count="(addon.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType==='packaging').length" @details="detailAddonId=$event" @edit="editAddon" @delete="deleteAddon"/></div>
   <div v-if="!filteredAddons.length" class="menu-directory-empty"><strong>{{ searchQuery?'ไม่พบ Add-on ที่ค้นหา':'ยังไม่มี Add-on' }}</strong><p>{{ searchQuery?'ลองค้นหาด้วยชื่ออื่น':'เพิ่มท็อปปิ้งแรก พร้อมกำหนดราคาและสูตรที่ใช้' }}</p><Button v-if="searchQuery" variant="secondary" @click="searchQuery=''">แสดง Add-on ทั้งหมด</Button><Button v-else @click="openAddAddon">เพิ่ม Add-on แรก</Button></div>
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
const activeSection = ref('addons')

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

<style scoped src="@/components/catalog/catalogManagement.css">@media(max-width:767px){.addon-workspace :deep(.app-input input){font-size:1rem}}
</style>
<style scoped src="@/components/catalog/catalogRecipe.css">@media(max-width:767px){.addon-workspace :deep(.app-input input){font-size:1rem}}
</style>

<style scoped>
.addon-workspace{--addon-text-secondary:#705C50;gap:20px}
.addon-intro h2{font-size:1.25rem;font-weight:600;line-height:1.5}.addon-intro p{margin-top:4px;color:var(--addon-text-secondary);font-size:.875rem;line-height:1.7}
.addon-sections{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--border-subtle);padding-bottom:12px}
.addon-sections button{display:flex;align-items:center;gap:10px;min-height:48px;padding:10px 16px;border-radius:10px;font-size:.875rem;color:var(--addon-text-secondary);cursor:pointer}
.addon-sections button[aria-pressed=true]{background:var(--bg-card);color:var(--accent-brand);font-weight:600}
.addon-sections button span{font-size:.75rem;font-variant-numeric:tabular-nums;background:var(--bg-soft);border-radius:8px;min-width:24px;padding:2px 6px;text-align:center}
.addon-columns{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(140px,.7fr) minmax(120px,.6fr) 108px;gap:20px;padding:0 20px 12px;color:var(--addon-text-secondary);font-size:.75rem}
.addon-workspace :deep(.menu-row-recipe small),.addon-workspace :deep(.menu-row-name small),.addon-workspace :deep(.menu-row-price .platform-price span){color:var(--addon-text-secondary);font-size:.75rem}
.addon-workspace :deep(.menu-row-price .platform-price strong){color:var(--text-main);font-variant-numeric:tabular-nums}
.addon-workspace :deep(:focus-visible){outline:none!important;box-shadow:none!important}
@media(hover:hover){.addon-sections button:hover{background:var(--bg-card);color:var(--accent-brand)}}
@media(max-width:1100px){.addon-columns{display:none}}
@media(max-width:639px){.addon-intro h2{font-size:1.125rem}.addon-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.addon-sections button{padding:10px 8px;justify-content:center;font-size:.8125rem;gap:6px}.addon-workspace :deep(.app-input input){font-size:1rem}}
@media(max-width:767px){.addon-workspace :deep(.app-input input){font-size:1rem}}
</style>
