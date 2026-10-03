<template>
  <div
    v-if="store.modals.menuEdit.isOpen"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-stone-900/40 backdrop-blur-xs"
    @click.self="close"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Calm Header -->
      <div class="px-7 py-5 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
        <div>
          <h3 class="text-base font-semibold text-stone-900">
            {{ isEditing ? `แก้ไขเมนู: ${form.name}` : 'เพิ่มเมนูใหม่' }}
          </h3>
          <p class="text-[11px] text-stone-500 mt-0.5">กำหนดราคาขายแต่ละแพลตฟอร์ม สูตรวัตถุดิบ และบรรจุภัณฑ์ที่ตัดสต็อก</p>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Pure Flat Body -->
      <div class="p-7 space-y-5 overflow-y-auto flex-1 text-xs">
        <!-- Section 1: Emoji Icon & Menu Name -->
        <div class="flex items-start gap-3.5">
          <div class="shrink-0">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ไอคอน</label>
            <button
              type="button"
              @click="openEmojiPicker"
              class="soft-input flex items-center justify-center w-12 h-11 rounded-xl transition-all hover:bg-[#EAE8E1]"
              title="คลิกเพื่อเปลี่ยนไอคอน"
            >
              <span class="text-2xl leading-none">{{ form.emoji }}</span>
            </button>
          </div>
          <div class="flex-1">
            <label class="block text-xs font-medium text-stone-700 mb-1.5">ชื่อเมนู <span class="text-rose-500">*</span></label>
            <input
              v-model="form.name"
              type="text"
              placeholder="เช่น Greek Yogurt Bowl (M)"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Section 2: Category & Description -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">หมวดหมู่</label>
            <div class="relative">
              <input
                v-model="form.category"
                type="text"
                list="menu-categories-list"
                placeholder="Classic Bowls"
                class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
              />
              <datalist id="menu-categories-list">
                <option v-for="cat in store.menuCategories" :key="cat.id" :value="cat.name" />
              </datalist>
            </div>
            <div class="flex items-center gap-1.5 mt-1.5 overflow-x-auto no-scrollbar">
              <button
                v-for="cat in store.menuCategories"
                :key="cat.id"
                type="button"
                @click="form.category = cat.name"
                class="px-2 py-0.5 rounded-md bg-[#FAF9F6] hover:bg-[#ECEAE4] text-[10px] text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1 shrink-0"
              >
                <span>{{ cat.icon }}</span>
                <span>{{ cat.name }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-stone-700 mb-1.5">คำอธิบายสั้น</label>
            <input
              v-model="form.description"
              type="text"
              placeholder="เช่น กรีกโยเกิร์ตแท้ 160g พร้อมผลไม้สด"
              class="soft-input w-full px-3.5 py-2.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
            />
          </div>
        </div>

        <!-- Section 3: Platform Prices (Compact capsules) -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-stone-700 flex items-center gap-1.5">
              <span>🏷️</span>
              <span>ราคาขายแต่ละช่องทาง</span>
            </span>
            <span class="text-[10px] text-stone-400">บาท (฿)</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div
              v-for="p in store.platforms"
              :key="p.id"
              class="flex items-center justify-between gap-1.5 px-3 py-1.5 rounded-xl bg-[#F5F4F0] focus-within:bg-[#EAE8E1] focus-within:ring-1 focus-within:ring-stone-400/40 transition-all"
            >
              <div class="flex items-center gap-1 min-w-0">
                <span class="text-[11px] font-medium text-stone-700 truncate" :title="p.name">
                  {{ p.name.replace(/\s*\([^)]*\)/g, '') }}
                </span>
                <span
                  v-if="p.gpPercent > 0"
                  class="text-[9px] font-number text-amber-800 bg-amber-100/80 px-1 py-0.5 rounded leading-none shrink-0"
                >
                  {{ p.gpPercent }}%
                </span>
              </div>
              <div class="flex items-center gap-0.5 shrink-0">
                <span class="text-stone-400 text-xs font-number">฿</span>
                <input
                  v-model.number="form.prices[p.id]"
                  type="number"
                  placeholder="0"
                  class="w-14 bg-transparent border-0 text-right font-number font-semibold text-xs text-stone-900 focus:outline-none placeholder:text-stone-300"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section 4: Dual Functional Toggle Tiles -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <ToggleSwitch
            v-model="form.hasAddons"
            label="อนุญาตให้เลือก Add-on"
            description="เปิดให้ลูกค้าสั่งท็อปปิ้งเพิ่มเติมได้"
            icon="🍓"
            color="purple"
          />
          <ToggleSwitch
            v-model="form.hasPackage"
            label="ตัดสต็อกบรรจุภัณฑ์"
            description="หัก ถ้วย ช้อน ถุง ในสต็อกอัตโนมัติ"
            icon="📦"
            color="amber"
          />
        </div>

        <!-- Section 5: Base Recipe (Flat tabular rows) -->
        <div class="space-y-2.5 pt-2 border-t border-stone-100">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-stone-800 flex items-center gap-1.5">
              <span>🥣</span>
              <span>สูตรวัตถุดิบหลัก & ผลไม้</span>
            </span>
            <button
              type="button"
              @click="addBaseRecipeRow"
              class="text-xs text-amber-900 hover:text-amber-950 font-medium flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-amber-50/80 transition-colors"
            >
              <Plus class="w-3.5 h-3.5" />
              <span>เพิ่มวัตถุดิบ</span>
            </button>
          </div>

          <div v-if="baseRecipeRows.length === 0" class="text-stone-400 text-xs py-3 text-center bg-[#FAF9F6] rounded-xl italic">
            ยังไม่มีวัตถุดิบหลัก — คลิก "+ เพิ่มวัตถุดิบ" เพื่อใส่สูตร
          </div>

          <div v-else class="space-y-2">
            <div
              v-for="(row, idx) in baseRecipeRows"
              :key="idx"
              class="flex items-center gap-2.5 text-xs"
            >
              <select
                v-model="row.materialId"
                class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
              >
                <optgroup
                  v-for="(mats, catName) in recipeMaterialsByCategory"
                  :key="catName"
                  :label="catName"
                >
                  <option
                    v-for="m in mats"
                    :key="m.id"
                    :value="m.id"
                  >
                    {{ m.emoji }} {{ m.name }} ({{ m.unit }})
                  </option>
                </optgroup>
              </select>

              <div class="w-28 shrink-0 flex items-center gap-1.5">
                <input
                  v-model.number="row.qty"
                  type="number"
                  step="any"
                  placeholder="ปริมาณ"
                  class="soft-input w-full px-2.5 py-2 rounded-xl text-xs font-number font-semibold text-stone-900 placeholder:text-stone-300"
                />
                <span class="text-[11px] text-stone-400 font-medium shrink-0 w-6">
                  {{ getUnit(row.materialId) }}
                </span>
              </div>

              <button
                type="button"
                @click="removeBaseRecipeRow(idx)"
                class="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                title="ลบรายการ"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Section 6: Packaging BOM -->
        <div class="space-y-2.5 pt-2 border-t border-stone-100">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-xs font-medium text-stone-800 flex items-center gap-1.5">
              <span>📦</span>
              <span>บรรจุภัณฑ์ & อุปกรณ์ที่ใช้</span>
            </span>

            <div v-if="form.hasPackage" class="flex items-center gap-1.5 flex-wrap">
              <button
                v-for="pkg in packagingMaterials.slice(0, 3)"
                :key="pkg.id"
                type="button"
                @click="quickAddPackage(pkg.id)"
                class="px-2.5 py-1 bg-[#FAF9F6] hover:bg-[#EFECE6] text-stone-600 rounded-full text-[11px] font-medium transition-colors border border-stone-100"
              >
                + {{ pkg.name }}
              </button>
              <button
                type="button"
                @click="addPackageRecipeRow"
                class="ml-1 text-xs text-amber-900 hover:text-amber-950 font-medium py-1 px-2 rounded-lg hover:bg-amber-50/80 transition-colors"
              >
                + เพิ่ม Package
              </button>
            </div>
          </div>

          <!-- Disabled notice -->
          <div
            v-if="!form.hasPackage"
            class="py-2.5 px-3.5 rounded-xl bg-amber-50/70 border border-amber-200/50 text-amber-900 text-xs flex items-center gap-2"
          >
            <span class="text-sm">ℹ️</span>
            <span><strong>ปิดใช้งานตัดสต็อก Package:</strong> เมนูนี้จะไม่หักสต็อกบรรจุภัณฑ์ใดๆ เมื่อมีคำสั่งซื้อ</span>
          </div>

          <!-- Package rows -->
          <div v-else class="space-y-2">
            <div v-if="packageRecipeRows.length === 0" class="text-stone-400 text-xs py-3 text-center bg-[#FAF9F6] rounded-xl italic">
              ยังไม่มีบรรจุภัณฑ์ — คลิกปุ่มด้านบน เช่น "+ ถ้วย A" หรือ "+ ช้อนไม้"
            </div>

            <div
              v-for="(row, idx) in packageRecipeRows"
              :key="idx"
              class="flex items-center gap-2.5 text-xs"
            >
              <select
                v-model="row.materialId"
                class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900"
              >
                <option
                  v-for="m in packagingMaterials"
                  :key="m.id"
                  :value="m.id"
                >
                  {{ m.emoji }} {{ m.name }}
                </option>
              </select>

              <div class="w-28 shrink-0 flex items-center gap-1.5">
                <input
                  v-model.number="row.qty"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="จำนวน"
                  class="soft-input w-full px-2.5 py-2 rounded-xl text-xs font-number font-semibold text-stone-900 placeholder:text-stone-300"
                />
                <span class="text-[11px] text-stone-400 font-medium shrink-0 w-6">ชิ้น</span>
              </div>

              <button
                type="button"
                @click="removePackageRecipeRow(idx)"
                class="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
                title="ลบรายการ"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Grounded Footer -->
      <div class="px-7 py-4 bg-stone-50/70 border-t border-stone-100 flex items-center justify-end gap-3 shrink-0">
        <button
          type="button"
          @click="close"
          class="px-5 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 rounded-xl transition-colors"
        >
          ยกเลิก
        </button>
        <button
          type="button"
          @click="submit"
          class="px-6 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-sm transition-all flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>บันทึกข้อมูลเมนู</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { X, Plus, Trash2, Check } from 'lucide-vue-next'

const store = usePosStore()

const form = ref({
  id: '',
  name: '',
  category: 'Classic Bowls',
  emoji: '🥣',
  description: '',
  prices: {},
  hasAddons: true,
  hasPackage: true
})

const baseRecipeRows = ref([])
const packageRecipeRows = ref([])

const isEditing = computed(() => Boolean(store.modals.menuEdit.menuId))

const recipeMaterialsByCategory = computed(() => {
  const nonPkgs = store.activeMaterials.filter(m => !isPackagingMaterial(m))
  const groups = {}
  nonPkgs.forEach(m => {
    const cat = m.category || 'วัตถุดิบอื่นๆ'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(m)
  })
  return groups
})

const packagingMaterials = computed(() => {
  const pkgs = store.activeMaterials.filter(m => m.category === 'Packaging' || isPackagingMaterial(m))
  return pkgs.length > 0 ? pkgs : store.activeMaterials
})

function isPackagingMaterial(m) {
  if (!m) return false
  const cat = (m.category || '').toLowerCase()
  const name = (m.name || '').toLowerCase()
  return cat.includes('packag') || cat.includes('บรรจุ') || name.includes('ถ้วย') || name.includes('ช้อน') || name.includes('ถุง') || name.includes('แก้ว')
}

function getUnit(matId) {
  const m = store.matMap[matId]
  return m ? m.unit : 'g'
}

// Watch modal open and populate
watch(() => store.modals.menuEdit.isOpen, (open) => {
  if (open) {
    const menuId = store.modals.menuEdit.menuId
    const menu = menuId ? store.menus.find(m => m.id === menuId) : null

    form.value = {
      id: menu ? menu.id : '',
      name: menu ? menu.name : '',
      category: menu ? menu.category : 'Classic Bowls',
      emoji: menu ? menu.emoji : '🥣',
      description: menu ? (menu.description || '') : '',
      prices: menu ? { ...menu.prices } : {},
      hasAddons: menu ? (menu.hasAddons !== false) : true,
      hasPackage: menu ? (menu.hasPackage !== false) : true
    }

    // Default prices template if empty
    store.platforms.forEach(p => {
      if (form.value.prices[p.id] === undefined) {
        form.value.prices[p.id] = ''
      }
    })

    // Separate recipes
    baseRecipeRows.value = []
    packageRecipeRows.value = []

    if (menu && Array.isArray(menu.recipe)) {
      menu.recipe.forEach(r => {
        const mat = store.matMap[r.materialId]
        if (mat && isPackagingMaterial(mat)) {
          packageRecipeRows.value.push({ materialId: r.materialId, qty: r.qty })
        } else {
          baseRecipeRows.value.push({ materialId: r.materialId, qty: r.qty })
        }
      })
    } else {
      // For new menu: if materials exist, add defaults if available
      const defaultBase = store.matMap['MAT001'] || store.activeMaterials.find(m => !isPackagingMaterial(m))
      if (defaultBase) {
        baseRecipeRows.value.push({ materialId: defaultBase.id, qty: 100 })
      }
      const defaultCup = store.matMap['MAT010'] || packagingMaterials.value[0]
      if (defaultCup) {
        packageRecipeRows.value.push({ materialId: defaultCup.id, qty: 1 })
      }
    }
  }
})

function addBaseRecipeRow() {
  const nonPkgs = store.activeMaterials.filter(m => !isPackagingMaterial(m))
  const defaultMat = nonPkgs[0] || store.activeMaterials[0]
  if (!defaultMat) {
    store.showToast('ยังไม่มีรายการวัตถุดิบในระบบ กรุณาเพิ่มวัตถุดิบในหน้าสต็อกก่อน', 'error')
    return
  }
  baseRecipeRows.value.push({
    materialId: defaultMat.id,
    qty: 30
  })
}

function removeBaseRecipeRow(idx) {
  baseRecipeRows.value.splice(idx, 1)
}

function addPackageRecipeRow() {
  const defaultPkg = packagingMaterials.value[0] || store.activeMaterials[0]
  if (!defaultPkg) {
    store.showToast('ยังไม่มีรายการบรรจุภัณฑ์ในระบบ กรุณาเพิ่มบรรจุภัณฑ์ในหน้าสต็อกก่อน', 'error')
    return
  }
  packageRecipeRows.value.push({
    materialId: defaultPkg.id,
    qty: 1
  })
}

function removePackageRecipeRow(idx) {
  packageRecipeRows.value.splice(idx, 1)
}

function quickAddPackage(matId) {
  if (!store.matMap[matId]) {
    store.showToast('ไม่พบบรรจุภัณฑ์นี้ในระบบ', 'error')
    return
  }
  const existing = packageRecipeRows.value.find(r => r.materialId === matId)
  if (existing) {
    existing.qty += 1
    store.showToast('เพิ่มจำนวนบรรจุภัณฑ์แล้ว', 'success')
  } else {
    packageRecipeRows.value.push({ materialId: matId, qty: 1 })
  }
}

function openEmojiPicker() {
  store.modals.emojiPicker = {
    isOpen: true,
    targetCallback: (emoji) => {
      form.value.emoji = emoji
    }
  }
}

function close() {
  store.modals.menuEdit.isOpen = false
  store.modals.menuEdit.menuId = null
}

function submit() {
  if (!form.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อเมนู', 'error')
    return
  }

  // Combine recipes
  const combinedRecipe = []
  baseRecipeRows.value.forEach(r => {
    if (r.materialId && r.qty > 0) {
      combinedRecipe.push({ materialId: r.materialId, qty: Number(r.qty) })
    }
  })

  if (form.value.hasPackage) {
    packageRecipeRows.value.forEach(r => {
      if (r.materialId && r.qty > 0) {
        combinedRecipe.push({ materialId: r.materialId, qty: Number(r.qty) })
      }
    })
  }

  store.saveMenu({
    id: form.value.id || undefined,
    name: form.value.name.trim(),
    category: form.value.category.trim() || 'Classic Bowls',
    emoji: form.value.emoji || '🥣',
    description: form.value.description.trim(),
    prices: form.value.prices,
    recipe: combinedRecipe,
    hasAddons: form.value.hasAddons,
    hasPackage: form.value.hasPackage
  })

  close()
}
</script>
