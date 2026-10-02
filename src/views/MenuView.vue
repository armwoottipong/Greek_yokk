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

              <!-- BOM Recipe -->
              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1 text-[11px] max-w-xs">
                  <span
                    v-for="(r, idx) in menu.recipe || []"
                    :key="idx"
                    class="inline-flex items-center gap-1 bg-stone-100/80 px-1.5 py-0.5 rounded text-stone-600"
                  >
                    <span>{{ getMatEmoji(r.materialId) }}</span>
                    <span>{{ getMatName(r.materialId) }} ({{ r.qty }}{{ getMatUnit(r.materialId) }})</span>
                  </span>
                </div>
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, Plus, Trash2 } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedCategory = ref('ทั้งหมด')

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

function getMatName(matId) {
  const m = store.matMap[matId]
  return m ? m.name : matId
}

function getMatEmoji(matId) {
  const m = store.matMap[matId]
  return m ? m.emoji : '🥣'
}

function getMatUnit(matId) {
  const m = store.matMap[matId]
  return m ? m.unit : 'g'
}

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
