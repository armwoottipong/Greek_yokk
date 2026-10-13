<template>
  <div class="space-y-4">
    <CatalogToolbar id="menu-catalog" label="เมนู" v-model:search="searchQuery" placeholder="ค้นหาชื่อหรือคำอธิบายเมนู" :platform="displayPlatformId" :platforms="store.platforms" @apply-filters="applyCatalogFilters" @add="openAddMenu" />
    <div class="adaptive-catalog-list"><MenuCard v-for="menu in filteredMenus" :key="menu.id" :menu="menu" :platforms="store.platforms" :selected-id="displayPlatformId" @details="openBomModal" @edit="editMenu" @delete="deleteMenu" /><p v-if="!filteredMenus.length" class="interface-empty">ไม่พบเมนู ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p></div>
    <!-- Menus Management Table -->
    <div class="desktop-catalog-table editorial-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50/70 text-stone-400 font-medium border-b border-stone-100">
            <tr>
              <th class="py-3 px-4">เมนู</th>
              <th class="py-3 px-4">ราคาตามแต่ละ Platform</th>
              <th class="py-3 px-4">สูตรวัตถุดิบ & บรรจุภัณฑ์ (BOM)</th>
              <th class="py-3 px-4 text-center">สิทธิ์</th>
              <th class="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-if="filteredMenus.length === 0">
              <td colspan="5" class="py-8 text-center text-stone-400 italic">
                ไม่พบข้อมูลเมนูที่ค้นหา
              </td>
            </tr>
            <tr
              v-for="menu in filteredMenus"
              :key="menu.id"
              class="hover:bg-stone-50/70 transition-colors"
            >
              <!-- Name & Icon -->
              <td class="py-3.5 px-4">
                <div class="flex items-center gap-2.5">
                  <span class="text-2xl p-1.5 rounded-xl bg-[#FBF5EA] border border-stone-100">{{ menu.emoji }}</span>
                  <div>
                    <div class="font-bold text-stone-900">{{ menu.name }}</div>
                    <div class="text-[10px] text-stone-400 truncate max-w-xs">{{ menu.description }}</div>
                  </div>
                </div>
              </td>

              <!-- Platform Prices -->
              <td class="py-3.5 px-4">
                <PlatformPriceSummary :prices="menu.prices||{}" :platforms="store.platforms" :selected-id="displayPlatformId" />
              </td>

              <!-- BOM Recipe Collapsed Button (ยุบเป็นปุ่มกดเพื่อเปิด popup) -->
              <td class="py-3.5 px-4">
                <button
                  type="button"
                  @click="openBomModal(menu)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-medium transition-all hover:shadow-2xs group"
                  title="คลิกเพื่อดูสูตรวัตถุดิบและบรรจุภัณฑ์ (BOM)"
                >
                  <span>🥣</span>
                  <span class="font-semibold">{{ menu.recipe?.length || 0 }} รายการ</span>
                  <Eye class="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-800 ml-0.5 transition-colors" />
                </button>
              </td>

              <!-- Permissions Badges -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1 text-[10px]">
                  <span
                    :class="[
                      'px-1.5 py-0.5 rounded font-medium',
                      menu.hasAddons ? 'bg-purple-100 text-purple-800' : 'bg-stone-100 text-stone-400'
                    ]"
                  >
                    {{ menu.hasAddons ? '🍓 Add-on' : 'ไม่มี Add-on' }}
                  </span>
                  <span
                    :class="[
                      'px-1.5 py-0.5 rounded font-medium',
                      menu.hasPackage ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-400'
                    ]"
                  >
                    {{ menu.hasPackage ? '📦 Package' : 'ไม่ตัด Pack' }}
                  </span>
                </div>
              </td>

              <!-- Actions -->
              <td class="py-3.5 px-4 text-center">
                <div class="flex items-center justify-center gap-1.5">
                  <button
                    @click="editMenu(menu.id)"
                    class="px-2.5 py-1 text-xs text-stone-700 hover:text-stone-900 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
                  >
                    แก้ไข
                  </button>
                  <button
                    @click="deleteMenu(menu)"
                    class="p-1 text-stone-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="ลบเมนู"
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

    <!-- ======================================================== -->
    <!-- POPUP MODAL: รายละเอียดสูตรวัตถุดิบ & บรรจุภัณฑ์ (BOM)       -->
    <!-- ======================================================== -->
    <MenuRecipeDetails :open="isBomModalOpen" :menu="selectedMenuForBom && store.menus.find(m=>m.id===selectedMenuForBom.id)" :items="detailedRecipeItems" :food-cost="selectedMenuFoodCost" :store-price="selectedMenuStorePrice" :margin="selectedMenuGpPercent" :platforms="store.platforms" :selected-id="displayPlatformId" @close="closeBomModal" @edit="editFromBom" />
  </div>
</template>

<script setup>
import MenuCard from '@/components/catalog/MenuCard.vue'
import MenuRecipeDetails from '@/components/catalog/MenuRecipeDetails.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import CatalogToolbar from '@/components/catalog/CatalogToolbar.vue'
import PlatformPriceSummary from '@/components/catalog/PlatformPriceSummary.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, Plus, Trash2, Eye, X, Edit3 } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const displayPlatformId=ref(store.platforms[0]?.id||'')
watch(()=>store.platforms.map(p=>p.id),ids=>{if(!ids.includes(displayPlatformId.value))displayPlatformId.value=ids[0]||''})
function applyCatalogFilters(values){displayPlatformId.value=values.platform}


// BOM Modal State
const isBomModalOpen = ref(false)
const selectedMenuForBom = ref(null)

const filteredMenus = computed(() => {
  return store.menus.filter(m => {
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchQ
  })
})

function openBomModal(menu) {
  selectedMenuForBom.value = menu
  isBomModalOpen.value = true
}

function closeBomModal() {
  isBomModalOpen.value = false
  selectedMenuForBom.value = null
}

function editFromBom() {
  if (selectedMenuForBom.value) {
    const menuId = selectedMenuForBom.value.id
    closeBomModal()
    editMenu(menuId)
  }
}

// Compute detailed recipe items for the selected menu
const detailedRecipeItems = computed(() => {
  if (!selectedMenuForBom.value || !selectedMenuForBom.value.recipe) return []
  return selectedMenuForBom.value.recipe.map(r => {
    const mat = store.matMap[r.materialId]
    const qty = Number(r.qty) || 0
    const unitCost = mat ? Number(mat.unitCost) || 0 : 0
    const cost = qty * unitCost
    const stock = mat ? Number(mat.stock) || 0 : 0
    const servingsAvailable = qty > 0 ? Math.floor(stock / qty) : null

    return {
      materialId: r.materialId,
      qty,
      mat,
      cost,
      servingsAvailable
    }
  })
})

const selectedMenuFoodCost = computed(() => {
  return detailedRecipeItems.value.reduce((sum, item) => sum + item.cost, 0)
})

const selectedMenuStorePrice = computed(() => {
  const value=selectedMenuForBom.value?.prices?.PLAT01
  if(value===undefined||value===null||value==='')return null
  return Number.isFinite(Number(value))?Number(value):null
})

const selectedMenuGpPercent = computed(() => {
  const price = selectedMenuStorePrice.value
  const cost = selectedMenuFoodCost.value
  if (price === null || price <= 0) return null
  return Math.max(0, ((price - cost) / price) * 100)
})

function openAddMenu() {
  store.modals.menuEdit = { isOpen: true, menuId: null }
}

function editMenu(menuId) {
  store.modals.menuEdit = { isOpen: true, menuId }
}

async function deleteMenu(menu) {
  if (await store.confirmDialog({title:'ลบเมนู?',message:menu.name+' · '+menu.id,confirmText:'ลบเมนู',cancelText:'ยกเลิก',type:'danger'})) {
    store.deleteMenu(menu.id)
  }
}
</script>

