<template>
  <div class="space-y-4">
    <!-- Header with Search & Add Menu Button -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <!-- Search input -->
        <div class="relative w-64">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อเมนู, วัตถุดิบ..."
            class="soft-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <!-- Category filter -->
        <select
          v-model="selectedCategory"
          class="soft-input px-3 py-2 rounded-xl text-xs text-stone-700 font-medium"
        >
          <option value="ทั้งหมด">ทุกหมวดหมู่ ({{ store.menus.length }})</option>
          <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
      </div>

      <!-- Add Menu Button -->
      <button
        @click="openAddMenu"
        class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
      >
        <Plus class="w-4 h-4" />
        <span>เพิ่มเมนูใหม่</span>
      </button>
    </div>

    <!-- Menus Management Table -->
    <div class="editorial-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50/70 text-stone-400 font-medium border-b border-stone-100">
            <tr>
              <th class="py-3 px-4">เมนู</th>
              <th class="py-3 px-4">หมวดหมู่</th>
              <th class="py-3 px-4">ราคาตามแต่ละ Platform</th>
              <th class="py-3 px-4">สูตรวัตถุดิบ & บรรจุภัณฑ์ (BOM)</th>
              <th class="py-3 px-4 text-center">สิทธิ์</th>
              <th class="py-3 px-4 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-if="filteredMenus.length === 0">
              <td colspan="6" class="py-8 text-center text-stone-400 italic">
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
                  <span class="text-2xl p-1.5 rounded-xl bg-[#FAF9F6] border border-stone-100">{{ menu.emoji }}</span>
                  <div>
                    <div class="font-bold text-stone-900">{{ menu.name }}</div>
                    <div class="text-[10px] text-stone-400 truncate max-w-xs">{{ menu.description }}</div>
                  </div>
                </div>
              </td>

              <!-- Category -->
              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-medium">
                  {{ menu.category }}
                </span>
              </td>

              <!-- Platform Prices -->
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    v-for="p in store.platforms"
                    :key="p.id"
                    class="bg-[#F5F4F0] px-2 py-0.5 rounded-md text-stone-700 font-number font-medium"
                  >
                    {{ p.name.replace(/\s*\([^)]*\)/g, '') }}: ฿{{ menu.prices?.[p.id] !== undefined ? menu.prices[p.id] : '-' }}
                  </span>
                </div>
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
                    class="p-1 text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
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
    <Teleport to="body">
      <div
        v-if="isBomModalOpen && selectedMenuForBom"
        class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-stone-900/50 backdrop-blur-xs"
        @click.self="closeBomModal"
      >
      <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <!-- Modal Header -->
        <div class="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
          <div class="flex items-center gap-3">
            <span class="text-3xl p-1.5 rounded-xl bg-[#FAF9F6] border border-stone-100">
              {{ selectedMenuForBom.emoji }}
            </span>
            <div>
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-stone-900">{{ selectedMenuForBom.name }}</h3>
                <span class="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-medium">
                  {{ selectedMenuForBom.category }}
                </span>
              </div>
              <p class="text-[11px] text-stone-400 mt-0.5">สูตรวัตถุดิบ & บรรจุภัณฑ์ (BOM)</p>
            </div>
          </div>
          <button
            @click="closeBomModal"
            class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          <!-- Cost & Margin Summary Cards -->
          <div class="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/50 text-center">
            <div>
              <span class="block text-[10px] text-stone-400 mb-0.5">ต้นทุนวัตถุดิบรวม</span>
              <span class="font-number font-bold text-rose-700 text-sm">
                ฿{{ selectedMenuFoodCost.toFixed(2) }}
              </span>
            </div>
            <div>
              <span class="block text-[10px] text-stone-400 mb-0.5">ราคาขายหน้าร้าน</span>
              <span class="font-number font-bold text-stone-900 text-sm">
                ฿{{ selectedMenuStorePrice }}
              </span>
            </div>
            <div>
              <span class="block text-[10px] text-stone-400 mb-0.5">กำไรขั้นต้น (GP)</span>
              <span class="font-number font-bold text-emerald-800 text-sm">
                {{ selectedMenuGpPercent.toFixed(1) }}%
              </span>
            </div>
          </div>

          <!-- Recipe & Packaging Items -->
          <div class="space-y-2">
            <div class="flex items-center justify-between text-stone-700 font-medium">
              <span class="flex items-center gap-1.5 text-xs">
                <span>📋</span>
                <span>รายการวัตถุดิบที่ใช้ต่อ 1 เสิร์ฟ</span>
              </span>
              <span class="text-[10px] text-stone-400">{{ (selectedMenuForBom.recipe || []).length }} รายการ</span>
            </div>

            <div v-if="!selectedMenuForBom.recipe || selectedMenuForBom.recipe.length === 0" class="text-stone-400 text-center py-6 italic bg-stone-50 rounded-xl">
              ยังไม่มีการผูกสูตรวัตถุดิบในเมนูนี้
            </div>

            <div v-else class="space-y-1.5">
              <div
                v-for="(item, idx) in detailedRecipeItems"
                :key="idx"
                class="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F6] border border-stone-200/50 hover:bg-[#F5F4F0] transition-colors"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-xl shrink-0">{{ item.mat?.emoji || '🥣' }}</span>
                  <div class="min-w-0">
                    <div class="font-medium text-stone-900 truncate flex items-center gap-1.5">
                      <span>{{ item.mat?.name || item.materialId }}</span>
                      <span
                        class="text-[9px] px-1.5 py-0.2 rounded font-normal"
                        :class="item.mat?.category === 'Packaging' ? 'bg-amber-100/70 text-amber-900' : 'bg-stone-200/60 text-stone-700'"
                      >
                        {{ item.mat?.category === 'Packaging' ? 'บรรจุภัณฑ์' : 'วัตถุดิบ' }}
                      </span>
                    </div>
                    <div class="text-[10px] text-stone-400 flex items-center gap-2 mt-0.5">
                      <span>คงเหลือในคลัง: {{ (item.mat?.stock || 0).toLocaleString() }} {{ item.mat?.unit }}</span>
                      <span v-if="item.servingsAvailable !== null" class="text-emerald-700 font-medium">
                        (พอขาย ~{{ item.servingsAvailable }} เสิร์ฟ)
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Qty and Cost -->
                <div class="text-right shrink-0">
                  <div class="font-number font-bold text-stone-900">
                    {{ item.qty.toLocaleString() }} {{ item.mat?.unit }}
                  </div>
                  <div class="text-[10px] text-stone-400 font-number mt-0.5">
                    @ ฿{{ Number(item.mat?.unitCost || 0).toFixed(4) }} =
                    <strong class="text-stone-700">฿{{ item.cost.toFixed(2) }}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Platform Prices Overview -->
          <div class="pt-2 border-t border-stone-100">
            <span class="text-[11px] font-medium text-stone-500 block mb-1.5">ราคาขายตามแต่ละช่องทาง (Platform Prices)</span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
              <div
                v-for="p in store.platforms"
                :key="p.id"
                class="p-2 rounded-lg bg-stone-50 border border-stone-100"
              >
                <span class="block text-[10px] text-stone-400 truncate">{{ p.name.replace(/\s*\([^)]*\)/g, '') }}</span>
                <span class="font-number font-bold text-stone-800">
                  ฿{{ selectedMenuForBom.prices?.[p.id] !== undefined ? selectedMenuForBom.prices[p.id] : '-' }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="px-6 py-3.5 border-t border-stone-100 bg-white flex items-center justify-between shrink-0">
          <button
            type="button"
            @click="closeBomModal"
            class="px-4 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
          >
            ปิด
          </button>
          <button
            type="button"
            @click="editFromBom"
            class="px-5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Edit3 class="w-3.5 h-3.5" />
            <span>แก้ไขเมนู & สูตรนี้</span>
          </button>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, Plus, Trash2, Eye, X, Edit3 } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedCategory = ref('ทั้งหมด')

// BOM Modal State
const isBomModalOpen = ref(false)
const selectedMenuForBom = ref(null)

const categories = computed(() => {
  const set = new Set()
  store.menus.forEach(m => { if (m.category) set.add(m.category) })
  return Array.from(set)
})

const filteredMenus = computed(() => {
  return store.menus.filter(m => {
    const matchCat = selectedCategory.value === 'ทั้งหมด' || m.category === selectedCategory.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchCat && matchQ
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
  if (!selectedMenuForBom.value) return 0
  return Number(selectedMenuForBom.value.prices?.['PLAT01']) || 0
})

const selectedMenuGpPercent = computed(() => {
  const price = selectedMenuStorePrice.value
  const cost = selectedMenuFoodCost.value
  if (price <= 0) return 0
  return Math.max(0, ((price - cost) / price) * 100)
})

function openAddMenu() {
  store.modals.menuEdit = { isOpen: true, menuId: null }
}

function editMenu(menuId) {
  store.modals.menuEdit = { isOpen: true, menuId }
}

function deleteMenu(menu) {
  if (confirm(`คุณต้องการลบเมนู "${menu.name}" หรือไม่?`)) {
    store.deleteMenu(menu.id)
  }
}
</script>
