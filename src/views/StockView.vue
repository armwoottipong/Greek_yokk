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

    <!-- Summary KPI Cards: Clean, Compact 4-Card Strip -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Total Valuation Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>มูลค่าคลังรวม</span>
          <span>💰</span>
        </div>
        <div class="text-xl font-bold font-number text-amber-950">
          ฿{{ store.totalInventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          หลัก: {{ store.mainMaterials.length }} • รอง: {{ store.subMaterials.length }} ชนิด
        </div>
      </div>

      <!-- Reorder Budget Needed Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>งบเติมสต็อกแนะนำ</span>
          <span>📦</span>
        </div>
        <div class="text-xl font-bold font-number text-rose-800">
          ฿{{ store.reorderBudgetNeeded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          เติมให้ถึงระดับ 2x Min
        </div>
      </div>

      <!-- Low Stock Items Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>สต็อกใกล้หมด</span>
          <span>⚠️</span>
        </div>
        <div class="text-xl font-bold font-number text-amber-800">
          {{ store.lowStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          ควรสั่งซื้อเพิ่ม
        </div>
      </div>

      <!-- Out of Stock Items Card -->
      <div class="editorial-card p-4 bg-white">
        <div class="flex items-center justify-between text-[11px] text-stone-400 mb-1">
          <span>หมดสต็อก</span>
          <span>🚫</span>
        </div>
        <div class="text-xl font-bold font-number text-stone-800">
          {{ store.outOfStockMaterials.length }} <span class="text-xs font-normal text-stone-400">รายการ</span>
        </div>
        <div class="text-[10px] text-stone-400 mt-1">
          ระงับขายเมนูที่เกี่ยวข้อง
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar (Single Compact Row) -->
    <div class="editorial-card p-3 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3">
      <!-- Role Tabs (ทั้งหมด / หลัก / รอง) -->
      <div class="flex items-center gap-1 p-0.5 bg-stone-100 rounded-xl text-xs font-semibold shrink-0">
        <button
          @click="selectedRole = 'all'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all',
            selectedRole === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-500 hover:text-stone-900'
          ]"
        >
          ทั้งหมด ({{ store.activeMaterials.length }})
        </button>
        <button
          @click="selectedRole = 'main'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1',
            selectedRole === 'main' ? 'bg-emerald-800 text-white shadow-2xs' : 'text-stone-500 hover:text-emerald-800'
          ]"
        >
          <span>🥣 หลัก ({{ store.mainMaterials.length }})</span>
        </button>
        <button
          @click="selectedRole = 'sub'"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all flex items-center gap-1',
            selectedRole === 'sub' ? 'bg-purple-800 text-white shadow-2xs' : 'text-stone-500 hover:text-purple-800'
          ]"
        >
          <span>🥛 รอง ({{ store.subMaterials.length }})</span>
        </button>
      </div>

      <!-- Category Filter Dropdown + Search + Hidden Checkbox -->
      <div class="flex items-center gap-2 flex-1 max-w-xl justify-end">
        <select
          v-model="selectedCategory"
          class="soft-input px-3 py-1.5 rounded-xl text-xs font-medium text-stone-800 shrink-0"
        >
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.label }}
          </option>
        </select>

        <div class="relative flex-1 min-w-[140px]">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-2.5" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาวัตถุดิบ..."
            class="soft-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        <label class="text-[11px] text-stone-400 hover:text-stone-700 cursor-pointer select-none flex items-center gap-1.5 shrink-0 pl-1">
          <input
            type="checkbox"
            v-model="showDeleted"
            class="rounded border-stone-300 text-stone-900 focus:ring-0 w-3.5 h-3.5"
          />
          <span>ที่ซ่อน ({{ deletedCount }})</span>
        </label>
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
                <div class="font-bold font-number text-sm">
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
                  <span class="text-xs font-normal text-stone-400 ml-1">{{ mat.unit }}</span>
                </div>
                <div v-if="mat.packUnit && mat.packSize > 1" class="text-[10px] text-stone-400 font-number mt-0.5">
                  ≈ {{ (mat.stock / mat.packSize).toFixed(1) }} {{ mat.packUnit }}
                </div>
              </td>


              <!-- Unit Cost (Primary: Pack purchase cost e.g. ฿105/ขวด, Secondary: base unit cost) -->
              <td class="py-3 px-4 font-number text-stone-700">
                <div class="font-bold text-stone-900 text-xs">
                  ฿{{ getDisplayPackCost(mat).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) }}
                  <span class="font-medium text-stone-500 text-[11px]">/{{ mat.packUnit || mat.unit }}</span>
                </div>
                <div v-if="(mat.packSize && mat.packSize > 1) || mat.hasSubRecipe" class="text-[10px] text-stone-400 mt-0.5">
                  (≈ ฿{{ Number(mat.unitCost || 0).toFixed(4) }}/{{ mat.unit }})
                </div>
              </td>

              <!-- Total Item Stock Valuation -->
              <td class="py-3 px-4">
                <div class="font-bold font-number text-amber-950">
                  ฿{{ (Math.max(0, mat.stock) * (mat.unitCost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}
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
              <td colspan="8" class="py-12 text-center text-stone-400">
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

const categories = computed(() => {
  const list = [{ id: 'all', label: 'ทุกหมวดหมู่' }]
  store.materialCategories.forEach(c => {
    list.push({
      id: c.name,
      label: `${c.icon || '📦'} ${c.label || c.name}`
    })
  })
  store.materials.forEach(m => {
    if (m.category && !list.some(item => item.id === m.category)) {
      list.push({
        id: m.category,
        label: `📦 ${m.category}`
      })
    }
  })
  return list
})

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

function getDisplayPackCost(mat) {
  const pCost = Number(mat.packCost)
  if (pCost && pCost > 0) return pCost
  const uCost = Number(mat.unitCost) || 0
  const pSize = Number(mat.packSize) || 1
  return Math.round(uCost * pSize * 100) / 100
}
</script>
