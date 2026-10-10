<template>
  <div class="space-y-4">
    <!-- Header with Search & Add Addon Button -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-2">
        <div class="relative w-64">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาชื่อ Add-on..."
            class="soft-input w-full pl-9 pr-3 py-2 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <AppSelect aria-label="หมวดหมู่"
          v-model="selectedCategory"
          class="w-44 shrink-0"
        >
          <option value="ทั้งหมด">ทุกหมวดหมู่ ({{ store.addons.length }})</option>
          <option
            v-for="cat in store.addonCategories"
            :key="cat.id"
            :value="cat.name"
          >
            {{ cat.icon || '✨' }} {{ cat.name }}
          </option>
          <option
            v-for="catName in otherAddonCategories"
            :key="catName"
            :value="catName"
          >
            ✨ {{ catName }}
          </option>
        </AppSelect>
      </div>

      <button
        @click="openAddAddon"
        class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
      >
        <Plus class="w-4 h-4" />
        <span>เพิ่ม Add-on ใหม่</span>
      </button>
    </div>

    <!-- Addons Management Table -->
    <div class="editorial-card overflow-hidden">
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
                <span class="text-2xl p-1.5 rounded-xl bg-[#FAF9F6] border border-stone-100">{{ addon.emoji || '🍓' }}</span>
                <span>{{ addon.name }}</span>
              </td>

              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded-lg bg-stone-100 text-stone-700 text-[11px] font-medium">
                  {{ addon.category }}
                </span>
              </td>

              <td class="py-3.5 px-4">
                <div class="flex flex-wrap gap-1.5 text-[11px]">
                  <span
                    v-for="p in store.platforms"
                    :key="p.id"
                    class="bg-[#F5F4F0] px-2 py-0.5 rounded-md text-stone-700 font-number font-medium"
                  >
                    {{ p.name.replace(/\s*\([^)]*\)/g, '') }}: ฿{{ addon.prices?.[p.id] !== undefined ? addon.prices[p.id] : '-' }}
                  </span>
                </div>
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
import AppSelect from '@/components/ui/AppSelect.vue'
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, Plus, Trash2 } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const selectedCategory = ref('ทั้งหมด')

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

function deleteAddon(addon) {
  if (confirm(`คุณต้องการลบ Add-on "${addon.name}" หรือไม่?`)) {
    store.deleteAddon(addon.id)
  }
}
</script>
