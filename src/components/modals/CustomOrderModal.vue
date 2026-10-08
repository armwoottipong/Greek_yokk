<template>
  <div
    v-if="store.modals.customOrder.isOpen && selectedMenu"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
    @click.self="requestClose"
  >
    <div class="bg-white rounded-2xl border border-stone-200/80 shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      <!-- Header -->
      <div class="p-6 border-b border-stone-100 flex items-center justify-between shrink-0">
        <div class="flex items-center gap-3">
          <span class="text-3xl p-2 rounded-2xl bg-[#FAF9F6] border border-stone-100">{{ selectedMenu.emoji }}</span>
          <div>
            <h3 class="text-base font-bold text-stone-900">{{ selectedMenu.name }}</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ selectedMenu.description }}</p>
          </div>
        </div>
        <button @click="requestClose" class="text-stone-400 hover:text-stone-700 p-2 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Add-ons Selection Body -->
      <div class="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
        <div v-if="!selectedMenu.hasAddons" class="py-6 text-center text-stone-400 bg-[#FAF9F6] rounded-xl italic">
          เมนูนี้ไม่อนุญาตให้เลือก Add-on เพิ่มเติม
        </div>

        <div v-else class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="font-bold text-stone-800 flex items-center gap-1.5">
              <span>🍓</span>
              <span>เลือกท็อปปิ้ง & ผลไม้สดเสริม (Add-ons):</span>
            </span>
            <span class="text-[11px] text-stone-400">ราคาบน {{ store.currentPlatform.name }}</span>
          </div>

          <!-- Grouped Add-ons -->
          <div v-for="(group, catName) in groupedAddons" :key="catName" class="space-y-2">
            <div class="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">{{ catName }}</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div
                v-for="addon in group"
                :key="addon.id"
                @click="toggleAddon(addon)"
                :class="[
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                  isAddonSelected(addon.id)
                    ? 'bg-purple-50/80 border-purple-300 text-purple-950 font-medium'
                    : isAddonOutOfStock(addon)
                    ? 'bg-amber-50/40 border-amber-200/80 text-stone-800'
                    : 'bg-[#FAF9F6] border-stone-100 hover:border-stone-200 text-stone-800'
                ]"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-lg">{{ addon.emoji }}</span>
                  <div class="min-w-0">
                    <div v-if="isAddonOutOfStock(addon)" class="text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                      <span>⚠️ ของหมด (เลือกได้)</span>
                    </div>
                    <div v-else-if="addon.materialId" class="text-[10px] text-stone-400">ใช้ {{ addon.amountUsed }} {{ getMatUnit(addon.materialId) }}</div>
                    <div v-else class="text-[10px] text-stone-400">ท็อปปิ้งสำเร็จรูป</div>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <span class="font-number font-bold text-xs">
                    +฿{{ getAddonPrice(addon) }}
                  </span>
                  <div
                    :class="[
                      'w-4 h-4 rounded-md flex items-center justify-center border transition-colors',
                      isAddonSelected(addon.id)
                        ? 'bg-purple-700 border-purple-700 text-white'
                        : 'border-stone-300 bg-white'
                    ]"
                  >
                    <Check v-if="isAddonSelected(addon.id)" class="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Summary & Add to Cart -->
      <div class="p-6 bg-[#FAF9F6] border-t border-stone-200/80 flex items-center justify-between shrink-0">
        <div>
          <span class="text-[11px] text-stone-400 block">ราคารวมต่อชาม</span>
          <span class="text-xl font-bold font-number text-stone-900">฿{{ totalBowlPrice }}</span>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-2 py-1">
            <button
              @click="qty = Math.max(1, qty - 1)"
              class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-900 font-bold"
            >
              -
            </button>
            <span class="font-number font-bold text-xs w-4 text-center">{{ qty }}</span>
            <button
              @click="qty += 1"
              class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-900 font-bold"
            >
              +
            </button>
          </div>

          <button
            @click="addToCart"
            class="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <ShoppingBag class="w-4 h-4" />
            <span>เพิ่มลงตะกร้า (฿{{ totalBowlPrice * qty }})</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { X, Check, ShoppingBag } from 'lucide-vue-next'

const store = usePosStore()

const selectedAddons = ref([])
const qty = ref(1)

const selectedMenu = computed(() => {
  const menuId = store.modals.customOrder.menuId
  return menuId ? store.menus.find(m => m.id === menuId) : null
})

const groupedAddons = computed(() => {
  const groups = {}
  store.addons.filter(a => a.isActive !== false).forEach(addon => {
    const cat = addon.category || 'ท็อปปิ้ง'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(addon)
  })
  return groups
})

watch(() => store.modals.customOrder.isOpen, (open) => {
  if (open) {
    selectedAddons.value = []
    qty.value = 1
  }
})

function getAddonPrice(addon) {
  const platId = store.currentPlatformId
  return (addon.prices && addon.prices[platId] !== undefined) ? Number(addon.prices[platId]) : 0
}

function getMatUnit(matId) {
  const mat = store.matMap[matId]
  return mat ? mat.unit : 'g'
}

function isAddonOutOfStock(addon) {
  if (!addon.materialId) return false
  const mat = store.matMap[addon.materialId]
  if (!mat || mat.isDeleted) return true
  return mat.stock < (addon.amountUsed || 0)
}

function isAddonSelected(addonId) {
  return selectedAddons.value.some(a => a.id === addonId)
}

function toggleAddon(addon) {
  const idx = selectedAddons.value.findIndex(a => a.id === addon.id)
  if (idx >= 0) {
    selectedAddons.value.splice(idx, 1)
  } else {
    selectedAddons.value.push(addon)
  }
}

const totalBowlPrice = computed(() => {
  if (!selectedMenu.value) return 0
  const platId = store.currentPlatformId
  const basePrice = (selectedMenu.value.prices && selectedMenu.value.prices[platId] !== undefined)
    ? Number(selectedMenu.value.prices[platId])
    : 0
  const addonTotal = selectedAddons.value.reduce((sum, a) => sum + getAddonPrice(a), 0)
  return basePrice + addonTotal
})

function close() {
  store.modals.customOrder.isOpen = false
  store.modals.customOrder.menuId = null
}

async function requestClose() {
  if (selectedAddons.value.length > 0) {
    const ok = await store.confirmDialog({
      title: 'ยกเลิกการเลือกท็อปปิ้ง?',
      message: 'คุณได้เลือกท็อปปิ้งไว้ ต้องการปิดโดยไม่เพิ่มลงในรายการสั่งซื้อหรือไม่?',
      confirmText: 'ปิดหน้าต่าง',
      cancelText: 'เลือกต่อ',
      type: 'warning'
    })
    if (!ok) return
  }
  close()
}

function addToCart() {
  if (!selectedMenu.value) return
  const success = store.addToCart(selectedMenu.value, selectedAddons.value, qty.value)
  if (success) {
    close()
  }
}
</script>
