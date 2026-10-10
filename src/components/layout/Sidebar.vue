<template>
  <aside class="brand-sidebar w-full md:w-64 flex flex-col shrink-0 z-20 select-none">
    <!-- Brand Header -->
    <div class="brand-lockup shrink-0">
      <h1 class="sr-only">Greek Yogg.</h1>
      <img :src="mascotUrl" alt="มาสคอต Greek Yogg ยิ้มบนพื้นแดงเข้ม" class="brand-mascot" width="1774" height="887" />
    </div>

    <!-- Navigation Items -->
    <nav aria-label="เมนูหลัก" class="brand-navigation flex md:block md:flex-1 p-2 md:p-3 md:space-y-1.5 overflow-x-auto md:overflow-y-auto text-xs gap-1">
      <button
        v-for="item in navItems"
        :key="item.id"
        @click="store.switchTab(item.id)"
        :aria-current="store.currentTab === item.id ? 'page' : undefined"
        :class="[
          'brand-nav-item shrink-0 md:w-full flex items-center justify-between px-3.5 py-3 font-medium transition-colors text-left',
          store.currentTab === item.id
            ? 'bg-brand-600 text-white font-semibold'
            : 'text-stone-600 hover:text-brand-600 hover:bg-brand-50'
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
    <div class="hidden md:block p-4 border-t border-stone-100 bg-[#FBF5EA] text-xs">
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
const mascotUrl = `${import.meta.env.BASE_URL}brand/sidebar-header.png`

const navItems = computed(() => [
  { id: 'dashboard', label: 'ภาพรวม & งบต้นทุน', icon: LayoutDashboard },
  { id: 'pos', label: 'แคชเชียร์ (POS)', icon: ShoppingBag, badge: store.cart.length > 0 ? store.cart.reduce((s, i) => s + i.qty, 0) : null, badgeColor: 'bg-amber-600 text-white' },
  { id: 'menu', label: 'จัดการเมนู', icon: UtensilsCrossed, badge: `${store.menus.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'addon', label: 'จัดการ Add-on', icon: Sparkles, badge: `${store.addons.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'stock', label: 'คลังวัตถุดิบ & Package', icon: Package, badge: store.lowStockMaterials.length > 0 ? `เตือน ${store.lowStockMaterials.length}` : null, badgeColor: 'bg-rose-100 text-rose-700' },
  { id: 'settings', label: 'ตั้งค่า & ระบบ API', icon: Settings }
])
</script>
<style scoped>
.brand-sidebar{background:var(--bg-card);border-right:1px solid var(--border-subtle)}
.brand-lockup{display:flex;align-items:flex-end;justify-content:flex-end;height:var(--sidebar-header-height,var(--panel-header-height));background:#5E0205}
.brand-mascot{display:block;width:90%;height:90%;object-fit:contain;object-position:right bottom}
.brand-navigation{padding-top:18px}.brand-nav-item{border-radius:12px 20px 20px 12px;min-height:44px}.brand-nav-item:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
@media(max-width:767px){.brand-sidebar{border-right:0;border-bottom:1px solid var(--border-subtle)}.brand-navigation{padding-top:6px}.brand-nav-item{min-height:38px;padding:8px 12px}.brand-nav-item>div{gap:7px}}
</style>
