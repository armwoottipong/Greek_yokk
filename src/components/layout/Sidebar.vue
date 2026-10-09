<template>
  <aside class="w-full md:w-64 max-h-28 md:max-h-none bg-white border-r border-stone-200/80 flex flex-col shrink-0 z-20 select-none">
    <!-- Brand Header -->
    <div class="hidden md:flex h-20 px-5 border-b border-stone-100 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl bg-amber-900/10 flex items-center justify-center text-2xl shadow-xs">
          🥣
        </div>
        <div>
          <h1 class="text-base font-bold tracking-tight text-stone-900 font-sans">GREEK YOGG.</h1>
          <p class="text-[11px] text-stone-400 font-normal">POS & Raw Material Management</p>
        </div>
      </div>
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50" title="ระบบพร้อมใช้งาน"></span>
    </div>

    <!-- Navigation Items -->
    <nav class="flex md:block flex-1 p-2 md:p-3 md:space-y-1.5 overflow-x-auto md:overflow-y-auto text-xs gap-1">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="store.switchTab(item.id)"
        :class="[
          'shrink-0 md:w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium transition-all text-left',
          store.currentTab === item.id
            ? 'bg-stone-900 text-white shadow-xs font-semibold'
            : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/70'
        ]"
      >
        <div class="flex items-center gap-3">
          <component :is="item.icon" class="w-4 h-4" />
          <span class="whitespace-nowrap">{{ item.label }}</span>
        </div>
        <span
          v-if="item.badge" class="hidden md:inline"
          :class="[
            'text-[10px] px-2 py-0.5 rounded-full font-number',
            store.currentTab === item.id ? 'bg-white/20 text-white' : item.badgeColor
          ]"
        >
          {{ item.badge }}
        </span>
      </button>
    </nav>

    <!-- Bottom Store Info & Sync -->
    <div class="hidden md:block p-4 border-t border-stone-100 bg-[#FAF9F6] text-xs">
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-medium text-stone-500">สถานะคลัง & ต้นทุน</span>
        <div class="flex items-center gap-1.5 font-number">
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100/80 text-amber-900 font-medium">
            ฿{{ Math.round(store.totalInventoryValuation).toLocaleString() }}
          </span>
          <span
            v-if="store.draftInventoryValuationDiff !== 0"
            class="text-[10px] font-bold font-number tabular-nums"
            :class="store.draftInventoryValuationDiff > 0 ? 'text-emerald-600' : 'text-orange-500'"
            :title="`${store.draftInventoryValuationDiff > 0 ? '+' : ''}฿${Math.round(store.draftInventoryValuationDiff).toLocaleString()} (หลังบันทึก ≈ ฿${Math.round(store.projectedInventoryValuation).toLocaleString()})`"
          >
            {{ store.draftInventoryValuationDiff > 0 ? `+${Math.round(store.draftInventoryValuationDiff).toLocaleString()}` : Math.round(store.draftInventoryValuationDiff).toLocaleString() }}
          </span>
        </div>
      </div>
      <div class="flex items-center justify-between text-[11px] text-stone-400">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="store.gasApiUrl ? 'bg-emerald-500' : 'bg-stone-300'"></span>
          {{ store.gasApiUrl ? 'Google Sheets (ตั้งค่าแล้ว)' : 'Offline / Local' }}
        </span>
        <button
          v-if="store.gasApiUrl"
          @click="store.syncWithGas"
          class="text-amber-800 hover:underline font-medium"
        >
          ซิงค์
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Package,
  Settings
} from 'lucide-vue-next'

const store = usePosStore()

const navItems = computed(() => [
  { id: 'dashboard', label: 'ภาพรวม & งบต้นทุน', icon: LayoutDashboard },
  { id: 'pos', label: 'แคชเชียร์ (POS)', icon: ShoppingBag, badge: store.cart.length > 0 ? store.cart.reduce((s, i) => s + i.qty, 0) : null, badgeColor: 'bg-amber-600 text-white' },
  { id: 'menu', label: 'จัดการเมนู', icon: UtensilsCrossed, badge: `${store.menus.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'addon', label: 'จัดการ Add-on', icon: Sparkles, badge: `${store.addons.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'stock', label: 'คลังวัตถุดิบ & Package', icon: Package, badge: store.lowStockMaterials.length > 0 ? `เตือน ${store.lowStockMaterials.length}` : null, badgeColor: 'bg-rose-100 text-rose-700' },
  { id: 'settings', label: 'ตั้งค่า & ระบบ API', icon: Settings }
])
</script>
