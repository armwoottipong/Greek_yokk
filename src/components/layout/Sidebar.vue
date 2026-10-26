<template>
  <div v-if="isTablet && mobileOpen" class="sidebar-rail-placeholder" aria-hidden="true"></div>
  <div v-if="mobileOpen" class="mobile-menu-backdrop" aria-hidden="true" @click="$emit('close')"></div>
  <aside id="main-sidebar" ref="sidebar" :class="{'is-mobile-open':mobileOpen,'is-tablet-rail':isTablet&&!mobileOpen}" :inert="isMobile && !mobileOpen ? true : undefined" :role="isCompact && mobileOpen?'dialog':undefined" :aria-modal="isCompact && mobileOpen?'true':undefined" aria-label="เมนูหลัก Greek Yogg." class="brand-sidebar w-full md:w-64 flex flex-col shrink-0 z-20 select-none">
    <!-- Brand Header -->
    <div class="brand-lockup shrink-0">
      <h1 class="sr-only">Greek Yogg.</h1>
      <img :src="mascotUrl" alt="มาสคอต Greek Yogg ยิ้มบนพื้นแดงเข้ม" class="brand-mascot" width="1774" height="887" />
    </div>

    <!-- Navigation Items -->
    <nav aria-label="เมนูหลัก" class="brand-navigation flex md:block md:flex-1 p-2 md:p-3 md:space-y-1.5 overflow-x-auto md:overflow-y-auto text-xs gap-1">
      <button
        v-for="item in navItems"
        :key="item.id" :disabled="item.disabled"
        :aria-label="item.label + (item.alert ? ' มีวัตถุดิบใกล้หมด' : item.badge ? ' ' + item.badge : '')" :title="item.label + (item.disabled ? ' · ยังไม่เปิดใช้ใน Firebase' : '')"
        @click="navigate(item.id)"
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
          v-if="item.alert"
          aria-hidden="true"
          class="w-2 h-2 shrink-0 rounded-full"
          :class="store.currentTab === item.id ? 'bg-white' : 'bg-rose-600'"
        ></span>
        <span
          v-else-if="item.badge" class="hidden md:inline"
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
      <div class="flex items-center justify-between text-[12px] text-stone-500">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full" :class="(model ? model.connected : store.gasApiUrl) ? 'bg-emerald-500' : 'bg-stone-300'"></span>
          {{ model ? (model.connected ? 'Firebase (เชื่อมต่อแล้ว)' : 'Firebase (ขาดการเชื่อมต่อ)') : store.gasApiUrl ? 'Google Sheets (ตั้งค่าแล้ว)' : 'Offline / Local' }}
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
import { computed,ref,watch,nextTick,onMounted,onUnmounted } from 'vue'
import {useMediaQuery} from '@/composables/useMediaQuery'
import {useOverlayScrollLock} from '@/composables/useOverlayScrollLock'
import { usePosStore } from '@/stores/posStore'
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Package,
  Settings
} from 'lucide-vue-next'

const props=defineProps({mobileOpen:Boolean,model:Object,items:Array})
const store = props.model || usePosStore()
const emit=defineEmits(['close'])
const sidebar=ref(null)
const isMobile=useMediaQuery('(max-width:767px)'),isCompact=useMediaQuery('(max-width:1199px)')
const isTablet=computed(()=>isCompact.value&&!isMobile.value)
useOverlayScrollLock(computed(()=>props.mobileOpen&&isCompact.value),sidebar)
watch(isCompact,value=>{if(!value)emit('close')})
function navigate(id){store.switchTab(id);emit('close')}
function handleKeys(event){
 if(!props.mobileOpen || !isCompact.value)return
 if(event.key==='Escape'){event.preventDefault();emit('close')}
 if(event.key==='Tab'){
  const trigger=document.getElementById('mobile-menu-toggle')
  const targets=[trigger,...sidebar.value.querySelectorAll('button:not(:disabled)')].filter(Boolean)
  const index=targets.indexOf(document.activeElement)
  const next=event.shiftKey?(index<=0?targets.length-1:index-1):(index+1)%targets.length
  event.preventDefault();targets[next]?.focus()
 }
}
watch(()=>props.mobileOpen,async open=>{if(open){await nextTick();sidebar.value?.querySelector('button[aria-current="page"],button')?.focus()}})
onMounted(()=>document.addEventListener('keydown',handleKeys))
onUnmounted(()=>document.removeEventListener('keydown',handleKeys))
const mascotUrl = `${import.meta.env.BASE_URL}brand/sidebar-header.png`

const navItems = computed(() => props.items || [
  { id: 'dashboard', label: 'ภาพรวม & งบต้นทุน', icon: LayoutDashboard },
  { id: 'pos', label: 'แคชเชียร์ (POS)', icon: ShoppingBag, badge: store.cart.length > 0 ? store.cart.reduce((s, i) => s + i.qty, 0) : null, badgeColor: 'bg-amber-600 text-white' },
  { id: 'menu', label: 'จัดการเมนู', icon: UtensilsCrossed, badge: `${store.menus.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'addon', label: 'จัดการ Add-on', icon: Sparkles, badge: `${store.addons.length} รายการ`, badgeColor: 'bg-stone-100 text-stone-600' },
  { id: 'stock', label: 'คลังวัตถุดิบ & Package', icon: Package, alert: store.lowStockMaterials.length > 0 },
  { id: 'settings', label: 'ตั้งค่า & ระบบ API', icon: Settings }
].map(item => ({...item, disabled: !!props.model && !props.model.availableTabs.includes(item.id)})))
</script>
<style scoped>
.brand-sidebar{background:var(--bg-card);border-right:1px solid transparent}
.brand-lockup{display:flex;align-items:flex-end;justify-content:flex-end;height:var(--sidebar-header-height,var(--panel-header-height));background:#5E0205}
.brand-mascot{display:block;width:90%;height:90%;object-fit:contain;object-position:right bottom}
.brand-navigation{padding-top:18px}.brand-nav-item{border-radius:12px 20px 20px 12px;min-height:44px}.brand-nav-item:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
.mobile-menu-backdrop{display:none}
@media(max-width:767px){
 .mobile-menu-backdrop{display:block;position:fixed;inset:0;background:#35252255;backdrop-filter:blur(3px);z-index:50}
 .brand-sidebar{position:fixed;inset:0 auto 0 0;width:min(300px,85vw);height:100dvh;z-index:60;transform:translateX(-100%);visibility:hidden;border-right:1px solid transparent;box-shadow:12px 0 40px #58040618}
 .brand-sidebar.is-mobile-open{transform:translateX(0);visibility:visible}
 .brand-lockup{height:96px;min-height:96px}
 .brand-navigation{display:block;flex:1;overflow-x:hidden;overflow-y:auto;padding:18px 12px}
 .brand-nav-item{width:100%;min-height:48px;padding:12px;margin-bottom:6px}.brand-nav-item>div{gap:12px}
 .brand-nav-item>span{display:inline}.brand-sidebar>div:last-child{display:block}
}
@media(prefers-reduced-motion:no-preference) and (max-width:767px){.brand-sidebar{transition:transform 230ms cubic-bezier(.2,.8,.3,1),visibility 230ms}.mobile-menu-backdrop{animation:drawer-backdrop-in 180ms ease-out}}
@keyframes drawer-backdrop-in{from{opacity:0}to{opacity:1}}

.sidebar-rail-placeholder{width:72px;flex-shrink:0}
@media(min-width:768px) and (max-width:1199px){
 .brand-sidebar{width:72px}.brand-sidebar.is-tablet-rail .brand-navigation{padding:12px 8px}
 .brand-sidebar.is-tablet-rail .brand-nav-item{justify-content:center;padding:12px;width:56px}
 .brand-sidebar.is-tablet-rail .brand-nav-item>div>span,.brand-sidebar.is-tablet-rail .brand-nav-item>span,.brand-sidebar.is-tablet-rail>div:last-child{display:none}
 .brand-sidebar.is-mobile-open{position:fixed;inset:0 auto 0 0;width:min(300px,85vw);height:100dvh;z-index:60;box-shadow:12px 0 40px #58040618}
 .brand-sidebar.is-mobile-open .brand-navigation{display:block;flex:1;overflow-y:auto}.brand-sidebar.is-mobile-open .brand-nav-item{width:100%}
 .mobile-menu-backdrop{display:block;position:fixed;inset:0;background:#35252255;z-index:50}
}
</style>



<style scoped>.brand-nav-item:disabled{opacity:.5;cursor:not-allowed}</style>
