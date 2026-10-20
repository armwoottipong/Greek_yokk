<template>
 <div class="menu-workspace">
  <CatalogToolbar id="menu-catalog" label="เมนู" v-model:search="searchQuery" placeholder="ค้นหาชื่อหรือคำอธิบายเมนู" :platform="displayPlatformId" :platforms="store.platforms" inline-platform platform-tabs @apply-filters="applyCatalogFilters" @add="openAddMenu"/>
  <section id="menu-catalog-prices" role="tabpanel" :aria-labelledby="`menu-catalog-platform-${displayPlatformId}`" class="menu-directory" aria-label="รายการเมนู">
   <header class="menu-directory-heading"><h3>รายการเมนู</h3><span>{{ filteredMenus.length }} รายการ</span></header>
   <div class="menu-directory-list"><MenuCard v-for="menu in filteredMenus" :key="menu.id" :menu="menu" :platforms="store.platforms" :selected-id="displayPlatformId" :ingredient-count="(menu.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType!=='packaging').length" :package-count="(menu.recipe||[]).filter(r=>store.matMap[r.materialId]?.inventoryType==='packaging').length" @details="openBomModal" @edit="editMenu" @delete="deleteMenu"/></div>
   <div v-if="!filteredMenus.length" class="menu-directory-empty"><strong>{{ searchQuery?'ไม่พบเมนูที่ค้นหา':'ยังไม่มีเมนู' }}</strong><p>{{ searchQuery?'ลองค้นหาด้วยชื่อหรือคำอธิบายอื่น':'เพิ่มเมนูแรก พร้อมกำหนดราคาและสูตรที่ใช้' }}</p><Button v-if="searchQuery" variant="secondary" @click="searchQuery=''">แสดงเมนูทั้งหมด</Button></div>
  </section>
  <MenuRecipeDetails :open="isBomModalOpen" :menu="selectedMenu" :items="detailedRecipeItems" :food-cost="selectedMenuFoodCost" :pricing="selectedMenuPricing" :cost-estimate="selectedMenuCostEstimate" :platforms="store.platforms" :selected-id="displayPlatformId" @platform="displayPlatformId=$event" @close="closeBomModal" @edit="editFromBom"/>
 </div>
</template>
<script setup>
import { estimateMenuCosts } from '@/domain/menuCosts'
import MenuCard from '@/components/catalog/MenuCard.vue'
import MenuRecipeDetails from '@/components/catalog/MenuRecipeDetails.vue'
import Button from '@/components/ui/Button.vue'
import CatalogToolbar from '@/components/catalog/CatalogToolbar.vue'

import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'


const store = usePosStore()

const searchQuery = ref('')
const displayPlatformId=ref(store.platforms[0]?.id||'')
watch(()=>store.platforms.map(p=>p.id),ids=>{if(!ids.includes(displayPlatformId.value))displayPlatformId.value=ids[0]||''})
function applyCatalogFilters(values){displayPlatformId.value=values.platform}


// BOM Modal State
const isBomModalOpen = ref(false)
const selectedMenuForBom = ref(null)
const selectedMenu = computed(() => store.menus.find(m => m.id === selectedMenuForBom.value?.id))

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
  if (!selectedMenu.value?.recipe) return []
  return selectedMenu.value.recipe.map(r => {
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

const selectedMenuCostEstimate = computed(() => selectedMenu.value ? estimateMenuCosts(selectedMenu.value, store.addonGroups, store.addons, store.materials) : null)

const selectedMenuFoodCost = computed(() => {
  return detailedRecipeItems.value.reduce((sum, item) => sum + item.cost, 0)
})

const selectedMenuStorePrice = computed(() => {
  const value=selectedMenu.value?.prices?.[displayPlatformId.value]
  if(value===undefined||value===null||value==='')return null
  return Number.isFinite(Number(value))?Number(value):null
})

const selectedMenuPricing = computed(() => {
  const platform = store.platforms.find(p => p.id === displayPlatformId.value)
  const price = selectedMenuStorePrice.value
  const rate = platform ? Number(platform.gpPercent ?? 0) : NaN
  const gpPercent = Number.isFinite(rate) && rate >= 0 && rate <= 100 ? rate : null
  const gpAmount = price !== null && gpPercent !== null ? Math.round(price * (gpPercent / 100) * 100) / 100 : null
  const netRevenue = gpAmount === null ? null : Math.round((price - gpAmount) * 100) / 100
  const profit = netRevenue === null ? null : Math.round((netRevenue - selectedMenuFoodCost.value) * 100) / 100
  const margin = netRevenue > 0 ? profit / netRevenue * 100 : null
  return { platformName: platform?.name || 'ไม่พบช่องทางขาย', price, gpPercent, gpAmount, netRevenue, profit, margin }
})
const selectedMenuGpPercent = computed(() => selectedMenuPricing.value.margin)

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


<style scoped src="@/components/catalog/catalogManagement.css"></style>
