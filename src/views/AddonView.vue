<template>
  <div class="space-y-4">
    <CatalogToolbar id="addon-catalog" label="Add-on" v-model:search="searchQuery" placeholder="ค้นหาชื่อ Add-on" :platform="displayPlatformId" :platforms="store.platforms" @apply-filters="applyCatalogFilters" @add="openAddAddon" />
    <div class="adaptive-catalog-list"><AddonCard v-for="addon in filteredAddons" :key="addon.id" :addon="addon" :platforms="store.platforms" :selected-id="displayPlatformId" @details="detailAddonId=$event" @edit="editAddon" @delete="deleteAddon" /><p v-if="!filteredAddons.length" class="interface-empty">ไม่พบ Add-on ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div>
    <DialogFrame id="addon-details" title="รายละเอียด Add-on" :open="Boolean(detailAddonId)" presentation="sheet" @request-close="detailAddonId=null">
      <template v-if="detailAddon">
        <h4 class="font-semibold">{{ detailAddon.name }}</h4>
        <PlatformPriceSummary all :prices="detailAddon.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId" />
        <p v-if="!detailAddon.recipe?.length" class="mt-3">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์</p>
        <section v-for="group in detailRecipeGroups" :key="group.type" :data-addon-ingredients="group.type === 'ingredient' ? '' : undefined" :data-addon-packaging="group.type === 'packaging' ? '' : undefined" :aria-label="group.label" class="mt-6 space-y-3">
          <div class="flex items-center justify-between gap-3">
            <h4 class="font-semibold">{{ group.label }}</h4>
            <span class="text-xs text-stone-500">ต้นทุนประมาณ ฿{{ group.cost.toFixed(2) }}</span>
          </div>
          <p v-if="!group.rows.length" class="text-sm text-stone-500">ไม่มีรายการ{{ group.label }}</p>
          <ul v-else class="space-y-2 text-sm">
            <li v-for="(row, idx) in group.rows" :key="idx">{{ row.material.name }} · {{ row.qty }} {{ row.material.unit }}<span v-if="row.material.isDeleted || row.material.isArchived" class="text-amber-700"> · ถูกจัดเก็บ กรุณาแก้ไขสูตร</span></li>
          </ul>
        </section>
        <p v-for="(row, idx) in missingDetailRows" :key="idx" role="status" class="mt-3 text-amber-700">ไม่พบวัตถุดิบ {{ row.materialId }} · {{ row.qty }} กรุณาแก้ไข Add-on เพื่อเลือกใหม่หรือลบรายการจากสูตร</p>
      </template>
      <p v-else>ไม่พบ Add-on รายการนี้อาจถูกลบแล้ว</p>
      <template #footer><Button v-if="detailAddon" @click="editAddon(detailAddon.id);detailAddonId=null">แก้ไข Add-on</Button></template>
    </DialogFrame>
    <!-- Addons Management Table -->
    <div class="desktop-catalog-table editorial-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50/70 text-stone-400 font-medium border-b border-stone-100">
            <tr>
              <th class="py-3 px-4">ชื่อ Add-on</th>
              <th class="py-3 px-4">ราคาตามแต่ละ Platform</th>
              <th class="py-3 px-4">ผูกตัดวัตถุดิบในคลัง</th>
              <th class="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-if="filteredAddons.length === 0">
              <td colspan="5" class="py-8 text-center text-stone-400 italic">
                ไม่พบข้อมูล Add-on ที่ค้นหา
              </td>
            </tr>
            <tr
              v-for="addon in filteredAddons"
              :key="addon.id"
              class="hover:bg-stone-50/70 transition-colors"
            >
              <td class="py-3.5 px-4 font-semibold text-stone-900 flex items-center gap-2.5">
                <span class="text-2xl p-1.5 rounded-xl bg-[#FBF5EA] border border-stone-100">{{ addon.emoji || '🍓' }}</span>
                <span>{{ addon.name }}</span>
              </td>


              <td class="py-3.5 px-4">
                <PlatformPriceSummary :prices="addon.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId" />
              </td>

              <td class="py-3.5 px-4">
                <div v-for="(row, idx) in addon.recipe || []" :key="idx" class="flex items-center gap-1.5 text-stone-800">
                  <template v-if="store.matMap[row.materialId]">
                    <span>{{ store.matMap[row.materialId].emoji }}</span>
                    <span class="font-medium">{{ store.matMap[row.materialId].name }}</span>
                    <span class="text-stone-400">({{ row.qty }} {{ store.matMap[row.materialId].unit }})</span>
                  </template>
                  <span v-else class="text-stone-500">ไม่พบวัตถุดิบ {{ row.materialId }} · แก้ไขเพื่อเลือกใหม่</span>
                </div>
                <span v-if="!addon.recipe?.length" class="text-stone-500">ไม่ตัดวัตถุดิบหรือบรรจุภัณฑ์</span>
              </td>

              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="editAddon(addon.id)"
                    class="px-2.5 py-1 text-xs text-stone-700 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button
                    @click="deleteAddon(addon)"
                    class="p-1 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="ลบ Add-on"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import AddonCard from '@/components/catalog/AddonCard.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import CatalogToolbar from '@/components/catalog/CatalogToolbar.vue'
import PlatformPriceSummary from '@/components/catalog/PlatformPriceSummary.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, Plus, Trash2 } from 'lucide-vue-next'

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
