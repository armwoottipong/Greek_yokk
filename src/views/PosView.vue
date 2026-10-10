<template>
  <div class="h-[calc(100vh-8rem)] flex flex-col lg:flex-row gap-5 overflow-hidden">
    <!-- Left: Menu Catalog Area -->
    <div class="flex-1 flex flex-col min-w-0 space-y-4 overflow-hidden">
      <!-- Top Platform Bar & Search -->
      <div class="flex items-center justify-between gap-3 shrink-0">
        <!-- Platform selector pills -->
        <div class="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl overflow-x-auto no-scrollbar text-xs">
          <button
            v-for="p in store.platforms"
            :key="p.id"
            @click="store.setPlatform(p.id)"
            :class="[
              'px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5',
              store.currentPlatformId === p.id
                ? 'bg-white text-stone-900 shadow-xs font-semibold'
                : 'text-stone-500 hover:text-stone-900'
            ]"
          >
            <span>{{ p.name.replace(/\s*\([^)]*\)/g, '') }}</span>
            <span
              v-if="p.gpPercent > 0"
              class="text-[9px] font-number px-1 py-0.2 rounded bg-amber-100 text-amber-800"
            >
              {{ p.gpPercent }}%
            </span>
          </button>
        </div>

        <!-- Search input -->
        <div class="relative w-48 shrink-0">
          <Search class="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="ค้นหาเมนู..."
            class="soft-input w-full pl-8 pr-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>
      </div>

      <!-- Category Filter Pills -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0 text-xs">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="activeCategory = cat"
          :class="[
            'px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors',
            activeCategory === cat
              ? 'bg-brand-600 text-white font-semibold'
              : 'bg-white border border-stone-200/80 text-stone-600 hover:bg-stone-50'
          ]"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Menu Grid Cards -->
      <div class="flex-1 overflow-y-auto pr-1">
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          <button type="button"
            v-for="menu in filteredMenus"
            :key="menu.id"
            @click="handleMenuClick(menu)"
            :class="[
              'editorial-card p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.01] hover:shadow-md select-none',
              isMenuOutOfStock(menu) ? 'bg-amber-50/20 border-amber-200/60' : 'bg-white'
            ]"
          >
            <div>
              <div class="flex items-start justify-between gap-2 mb-2">
                <span class="text-3xl p-1.5 rounded-xl bg-[#FBF5EA] border border-stone-100">{{ menu.emoji }}</span>
                <span v-if="isMenuOutOfStock(menu)" class="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold flex items-center gap-1" title="วัตถุดิบหมด แต่สามารถกดสั่งขายต่อได้">
                  <span>⚠️</span>
                  <span>ของหมด (ขายต่อได้)</span>
                </span>
                <span v-else-if="menu.hasAddons" class="text-[10px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                  + Add-on ได้
                </span>
              </div>
              <h4 class="text-xs font-bold text-stone-900 line-clamp-1 mb-1">{{ menu.name }}</h4>
              <p class="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">{{ menu.description }}</p>
            </div>

            <div class="flex items-center justify-between pt-3 mt-2 border-t border-stone-100">
              <span class="text-sm font-bold font-number text-stone-900">
                ฿{{ getMenuPrice(menu) }}
              </span>
              <span class="text-[11px] text-amber-900 hover:underline font-medium">
                {{ menu.hasAddons ? 'ปรับแต่งชาม' : '+ ใส่รายการ' }}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Right: POS Order Cart Sidebar -->
    <div class="w-full lg:w-96 bg-white border border-stone-200/80 rounded-2xl flex flex-col shrink-0 shadow-sm overflow-hidden">
      <!-- Cart Header -->
      <div class="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50 shrink-0">
        <div class="flex items-center gap-2">
          <ShoppingBag class="w-4 h-4 text-stone-800" />
          <span class="text-xs font-bold text-stone-900">รายการสั่งซื้อปัจจุบัน</span>
        </div>
        <button
          v-if="store.cart.length > 0"
          @click="store.clearCart()"
          class="text-[11px] text-rose-600 hover:underline"
        >
          ล้างตะกร้า
        </button>
      </div>

      <!-- Cart Items List -->
      <div class="flex-1 p-4 overflow-y-auto space-y-2.5 text-xs">
        <div v-if="store.cart.length === 0" class="h-full flex flex-col items-center justify-center text-stone-400 space-y-2 py-12">
          <span class="text-4xl opacity-50">🥣</span>
          <p class="text-xs">ยังไม่มีรายการในออเดอร์</p>
          <p class="text-[11px] text-stone-400">คลิกที่เมนูด้านซ้ายเพื่อสั่งซื้อ</p>
        </div>

        <div
          v-for="(item, idx) in store.cart"
          :key="idx"
          class="p-3 rounded-xl bg-[#FBF5EA] border border-stone-100 space-y-2"
        >
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-xl">{{ item.menu.emoji }}</span>
              <div class="min-w-0">
                <div class="font-bold text-stone-900 truncate flex items-center gap-1.5">
                  <span class="truncate">{{ item.menu.name }}</span>
                  <span v-if="item.isBackorder" class="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 font-medium shrink-0">
                    ของหมด (ขายต่อ)
                  </span>
                </div>
                <div class="text-[10px] text-stone-400 font-number">฿{{ getItemBasePrice(item) }} / ชาม</div>
              </div>
            </div>
            <span class="font-number font-bold text-xs text-stone-900">
              ฿{{ getItemTotalPrice(item) }}
            </span>
          </div>

          <!-- Addons list in cart -->
          <div v-if="item.selectedAddons && item.selectedAddons.length > 0" class="pl-7 space-y-0.5 text-[10px] text-stone-500 border-l border-stone-200 ml-2">
            <div v-for="addon in item.selectedAddons" :key="addon.id" class="flex justify-between">
              <span>+ {{ addon.name }}</span>
              <span class="font-number">+฿{{ getAddonPrice(addon) }}</span>
            </div>
          </div>

          <!-- Quantity Stepper -->
          <div class="flex items-center justify-between pt-1">
            <div class="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-2 py-0.5">
              <button
                @click="store.updateCartQty(idx, item.qty - 1)"
                class="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold"
              >
                -
              </button>
              <span class="font-number font-bold text-xs w-4 text-center">{{ item.qty }}</span>
              <button
                @click="store.updateCartQty(idx, item.qty + 1)"
                class="w-5 h-5 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold"
              >
                +
              </button>
            </div>

            <button
              @click="store.removeFromCart(idx)"
              class="text-[11px] text-stone-400 hover:text-rose-600 transition-colors"
            >
              ลบ
            </button>
          </div>
        </div>
      </div>

      <!-- Cart Summary & Checkout -->
      <div v-if="store.cart.length > 0" class="p-4 bg-stone-50/80 border-t border-stone-200/80 space-y-3 shrink-0 text-xs">
        <!-- Order Note -->
        <div>
          <input
            v-model="store.orderNote"
            type="text"
            placeholder="หมายเหตุออเดอร์ เช่น หวานน้อย, แยกท็อปปิ้ง..."
            class="soft-input w-full px-3 py-1.5 rounded-xl text-xs text-stone-900 placeholder:text-stone-400"
          />
        </div>

        <!-- Breakdown summary -->
        <div class="space-y-1 text-[11px] text-stone-500">
          <div class="flex justify-between">
            <span>ยอดรวม (Subtotal):</span>
            <span class="font-number font-semibold text-stone-800">฿{{ cartSummary.subtotal }}</span>
          </div>
          <div v-if="cartSummary.gpAmount > 0" class="flex justify-between text-amber-800">
            <span>หักค่าธรรมเนียม GP ({{ cartSummary.gpPercent }}%):</span>
            <span class="font-number">-฿{{ cartSummary.gpAmount }}</span>
          </div>
          <div v-if="cartSummary.gpAmount > 0" class="flex justify-between text-emerald-800 font-medium">
            <span>รายรับสุทธิ (Net Revenue):</span>
            <span class="font-number font-bold">฿{{ cartSummary.netRevenue }}</span>
          </div>
          <div class="flex justify-between text-stone-400 pt-0.5 border-t border-stone-200/60">
            <span>ต้นทุนวัตถุดิบชาม (COGS):</span>
            <span class="font-number">~฿{{ Math.round(cartSummary.totalFoodCost) }} (กำไร ~฿{{ Math.round(cartSummary.grossProfit) }})</span>
          </div>
        </div>

        <!-- Payment Method -->
        <div class="flex gap-1.5 pt-1">
          <button
            v-for="pm in paymentMethods"
            :key="pm"
            @click="store.paymentMethod = pm"
            :class="[
              'flex-1 py-1.5 px-2 rounded-xl text-[10px] font-medium transition-all text-center',
              store.paymentMethod === pm
                ? 'bg-brand-600 text-white font-semibold shadow-xs'
                : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
            ]"
          >
            {{ pm }}
          </button>
        </div>

        <!-- Lot Warnings in Cart (Near depleted or low stock) -->
        <div v-if="store.cartLotWarnings && store.cartLotWarnings.length > 0" class="p-2.5 bg-amber-50 border border-amber-200/90 rounded-2xl space-y-2 text-xs">
          <div class="flex items-center justify-between text-amber-900 font-bold text-[11px] px-0.5">
            <span class="flex items-center gap-1.5">
              <span>⚠️</span>
              <span>ล็อตวัตถุดิบใกล้หมด / สต็อกไม่พอ</span>
            </span>
            <span class="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-200/80 text-amber-950 font-bold">
              {{ store.cartLotWarnings.length }} รายการ
            </span>
          </div>

          <div
            v-for="w in store.cartLotWarnings"
            :key="w.material.id"
            class="flex items-center justify-between gap-2 bg-white/90 p-2 rounded-xl border border-amber-200/60 shadow-2xs"
          >
            <div class="min-w-0 flex-1 truncate">
              <div class="font-bold text-stone-900 truncate text-[11px]">
                {{ w.material.emoji }} {{ w.material.name }}
              </div>
              <div class="text-[10px] text-stone-500 font-number truncate flex items-center gap-1">
                <span>มีในล็อตนี้: {{ w.availableInCurrent.toLocaleString() }} {{ w.material.unit }}</span>
                <span>•</span>
                <span :class="w.willDeplete ? 'text-rose-600 font-bold' : 'text-amber-700 font-medium'">
                  {{ w.shortageQty > 0 ? `ขาดอีก ${w.shortageQty} ${w.material.unit}` : (w.willDeplete ? 'สต็อกจะหมด' : 'ใกล้หมด') }}
                </span>
              </div>
            </div>
            <button
              type="button"
              @click="handleSwitchLot(w)"
              class="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-800 active:bg-brand-900 text-white font-semibold text-[10px] shrink-0 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
              title="สลับไปใช้ล็อตถัดไปทันที"
            >
              <span>ย้ายล็อต</span>
              <span>⚡</span>
            </button>
          </div>
        </div>

        <!-- Checkout Button -->
        <button
          @click="handleCheckout"
          class="w-full py-3 bg-brand-600 hover:bg-brand-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>ชำระเงินและตัดสต็อก (฿{{ cartSummary.subtotal }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Search, ShoppingBag, Check } from 'lucide-vue-next'

const store = usePosStore()

const searchQuery = ref('')
const activeCategory = ref('ทั้งหมด')
const paymentMethods = ['QR PromptPay', 'เงินสด', 'Platform Delivery']

const categories = computed(() => {
  const set = new Set(['ทั้งหมด'])
  store.menuCategories.forEach(c => set.add(c.name))
  store.menus.forEach(m => { if (m.category) set.add(m.category) })
  return Array.from(set)
})

const filteredMenus = computed(() => {
  return store.menus.filter(m => {
    if (m.isActive === false) return false
    const matchCat = activeCategory.value === 'ทั้งหมด' || m.category === activeCategory.value
    const q = searchQuery.value.trim().toLowerCase()
    const matchQ = !q || m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
    return matchCat && matchQ
  })
})

const cartSummary = computed(() => store.cartSummary)

function getMenuPrice(menu) {
  const platId = store.currentPlatformId
  return (menu.prices && menu.prices[platId] !== undefined) ? Number(menu.prices[platId]) : 0
}

function getAddonPrice(addon) {
  const platId = store.currentPlatformId
  return (addon.prices && addon.prices[platId] !== undefined) ? Number(addon.prices[platId]) : 0
}

function getItemBasePrice(item) {
  return getMenuPrice(item.menu)
}

function getItemTotalPrice(item) {
  const base = getItemBasePrice(item)
  const addonTotal = (item.selectedAddons || []).reduce((sum, a) => sum + getAddonPrice(a), 0)
  return (base + addonTotal) * item.qty
}

function isMenuOutOfStock(menu) {
  const check = store.checkStockAvailability(menu, [], 1)
  return !check.canAdd
}

function handleMenuClick(menu) {
  if (menu.hasAddons) {
    store.modals.customOrder = { isOpen: true, menuId: menu.id }
  } else {
    store.addToCart(menu, [], 1)
  }
}

async function handleSwitchLot(w) {
  const confirmed = await store.promptLotDepletion({
    material: w.material,
    currentLot: w.currentLot,
    nextLot: w.nextLot,
    neededQty: w.neededQty,
    availableInCurrent: w.availableInCurrent,
    remainingAfter: w.remainingAfter,
    shortageQty: w.shortageQty,
    willDeplete: w.willDeplete,
    isLow: w.isLow,
    actionContext: 'pos'
  })
  if (confirmed && w.nextLot) {
    store.switchActiveLotSilently(w.material.id, w.nextLot.id)
    store.showToast(`สลับล็อต ${w.material.name} เป็นล็อตใหม่เรียบร้อยแล้ว`, 'success')
  }
}

function handleCheckout() {
  if (store.cart.length === 0) return
  store.checkout()
}
</script>
