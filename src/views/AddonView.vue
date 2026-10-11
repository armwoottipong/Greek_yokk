<template>
  <div class="space-y-4">
    <CatalogToolbar id="addon-catalog" label="Add-on" v-model:search="searchQuery" placeholder="ค้นหาชื่อ Add-on" :category="selectedCategory" :platform="displayPlatformId" :categories="addonFilterCategories" :platforms="store.platforms" @apply-filters="applyCatalogFilters" @add="openAddAddon" />
    <div class="adaptive-catalog-list"><AddonCard v-for="addon in filteredAddons" :key="addon.id" :addon="addon" :platforms="store.platforms" :selected-id="displayPlatformId" @details="detailAddonId=$event" @edit="editAddon" @delete="deleteAddon" /><p v-if="!filteredAddons.length" class="interface-empty">ไม่พบ Add-on ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div>
    <DialogFrame id="addon-details" title="รายละเอียด Add-on" :open="Boolean(detailAddonId)" presentation="sheet" @request-close="detailAddonId=null"><template v-if="detailAddon"><h4 class="font-semibold">{{ detailAddon.name }}</h4><PlatformPriceSummary all :prices="detailAddon.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId" /><h4 class="mt-6 font-semibold">วัตถุดิบที่ตัดจากคลัง</h4><p class="mt-3">{{ store.matMap[detailAddon.materialId]?.name||'ไม่พบวัตถุดิบ' }} · {{ detailAddon.amountUsed }} {{ store.matMap[detailAddon.materialId]?.unit||'' }}</p></template><p v-else>ไม่พบ Add-on รายการนี้อาจถูกลบแล้ว</p><template #footer><Button v-if="detailAddon" @click="editAddon(detailAddon.id);detailAddonId=null">แก้ไข Add-on</Button></template></DialogFrame>
    <!-- Addons Management Table -->
    <div class="desktop-catalog-table editorial-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50/70 text-stone-400 font-medium border-b border-stone-100">
            <tr>
              <th class="py-3 px-4">ชื่อ Add-on</th>
              <th class="py-3 px-4">หมวดหมู่</th>
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
                <span class="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-medium">
                  {{ addon.category }}
                </span>
              </td>

              <td class="py-3.5 px-4">
                <PlatformPriceSummary :prices="addon.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId" />
              </td>

              <td class="py-3.5 px-4">
                <div v-if="addon.materialId && store.matMap[addon.materialId]" class="flex items-center gap-1.5 text-stone-800">
                  <span>{{ store.matMap[addon.materialId].emoji }}</span>
                  <span class="font-medium">{{ store.matMap[addon.materialId].name }}</span>
                  <span class="text-stone-400">({{ addon.amountUsed }} {{ store.matMap[addon.materialId].unit }})</span>
                </div>
                <span v-else class="text-stone-300">-</span>
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
                    class="p-1 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
const searchQuery = ref('')
const selectedCategory = ref('ทั้งหมด')
const displayPlatformId=ref(store.platforms[0]?.id||'')
watch(()=>store.platforms.map(p=>p.id),ids=>{if(!ids.includes(displayPlatformId.value))displayPlatformId.value=ids[0]||''})
function applyCatalogFilters(values){selectedCategory.value=values.category;displayPlatformId.value=values.platform}
const addonFilterCategories=computed(()=>[...new Set([...store.addonCategories.map(c=>c.name),...store.addons.map(a=>a.category)].filter(Boolean))])

const otherAddonCategories = computed(() => {
  const storeCatNames = store.addonCategories.map(c => c.name)
  const others = new Set()
  store.addons.forEach(a => {
    if (a.category && !storeCatNames.includes(a.category)) {
      others.add(a.category)
    }
  })
  return Array.from(others)
})

const filteredAddons = computed(() => {
  return store.addons.filter(a => {
    const matchCat = selectedCategory.value === 'ทั้งหมด' || a.category === selectedCategory.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || a.name.toLowerCase().includes(q)
    return matchCat && matchQ
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
