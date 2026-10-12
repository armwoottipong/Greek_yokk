<template>
 <DialogFrame :open="store.modals.customOrder.isOpen && Boolean(selectedMenu)" id="CustomOrderModal" title="ปรับแต่งชาม" :teleport="false" @request-close="requestClose">
  <template #header><div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <span class="text-3xl p-2 rounded-2xl bg-[#FBF5EA] border border-stone-100">{{ selectedMenu.emoji }}</span>
          <div>
            <h3 id="CustomOrderModal-title" class="text-base font-bold text-stone-900">{{ selectedMenu.name }}</h3>
            <p class="text-xs text-stone-400 mt-0.5">{{ selectedMenu.description }}</p>
          </div>
        </div>
        
      </div></template>
  <div class="space-y-4 text-xs">
        <div v-if="!selectedMenu.hasAddons" class="py-6 text-center text-stone-400 bg-[#FBF5EA] rounded-xl italic">
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
              <button type="button" :aria-pressed="isAddonSelected(addon.id)"
                v-for="addon in group"
                :key="addon.id"
                @click="toggleAddon(addon)"
                :class="[
                  'flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none',
                  isAddonSelected(addon.id)
                    ? 'bg-brand-50 border-brand-200 text-brand-900 font-medium'
                    : isAddonOutOfStock(addon)
                    ? 'bg-amber-50/40 border-amber-200/80 text-stone-800'
                    : 'bg-[#FBF5EA] border-stone-100 hover:border-stone-200 text-stone-800'
                ]"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-lg">{{ addon.emoji }}</span>
                  <div class="min-w-0">
                    <div class="font-semibold text-left">{{ addon.name }}</div>
                    <div v-if="isAddonOutOfStock(addon)" class="text-[11px] text-amber-700 font-semibold flex items-center gap-0.5">
                      <span>⚠️ ของหมด (เลือกได้)</span>
                    </div>
                    <div v-else-if="addon.recipe?.length" class="text-[11px] text-stone-400 text-left">ใช้ {{ addon.recipe.map(row => `${store.matMap[row.materialId]?.name || row.materialId} ${row.qty} ${getMatUnit(row.materialId)}`).join(' · ') }}</div>
                    <div v-else class="text-[11px] text-stone-400">ท็อปปิ้งสำเร็จรูป</div>
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
              </button>
            </div>
          </div>
        </div>
      </div>
  <template #footer><div class="custom-order-footer">
        <div>
          <span class="text-[11px] text-stone-400 block">ราคารวมต่อชาม</span>
          <span class="text-xl font-bold font-number text-stone-900">฿{{ totalBowlPrice }}</span>
        </div>

        <div class="custom-order-footer-actions">
          <div class="flex items-center gap-2 bg-white border border-stone-200 rounded-xl px-2 py-1">
            <button
              aria-label="ลดจำนวนชาม" :disabled="qty<=1" @click="qty = Math.max(1, qty - 1)"
              class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-900 font-bold"
            ><Minus :size="18" aria-hidden="true"/></button>
            <span class="font-number font-bold text-xs w-4 text-center">{{ qty }}</span>
            <button
              aria-label="เพิ่มจำนวนชาม" @click="qty += 1"
              class="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-900 font-bold"
            ><Plus :size="18" aria-hidden="true"/></button>
          </div>

          <button
            @click="addToCart"
            class="px-6 py-3 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-2"
          >
            <ShoppingBag class="w-4 h-4" />
            <span>เพิ่มลงตะกร้า (฿{{ totalBowlPrice * qty }})</span>
          </button>
        </div>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Minus, Plus, Check, ShoppingBag } from 'lucide-vue-next'

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
  return mat ? mat.unit : 'ไม่ระบุหน่วย'
}

function isAddonOutOfStock(addon) {
  return (addon.recipe || []).some(row => {
    const mat = store.matMap[row.materialId]
    if (!mat || mat.isDeleted || mat.isArchived) return true
    return mat.stock < Number(row.qty) * qty.value
  })
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
  if (selectedAddons.value.length > 0 || qty.value !== 1) {
    const ok = await store.confirmDialog({
      title: 'ยกเลิกชามที่ปรับแต่ง?',
      message: 'จำนวนชามและท็อปปิ้งที่ปรับไว้จะไม่ถูกเพิ่มลงตะกร้า ต้องการปิดหรือไม่?',
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
<style scoped>
.custom-order-footer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;width:100%;align-items:center}.custom-order-footer-actions{display:contents}.custom-order-footer-actions>button{grid-column:1/-1;justify-content:center;width:100%;min-height:44px;font-size:.875rem}.custom-order-footer-actions>div{justify-self:end;padding:0 4px;background:var(--bg-soft)}.custom-order-footer-actions>div>button{min-width:44px;min-height:44px}.custom-order-footer-actions>div>button:disabled{opacity:.4;cursor:not-allowed}
</style>

