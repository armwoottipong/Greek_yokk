<template>
  <div class="space-y-6">
    <!-- Top Header: Title & Quick Actions -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h2 class="text-xl font-bold text-stone-900 tracking-tight">คลังวัตถุดิบและบรรจุภัณฑ์ (Inventory & Stock)</h2>
        <p class="text-xs text-stone-400 mt-0.5">
          จัดการสต็อกวัตถุดิบหลัก (หน้าร้าน) & วัตถุดิบรอง (ผลิตเบสโยเกิร์ต), รับเข้า และตรวจนับยอดจริง
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="openStockIn()"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
        >
          <ArrowDownToLine class="w-4 h-4 text-emerald-600" />
          <span>รับเข้าสต็อก</span>
        </button>

        <button
          @click="openStockAdjust()"
          class="inline-flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
        >
          <SlidersHorizontal class="w-4 h-4 text-amber-600" />
          <span>ปรับยอดนับจริง</span>
        </button>

        <button
          @click="openCreateMaterial"
          class="inline-flex items-center gap-2 px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
        >
          <Plus class="w-4 h-4" />
          <span>เพิ่มวัตถุดิบใหม่</span>
        </button>
      </div>
    </div>

    <!-- Summary KPI Cards: Raw Material Budget & Inventory Valuation -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Total Valuation Card -->
      <div class="editorial-card p-5 bg-white border-l-4 border-l-amber-800">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>งบมูลค่าคลังวัตถุดิบรวม</span>
          <span class="p-1.5 rounded-lg bg-amber-50 text-amber-800">💰</span>
        </div>
        <div class="text-2xl font-bold font-number text-amber-950">
          ฿{{ store.totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[11px] text-stone-400 mt-1 flex items-center gap-1.5">
          <span>หลัก: {{ store.mainMaterials.length }}</span>
          <span>•</span>
          <span>รอง: {{ store.subMaterials.length }} รายการ</span>
        </div>
      </div>

      <!-- Reorder Budget Needed Card -->
      <div class="editorial-card p-5 bg-white border-l-4 border-l-rose-500">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>งบสั่งซื้อเติมสต็อกที่แนะนำ</span>
          <span class="p-1.5 rounded-lg bg-rose-50 text-rose-700">📦</span>
        </div>
        <div class="text-2xl font-bold font-number text-rose-800">
          ฿{{ store.reorderBudgetNeeded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          สำหรับเติมถึงระดับปลอดภัย 2x Min
        </div>
      </div>

      <!-- Low Stock Items Card -->
      <div class="editorial-card p-5 bg-white border-l-4 border-l-amber-500">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>วัตถุดิบต่ำกว่าเกณฑ์เตือน</span>
          <span class="p-1.5 rounded-lg bg-amber-50 text-amber-600">⚠️</span>
        </div>
        <div class="text-2xl font-bold font-number text-amber-800">
          {{ store.lowStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          ต้องสั่งซื้อเพิ่มก่อนของหมด
        </div>
      </div>

      <!-- Out of Stock Items Card -->
      <div class="editorial-card p-5 bg-white border-l-4 border-l-stone-400">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-1">
          <span>วัตถุดิบหมดสต็อก (0)</span>
          <span class="p-1.5 rounded-lg bg-stone-100 text-stone-600">🚫</span>
        </div>
        <div class="text-2xl font-bold font-number text-stone-800">
          {{ store.outOfStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          ระบบระงับขายเมนูที่เกี่ยวข้อง
        </div>
      </div>
    </div>

    <!-- Category Budget Breakdown Pills -->
    <div class="editorial-card p-4 bg-white">
      <div class="flex items-center justify-between mb-3 text-xs">
        <span class="font-bold text-stone-800">การกระจายงบต้นทุนตามหมวดหมู่วัตถุดิบ</span>
        <span class="text-stone-400">รวม 100% = ฿{{ store.totalInventoryValuation.toLocaleString(undefined, { maximumFractionDigits: 0 }) }}</span>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div
          v-for="cat in store.inventoryValuationByCategory"
          :key="cat.category"
          class="p-3 rounded-xl bg-stone-50 border border-stone-100 hover:bg-[#FAF9F6] transition-colors"
        >
          <div class="flex items-center justify-between text-[11px] text-stone-500 mb-1">
            <span class="font-semibold text-stone-800">{{ cat.category }}</span>
            <span class="font-number">{{ cat.itemCount }} ชนิด</span>
          </div>
          <div class="text-sm font-bold font-number text-amber-950">
            ฿{{ cat.totalValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) }}
          </div>
          <div class="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              class="bg-amber-800 h-full rounded-full transition-all duration-500"
              :style="{ width: `${store.totalInventoryValuation > 0 ? (cat.totalValue / store.totalInventoryValuation) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="editorial-card p-4 bg-white space-y-3">
      <!-- Row 1: Role Type (หลัก / รอง) & Search -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Ingredient Role Tabs (หลัก / รอง) -->
        <div class="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-semibold">
          <button
            @click="selectedRole = 'all'"
            :class="[
              'px-3.5 py-1.5 rounded-lg transition-all',
              selectedRole === 'all'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-500 hover:text-stone-900'
            ]"
          >
            ทั้งหมด ({{ store.activeMaterials.length }})
          </button>
          <button
            @click="selectedRole = 'main'"
            :class="[
              'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
              selectedRole === 'main'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-500 hover:text-emerald-800'
            ]"
          >
            <span>🥣 วัตถุดิบหลัก ({{ store.mainMaterials.length }})</span>
          </button>
          <button
            @click="selectedRole = 'sub'"
            :class="[
              'px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5',
              selectedRole === 'sub'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-stone-500 hover:text-purple-800'
            ]"
          >
            <span>🥛 วัตถุดิบรอง ({{ store.subMaterials.length }})</span>
          </button>
        </div>

        <!-- Search Input -->
        <div class="relative flex-1 max-w-sm">
          <Search class="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อวัตถุดิบ, รหัส, หน่วย..."
            class="soft-input w-full pl-9 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>
      </div>

      <!-- Row 2: Category Filter & Show Deleted Switch -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-stone-100">
        <!-- Category Filter Pills -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs font-medium">
          <button
            v-for="cat in categories"
            :key="cat.id"
            @click="selectedCategory = cat.id"
            :class="[
              'px-3 py-1 rounded-lg whitespace-nowrap transition-all text-xs',
              selectedCategory === cat.id
                ? 'bg-amber-900 text-white font-semibold shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            ]"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Show Deleted / Inactive Switch -->
        <div class="flex items-center gap-2 shrink-0">
          <label class="text-xs text-stone-500 cursor-pointer select-none flex items-center gap-2">
            <input
              type="checkbox"
              v-model="showDeleted"
              class="rounded border-stone-300 text-amber-900 focus:ring-amber-900"
            />
            <span>แสดงรายการที่ซ่อน ({{ deletedCount }})</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Material Inventory Table -->
    <div class="editorial-card bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-stone-200/80 bg-stone-50/50 text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
              <th class="py-3 px-4">วัตถุดิบ / สินค้า</th>
              <th class="py-3 px-4">ประเภท</th>
              <th class="py-3 px-4">หมวดหมู่</th>
              <th class="py-3 px-4">คงเหลือในคลัง</th>
              <th class="py-3 px-4">จุดเตือนขั้นต่ำ</th>
              <th class="py-3 px-4">ต้นทุน/หน่วย</th>
              <th class="py-3 px-4">มูลค่าสต็อกคงเหลือ</th>
              <th class="py-3 px-4">สถานะ</th>
              <th class="py-3 px-4 text-right">การจัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr
              v-for="mat in filteredMaterials"
              :key="mat.id"
              :class="[
                'hover:bg-[#FAF9F6] transition-colors',
                mat.isDeleted ? 'opacity-50 bg-stone-50/40' : ''
              ]"
            >
              <!-- Material Info -->
              <td class="py-3 px-4">
                <div class="flex items-center gap-2.5">
                  <span class="text-xl shrink-0">{{ mat.emoji }}</span>
                  <div>
                    <div class="font-bold text-stone-900 flex items-center gap-1.5">
                      <span>{{ mat.name }}</span>
                      <span v-if="mat.isDeleted" class="text-[10px] px-1.5 py-0.5 rounded bg-stone-200 text-stone-600 font-normal">ซ่อนอยู่</span>
                    </div>
                    <span class="text-[10px] text-stone-400 font-mono">{{ mat.id }}</span>
                  </div>
                </div>
              </td>

              <!-- Ingredient Role: หลัก / รอง -->
              <td class="py-3 px-4">
                <span
                  v-if="mat.isSubIngredient"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200/60"
                  title="วัตถุดิบรอง สำหรับหมัก/ผลิตกรีกโยเกิร์ต"
                >
                  <span>🥛</span>
                  <span>วัตถุดิบรอง</span>
                </span>
                <span
                  v-else-if="mat.hasSubRecipe"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/60"
                  title="วัตถุดิบหลัก ผลิตจากวัตถุดิบรอง"
                >
                  <span>🥣</span>
                  <span>หลัก (มีสูตรผลิต)</span>
                </span>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                  title="วัตถุดิบหลัก สั่งซื้อตรงหน้าร้าน"
                >
                  <span>📦</span>
                  <span>วัตถุดิบหลัก</span>
                </span>
              </td>

              <!-- Category -->
              <td class="py-3 px-4">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-700">
                  {{ mat.category || 'อื่นๆ' }}
                </span>
              </td>

              <!-- Stock Level -->
              <td class="py-3 px-4">
                <div class="space-y-1">
                  <div class="flex items-center gap-1.5 font-bold font-number text-sm">
                    <span
                      :class="[
                        mat.stock <= 0
                          ? 'text-rose-600'
                          : mat.stock <= mat.minAlert
                            ? 'text-amber-600'
                            : 'text-stone-900'
                      ]"
                    >
                      {{ mat.stock.toLocaleString() }}
                    </span>
                    <span class="text-xs font-normal text-stone-400">{{ mat.unit }}</span>
                  </div>
                  <div v-if="mat.packUnit && mat.packSize > 1" class="text-[10px] text-stone-400 font-normal">
                    ≈ {{ (mat.stock / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                  </div>
                  <!-- Progress buffer bar -->
                  <div class="w-24 bg-stone-100 h-1 rounded-full overflow-hidden">
                    <div
                      class="h-full rounded-full transition-all"
                      :class="[
                        mat.stock <= 0
                          ? 'bg-rose-500'
                          : mat.stock <= mat.minAlert
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                      ]"
                      :style="{ width: `${Math.min(100, (mat.stock / (mat.minAlert * 2 || 1)) * 100)}%` }"
                    ></div>
                  </div>
                </div>
              </td>

              <!-- Min Alert -->
              <td class="py-3 px-4 font-number text-stone-600">
                <div>{{ mat.minAlert.toLocaleString() }} <span class="text-[10px] text-stone-400">{{ mat.unit }}</span></div>
                <div v-if="mat.packUnit && mat.packSize > 1" class="text-[10px] text-stone-400 font-normal">
                  ≈ {{ (mat.minAlert / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                </div>
              </td>

              <!-- Unit Cost -->
              <td class="py-3 px-4 font-number text-stone-700">
                <div>
                  ฿{{ Number(mat.unitCost || 0).toFixed(4) }}
                  <span class="text-[10px] text-stone-400">/{{ mat.unit }}</span>
                </div>
                <div v-if="mat.packUnit && mat.packCost" class="text-[10px] text-stone-400 font-normal">
                  ฿{{ Number(mat.packCost).toFixed(0) }}/{{ mat.packUnit }}
                </div>
              </td>

              <!-- Total Item Stock Valuation -->
              <td class="py-3 px-4">
                <div class="font-bold font-number text-amber-950">
                  ฿{{ (Math.max(0, mat.stock) * (mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
                </div>
                <div v-if="mat.stock <= mat.minAlert && !mat.isDeleted" class="text-[10px] text-rose-500 font-number">
                  งบเติมสต็อก: +฿{{ (Math.max(0, (mat.minAlert * 2) - mat.stock) * mat.unitCost).toFixed(0) }}
                </div>
              </td>

              <!-- Status Badge -->
              <td class="py-3 px-4">
                <span
                  v-if="mat.isDeleted"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-200 text-stone-700"
                >
                  ซ่อนอยู่
                </span>
                <span
                  v-else-if="mat.stock <= 0"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700"
                >
                  หมดสต็อก
                </span>
                <span
                  v-else-if="mat.stock <= mat.minAlert"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700"
                >
                  ใกล้หมด
                </span>
                <span
                  v-else
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800"
                >
                  ปกติ
                </span>
              </td>

              <!-- Actions -->
              <td class="py-3 px-4 text-right">
                <div class="inline-flex items-center gap-1">
                  <!-- Stock In quick button -->
                  <button
                    v-if="!mat.isDeleted"
                    @click="openStockIn(mat.id)"
                    title="รับเข้าสต็อก"
                    class="p-1.5 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <ArrowDownToLine class="w-4 h-4" />
                  </button>

                  <!-- Stock Adjust quick button -->
                  <button
                    v-if="!mat.isDeleted"
                    @click="openStockAdjust(mat.id)"
                    title="ปรับยอดสต็อกจริง"
                    class="p-1.5 text-stone-400 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    <SlidersHorizontal class="w-4 h-4" />
                  </button>

                  <!-- Edit button -->
                  <button
                    @click="openEditMaterial(mat.id)"
                    title="แก้ไขข้อมูลวัตถุดิบ"
                    class="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
                  >
                    <Edit3 class="w-4 h-4" />
                  </button>

                  <!-- Soft Delete / Restore button -->
                  <button
                    v-if="!mat.isDeleted"
                    @click="softDelete(mat)"
                    title="ซ่อนรายการนี้"
                    class="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <EyeOff class="w-4 h-4" />
                  </button>
                  <button
                    v-else
                    @click="restore(mat)"
                    title="กู้คืนรายการนี้"
                    class="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <RotateCcw class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty Row -->
            <tr v-if="filteredMaterials.length === 0">
              <td colspan="9" class="py-12 text-center text-stone-400">
                <div class="text-3xl mb-2">🔍</div>
                <p class="text-xs font-medium">ไม่พบรายการวัตถุดิบตามเงื่อนไขที่เลือก</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import {
  Plus,
  ArrowDownToLine,
  SlidersHorizontal,
  Search,
  Edit3,
  EyeOff,
  RotateCcw
} from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedRole = ref('all') // 'all' | 'main' | 'sub'
const selectedCategory = ref('all')
const showDeleted = ref(false)

const categories = [
  { id: 'all', label: 'ทุกหมวดหมู่' },
  { id: 'Base Yogurt', label: '🥣 เบสโยเกิร์ต' },
  { id: 'วัตถุดิบรอง', label: '🥛 วัตถุดิบรอง' },
  { id: 'Fresh Fruits', label: '🍓 ผลไม้สด' },
  { id: 'Sauces', label: '🍯 ซอส & น้ำเชื่อม' },
  { id: 'Toppings', label: '🥜 ท็อปปิ้ง' },
  { id: 'Packaging', label: '📦 บรรจุภัณฑ์' }
]

const deletedCount = computed(() => {
  return store.materials.filter(m => m.isDeleted).length
})

const filteredMaterials = computed(() => {
  return store.materials.filter(m => {
    // Deleted filter
    if (!showDeleted.value && m.isDeleted) return false

    // Ingredient Role filter (หลัก / รอง)
    if (selectedRole.value === 'main' && m.isSubIngredient) return false
    if (selectedRole.value === 'sub' && !m.isSubIngredient) return false

    // Category filter
    if (selectedCategory.value !== 'all' && m.category !== selectedCategory.value) {
      return false
    }

    // Search query
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim()
      const matchName = m.name?.toLowerCase().includes(q)
      const matchId = m.id?.toLowerCase().includes(q)
      const matchUnit = m.unit?.toLowerCase().includes(q)
      const matchCat = m.category?.toLowerCase().includes(q)
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

function openStockAdjust(id = null) {
  store.modals.stockAdjust = {
    isOpen: true,
    materialId: id || (store.activeMaterials[0]?.id || null)
  }
}

function softDelete(mat) {
  if (confirm(`ต้องการซ่อนวัตถุดิบ "${mat.name}" หรือไม่?\n(ข้อมูลจะไม่สูญหายและสามารถกู้คืนได้เสมอ)`)) {
    store.softDeleteMaterial(mat.id)
  }
}

function restore(mat) {
  store.restoreMaterial(mat.id)
}
</script>
