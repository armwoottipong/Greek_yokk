<template>
  <div class="max-w-4xl space-y-6">
    <!-- Header -->
    <div>
      <h2 class="text-xl font-bold text-stone-900 tracking-tight">ตั้งค่าระบบ (System Settings)</h2>
      <p class="text-xs text-stone-400 mt-0.5">
        เชื่อมต่อ Google Sheets API, จัดการช่องทางการขาย และสำรองฐานข้อมูล
      </p>
    </div>

    <!-- Section 1: Google Apps Script Web App Integration -->
    <div class="editorial-card p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-emerald-50 text-emerald-800">
          <Cloud class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">เชื่อมต่อ Google Sheets (GAS API)</h3>
          <p class="text-xs text-stone-400">ซิงค์ประวัติคำสั่งซื้อและสถานะสต็อกคงเหลือขึ้น Google Sheets อัตโนมัติ</p>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <label class="block text-xs font-semibold text-stone-700 mb-1">
            Google Apps Script Web App URL
          </label>
          <div class="flex items-center gap-2">
            <input
              v-model="gasUrlInput"
              type="url"
              placeholder="https://script.google.com/macros/s/AKfycb.../exec"
              class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-mono text-stone-900 placeholder:text-stone-400"
            />
            <button
              @click="saveGasUrl"
              class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold transition-colors shrink-0"
            >
              บันทึก URL
            </button>
          </div>
          <p class="text-[11px] text-stone-400 mt-1.5">
            URL ที่ได้จากการ Deploy เป็น Web App ใน Google Apps Script (Who has access: Anyone)
          </p>
        </div>

        <div class="flex items-center justify-between pt-2">
          <div class="flex items-center gap-2 text-xs">
            <span
              class="w-2.5 h-2.5 rounded-full"
              :class="store.gasApiUrl ? 'bg-emerald-500' : 'bg-stone-300'"
            ></span>
            <span class="text-stone-600 font-medium">
              {{ store.gasApiUrl ? 'สถานะ: เชื่อมต่อ Web App URL แล้ว' : 'สถานะ: ยังไม่ได้ระบุ URL' }}
            </span>
            <span v-if="store.lastSyncTime" class="text-stone-400 text-[11px]">
              (ซิงค์ล่าสุด: {{ store.lastSyncTime }})
            </span>
          </div>

          <button
            @click="testSync"
            :disabled="store.isSyncing || !store.gasApiUrl"
            class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold disabled:opacity-50 transition-colors"
          >
            <RefreshCw class="w-3.5 h-3.5" :class="{ 'animate-spin': store.isSyncing }" />
            <span>{{ store.isSyncing ? 'กำลังส่งข้อมูล...' : 'ทดสอบซิงค์ข้อมูลเดี๋ยวนี้' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 2: Platform & Channel GP Rates -->
    <div class="editorial-card p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-amber-50 text-amber-800">
          <Store class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">ช่องทางการขายและค่าธรรมเนียม GP (Platform GP Rates)</h3>
          <p class="text-xs text-stone-400">อัตราหักเปอร์เซ็นต์ GP ที่นำไปคำนวณกำไรสุทธิแบบ Real-time</p>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="plat in store.platforms"
          :key="plat.id"
          class="p-3.5 rounded-xl border border-stone-100 bg-[#FAF9F6] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <span class="text-2xl">{{ plat.icon }}</span>
            <div>
              <div class="font-bold text-stone-900 text-xs">{{ plat.name }}</div>
              <div class="text-[11px] text-stone-400 font-mono">{{ plat.id }}</div>
            </div>
          </div>
          <div class="text-right">
            <span class="text-xs font-bold font-number text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded-md">
              GP {{ plat.gpPercent }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 3: Category Management (จัดการหมวดหมู่ระบบ) -->
    <div class="editorial-card p-6 bg-white space-y-5">
      <div class="flex items-center justify-between border-b border-stone-100 pb-3">
        <div class="flex items-center gap-3">
          <div class="p-2 rounded-xl bg-indigo-50 text-indigo-700">
            <Tags class="w-5 h-5" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-stone-900">จัดการหมวดหมู่ระบบ (Category Management)</h3>
            <p class="text-xs text-stone-400">เพิ่ม ลบ หรือแก้ไขชื่อหมวดหมู่สำหรับเมนู วัตถุดิบ และ Add-on ให้เป็นระเบียบ</p>
          </div>
        </div>
      </div>

      <!-- Category Type Switcher (Tabs) -->
      <div class="flex items-center gap-1.5 p-1 bg-stone-100/80 rounded-xl w-fit">
        <button
          @click="activeCategoryTab = 'menu'"
          :class="activeCategoryTab === 'menu' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>🥣 เมนู / สินค้า</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.menuCategories.length }}
          </span>
        </button>
        <button
          @click="activeCategoryTab = 'material'"
          :class="activeCategoryTab === 'material' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>📦 วัตถุดิบ & บรรจุภัณฑ์</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.materialCategories.length }}
          </span>
        </button>
        <button
          @click="activeCategoryTab = 'addon'"
          :class="activeCategoryTab === 'addon' ? 'bg-white text-stone-900 shadow-xs font-semibold' : 'text-stone-500 hover:text-stone-800'"
          class="px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <span>✨ ท็อปปิ้งเสริม (Add-on)</span>
          <span class="px-1.5 py-0.2 rounded-full text-[10px] bg-stone-100 text-stone-600 font-number">
            {{ store.addonCategories.length }}
          </span>
        </button>
      </div>

      <!-- Add New Category Inline Input -->
      <div class="p-3.5 rounded-2xl bg-[#FAF9F6] border border-stone-200/60 flex flex-wrap items-center gap-2.5">
        <div class="flex items-center gap-2 flex-1 min-w-[240px]">
          <!-- Emoji button -->
          <button
            type="button"
            @click="openEmojiForNewCategory"
            class="w-9 h-9 rounded-xl bg-white border border-stone-200 hover:border-stone-400 flex items-center justify-center text-lg hover:bg-stone-50 transition-colors shrink-0 shadow-2xs cursor-pointer"
            title="คลิกเพื่อเลือกไอคอน"
          >
            {{ newCatForm.icon }}
          </button>
          <input
            v-model="newCatForm.name"
            type="text"
            :placeholder="getPlaceholder(activeCategoryTab)"
            @keyup.enter="addNewCategory"
            class="soft-input flex-1 px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
          />
          <input
            v-if="activeCategoryTab === 'material'"
            v-model="newCatForm.label"
            type="text"
            placeholder="ชื่อภาษาไทย (ถ้ามี)"
            @keyup.enter="addNewCategory"
            class="soft-input w-36 px-3 py-2 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400"
          />
        </div>
        <button
          @click="addNewCategory"
          class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>เพิ่มหมวดหมู่</span>
        </button>
      </div>

      <!-- Category List Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        <div
          v-for="cat in currentCategoryList"
          :key="cat.id"
          class="p-3 rounded-xl border border-stone-200/70 bg-white hover:border-stone-300 transition-all flex items-center justify-between gap-2 shadow-2xs"
        >
          <!-- Edit mode -->
          <div v-if="editingCatId === cat.id" class="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              @click="openEmojiForEditingCategory"
              class="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-base shrink-0 transition-colors cursor-pointer"
              title="เปลี่ยนไอคอน"
            >
              {{ editCatForm.icon }}
            </button>
            <div class="flex-1 min-w-0 space-y-1">
              <input
                v-model="editCatForm.name"
                type="text"
                placeholder="ชื่อหมวดหมู่"
                class="soft-input w-full px-2.5 py-1 text-xs font-medium text-stone-900"
                @keyup.enter="saveEditingCategory"
                @keyup.esc="cancelEditingCategory"
                autofocus
              />
              <input
                v-if="activeCategoryTab === 'material'"
                v-model="editCatForm.label"
                type="text"
                placeholder="ชื่อภาษาไทย"
                class="soft-input w-full px-2.5 py-1 text-[11px] font-medium text-stone-600"
                @keyup.enter="saveEditingCategory"
                @keyup.esc="cancelEditingCategory"
              />
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button
                @click="saveEditingCategory"
                class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                title="บันทึก"
              >
                <Check class="w-4 h-4" />
              </button>
              <button
                @click="cancelEditingCategory"
                class="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                title="ยกเลิก"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Normal display mode -->
          <template v-else>
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <span class="w-8 h-8 rounded-lg bg-[#F5F4F0] flex items-center justify-center text-base shrink-0 select-none">
                {{ cat.icon || '🏷️' }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="font-bold text-xs text-stone-800 truncate">
                  {{ cat.name }}
                </div>
                <div v-if="cat.label && cat.label !== cat.name" class="text-[10px] text-stone-400 truncate">
                  {{ cat.label }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <!-- Item count badge -->
              <span
                class="text-[11px] px-2 py-0.5 rounded-full font-number font-medium"
                :class="getItemCount(activeCategoryTab, cat.name) > 0 ? 'bg-amber-50 text-amber-900 border border-amber-200/50' : 'bg-stone-100 text-stone-400'"
              >
                {{ getItemCount(activeCategoryTab, cat.name) }} {{ getItemUnitLabel(activeCategoryTab) }}
              </span>

              <!-- Edit button -->
              <button
                @click="startEditingCategory(cat)"
                class="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                title="แก้ไขหมวดหมู่"
              >
                <Edit3 class="w-3.5 h-3.5" />
              </button>

              <!-- Delete button -->
              <button
                @click="handleDeleteCategory(activeCategoryTab, cat)"
                class="p-1.5 text-stone-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="ลบหมวดหมู่"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Section 4: Data Management & Backup -->
    <div class="editorial-card p-6 bg-white space-y-4">
      <div class="flex items-center gap-3 border-b border-stone-100 pb-3">
        <div class="p-2 rounded-xl bg-rose-50 text-rose-800">
          <Database class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-sm font-bold text-stone-900">การจัดการฐานข้อมูลและการสำรอง (Database & Backup)</h3>
          <p class="text-xs text-stone-400">สำรองข้อมูลทั้งหมดเป็น JSON หรือรีเฟรชกลับสู่ค่าเริ่มต้น</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Export Backup -->
        <div class="p-4 rounded-xl border border-stone-100 bg-[#FAF9F6] flex flex-col justify-between space-y-3">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Download class="w-4 h-4 text-stone-600" />
              <span>ส่งออกข้อมูลสำรอง (Export)</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              ดาวน์โหลดไฟล์ .json รวมเมนู วัตถุดิบ และประวัติคำสั่งซื้อ
            </p>
          </div>
          <button
            @click="exportBackup"
            class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            ดาวน์โหลด JSON Backup
          </button>
        </div>

        <!-- Import Backup -->
        <div class="p-4 rounded-xl border border-stone-100 bg-[#FAF9F6] flex flex-col justify-between space-y-3">
          <div>
            <div class="font-bold text-xs text-stone-900 flex items-center gap-1.5">
              <Upload class="w-4 h-4 text-stone-600" />
              <span>นำเข้าข้อมูล (Import)</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              กู้คืนข้อมูลจากไฟล์ JSON ที่เคยสำรองไว้
            </p>
          </div>
          <div>
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              class="hidden"
              @change="handleImportFile"
            />
            <button
              @click="$refs.fileInput.click()"
              class="w-full py-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              เลือกไฟล์ JSON กู้คืน
            </button>
          </div>
        </div>

        <!-- Reset Demo Data -->
        <div class="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col justify-between space-y-3">
          <div>
            <div class="font-bold text-xs text-rose-900 flex items-center gap-1.5">
              <RotateCcw class="w-4 h-4 text-rose-600" />
              <span>คืนค่าตัวอย่าง (Reset Demo)</span>
            </div>
            <p class="text-[11px] text-stone-400 mt-1">
              คืนค่าเมนู วัตถุดิบ และออเดอร์ตัวอย่างของร้านกรีกโยเกิร์ต
            </p>
          </div>
          <button
            @click="confirmResetDemo"
            class="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
          >
            รีเซ็ตข้อมูลตัวอย่าง
          </button>
        </div>
      </div>
    </div>

    <!-- Section 4: System Information -->
    <div class="editorial-card p-5 bg-white flex items-center justify-between text-xs text-stone-400">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
        <span class="text-stone-600 font-medium">Greek Yogurt POS & Inventory System v2.0 (Vue 3 + Pinia)</span>
      </div>
      <div>
        Local Data Stored: {{ (store.materials.length + store.menus.length + store.addons.length + store.orders.length) }} records
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import {
  Cloud,
  Store,
  Database,
  RefreshCw,
  Download,
  Upload,
  RotateCcw,
  Tags,
  Plus,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-vue-next'

const store = usePosStore()
const gasUrlInput = ref(store.gasApiUrl)
const fileInput = ref(null)

// ==========================================
// CATEGORY MANAGEMENT LOGIC
// ==========================================
const activeCategoryTab = ref('menu') // 'menu' | 'material' | 'addon'

const currentCategoryList = computed(() => {
  if (activeCategoryTab.value === 'menu') return store.menuCategories
  if (activeCategoryTab.value === 'material') return store.materialCategories
  if (activeCategoryTab.value === 'addon') return store.addonCategories
  return []
})

const newCatForm = ref({
  name: '',
  label: '',
  icon: '🥣'
})

watch(activeCategoryTab, (tab) => {
  newCatForm.value.name = ''
  newCatForm.value.label = ''
  newCatForm.value.icon = tab === 'menu' ? '🥣' : tab === 'material' ? '📦' : '✨'
  cancelEditingCategory()
})

const editingCatId = ref(null)
const editCatForm = ref({
  id: '',
  name: '',
  label: '',
  icon: ''
})

function startEditingCategory(cat) {
  editingCatId.value = cat.id
  editCatForm.value = {
    id: cat.id,
    name: cat.name,
    label: cat.label || '',
    icon: cat.icon || '🏷️'
  }
}

function cancelEditingCategory() {
  editingCatId.value = null
  editCatForm.value = { id: '', name: '', label: '', icon: '' }
}

function saveEditingCategory() {
  if (!editCatForm.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อหมวดหมู่', 'error')
    return
  }
  const res = store.saveCategory(activeCategoryTab.value, {
    id: editCatForm.value.id,
    name: editCatForm.value.name.trim(),
    label: editCatForm.value.label.trim() || undefined,
    icon: editCatForm.value.icon
  })
  if (res.success) {
    cancelEditingCategory()
  }
}

function openEmojiForNewCategory() {
  store.openEmojiPicker((emoji) => {
    newCatForm.value.icon = emoji
  })
}

function openEmojiForEditingCategory() {
  store.openEmojiPicker((emoji) => {
    editCatForm.value.icon = emoji
  })
}

function addNewCategory() {
  if (!newCatForm.value.name.trim()) {
    store.showToast('กรุณากรอกชื่อหมวดหมู่', 'error')
    return
  }
  const res = store.saveCategory(activeCategoryTab.value, {
    name: newCatForm.value.name.trim(),
    label: newCatForm.value.label.trim() || undefined,
    icon: newCatForm.value.icon
  })
  if (res.success) {
    newCatForm.value.name = ''
    newCatForm.value.label = ''
  }
}

function handleDeleteCategory(tab, cat) {
  const count = getItemCount(tab, cat.name)
  if (count > 0) {
    const itemLabel = tab === 'menu' ? 'เมนู' : tab === 'material' ? 'วัตถุดิบ' : 'Add-on'
    alert(`ไม่สามารถลบหมวดหมู่ "${cat.name}" ได้เนื่องจากมี ${count} ${itemLabel} ใช้งานอยู่\nกรุณาเปลี่ยนหมวดหมู่ของรายการเหล่านั้นก่อนทำการลบ`)
    return
  }

  if (confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" หรือไม่?`)) {
    store.deleteCategory(tab, cat.id)
  }
}

function getItemCount(tab, catName) {
  const counts = store.categoryUsageCounts[tab] || {}
  return counts[catName] || 0
}

function getItemUnitLabel(tab) {
  if (tab === 'menu') return 'เมนู'
  if (tab === 'material') return 'รายการ'
  if (tab === 'addon') return 'Add-on'
  return 'รายการ'
}

function getPlaceholder(tab) {
  if (tab === 'menu') return 'เช่น สมูทตี้โบวล์, Parfait, เครื่องดื่ม...'
  if (tab === 'material') return 'เช่น ผลไม้แช่แข็ง, ไซรัป, กล่องเทคอะเวย์...'
  if (tab === 'addon') return 'เช่น ซุปเปอร์ฟู้ด, เจลลี่, ซอสพิเศษ...'
  return 'ชื่อหมวดหมู่ใหม่'
}

// ==========================================
// SYSTEM SETTINGS & BACKUP
// ==========================================
function saveGasUrl() {
  store.saveGasUrl(gasUrlInput.value)
}

function testSync() {
  store.syncWithGas()
}

function exportBackup() {
  const data = {
    exportDate: new Date().toISOString(),
    system: 'Greek Yogurt POS v2.0',
    materials: store.materials,
    menus: store.menus,
    addons: store.addons,
    platforms: store.platforms,
    orders: store.orders,
    categories: store.categories,
    gasApiUrl: store.gasApiUrl
  }

  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `greek-yogurt-pos-backup-${dateStr}.json`
  a.click()
  URL.revokeObjectURL(url)
  store.showToast('ดาวน์โหลดไฟล์ข้อมูลสำรองสำเร็จ', 'success')
}

function handleImportFile(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (data.materials && data.menus && data.addons) {
        if (confirm('ยืนยันการกู้คืนข้อมูล? ข้อมูลปัจจุบันในเครื่องจะถูกแทนที่ด้วยข้อมูลจากไฟล์สำรอง')) {
          store.materials = data.materials
          store.menus = data.menus
          store.addons = data.addons
          if (data.categories) store.categories = data.categories
          if (data.platforms) store.platforms = data.platforms
          if (data.orders) store.orders = data.orders
          if (data.gasApiUrl) {
            store.gasApiUrl = data.gasApiUrl
            gasUrlInput.value = data.gasApiUrl
          }
          store.persistLocal()
          store.showToast('กู้คืนข้อมูลจากไฟล์สำรองสำเร็จเรียบร้อย', 'success')
        }
      } else {
        store.showToast('รูปแบบไฟล์สำรองไม่ถูกต้อง', 'error')
      }
    } catch (err) {
      console.error(err)
      store.showToast('ไม่สามารถอ่านไฟล์ JSON ได้: ' + err.message, 'error')
    }
  }
  reader.readAsText(file)
}

function confirmResetDemo() {
  if (confirm('คุณต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นชุดตัวอย่างตั้งต้น (Default Demo Data) หรือไม่?')) {
    store.resetDemoData()
  }
}
</script>
