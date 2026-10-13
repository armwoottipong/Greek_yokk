<template>
  <div class="flex flex-col md:flex-row h-dvh w-full overflow-hidden bg-[#FBF5EA] font-sans antialiased text-stone-900">
    <a data-skip-content class="skip-content" href="#main-content" @click.prevent="focusContent">ข้ามไปเนื้อหาหลัก</a>
    <!-- Sidebar Navigation -->
    <Sidebar :mobile-open="mobileMenuOpen" @close="mobileMenuOpen=false" />

    <!-- Main Content Layout -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <!-- Dynamic Header -->
      <HeaderBar :mobile-menu-open="mobileMenuOpen" @toggle-menu="mobileMenuOpen=!mobileMenuOpen" @request-close-navigation="mobileMenuOpen=false" />

      <div v-if="store.storageError" role="alert" class="mx-4 mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
        {{ store.storageError.message || store.storageError }}
      </div>

      <!-- Active View Content -->
      <main id="main-content" ref="contentRoot" tabindex="-1" :inert="mobileMenuOpen ? true : undefined" class="flex-1 overflow-y-auto p-4 md:p-6 outline-none">
        <Suspense @resolve="finishStartup">
          <KeepAlive>
            <component :is="currentViewComponent" />
          </KeepAlive>
        </Suspense>
      </main>
    </div>

    <!-- Modals Layer & Toasts (Teleported to body to ensure full screen coverage) -->
    <Teleport to="body">
      <MenuEditModal />
      <AddonEditModal />
      <MaterialEditModal />
      <StockInModal />
      <StockAdjustModal />
      <StocktakeModal />
      <WasteModal />
      <ActivityLogModal />
      <CustomOrderModal />
      <ReceiptModal />
      <LowStockWarningModal />
      <PackageReviewModal />
      <EmojiPickerPopover />
      <ConfirmModal />
      <LotDepletionModal />
      <ToastContainer />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, defineAsyncComponent, watch, nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import {overlayStack} from '@/composables/overlayState'
import { finishAppStartup, showAppStartupError } from '@/composables/appStartup'

import Sidebar from '@/components/layout/Sidebar.vue'
import HeaderBar from '@/components/layout/HeaderBar.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

// Views
function asyncView(loader) {
  return defineAsyncComponent({
    loader,
    onError(_error, _retry, fail) {
      showAppStartupError()
      fail()
    }
  })
}
const DashboardView = asyncView(() => import('@/views/DashboardView.vue'))
const PosView = asyncView(() => import('@/views/PosView.vue'))
const MenuView = asyncView(() => import('@/views/MenuView.vue'))
const AddonView = asyncView(() => import('@/views/AddonView.vue'))
const StockView = asyncView(() => import('@/views/StockView.vue'))
const SettingsView = asyncView(() => import('@/views/SettingsView.vue'))

// Modals
import MenuEditModal from '@/components/modals/MenuEditModal.vue'
import AddonEditModal from '@/components/modals/AddonEditModal.vue'
import MaterialEditModal from '@/components/modals/MaterialEditModal.vue'
import StockInModal from '@/components/modals/StockInModal.vue'
import StockAdjustModal from '@/components/modals/StockAdjustModal.vue'
import StocktakeModal from '@/components/modals/StocktakeModal.vue'
import WasteModal from '@/components/modals/WasteModal.vue'
import ActivityLogModal from '@/components/modals/ActivityLogModal.vue'
import CustomOrderModal from '@/components/modals/CustomOrderModal.vue'
import ReceiptModal from '@/components/modals/ReceiptModal.vue'
import LowStockWarningModal from '@/components/modals/LowStockWarningModal.vue'
import PackageReviewModal from '@/components/modals/PackageReviewModal.vue'
import EmojiPickerPopover from '@/components/modals/EmojiPickerPopover.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import LotDepletionModal from '@/components/modals/LotDepletionModal.vue'

const store = usePosStore()
const mobileMenuOpen=ref(false)
const contentRoot=ref(null)
const viewNames={dashboard:'ภาพรวมร้าน',pos:'ขายหน้าร้าน',menu:'เมนูและสูตร',addon:'ท็อปปิ้ง',stock:'คลังวัตถุดิบ',settings:'ตั้งค่าระบบ'}
function focusContent(){contentRoot.value?.focus({preventScroll:true})}
function finishStartup() {
 finishAppStartup()
 finishViewFocus()
}
let pendingViewFocus=false
function finishViewFocus(){
 if(!pendingViewFocus||overlayStack.length||document.getElementById('app')?.hasAttribute('inert'))return
 focusContent();pendingViewFocus=false
}
watch(()=>store.currentTab,async tab=>{document.title=`${viewNames[tab]||viewNames.dashboard} · Greek Yogg.`;pendingViewFocus=true;await nextTick();finishViewFocus()},{immediate:true,flush:'post'})
watch(()=>overlayStack.length,async count=>{if(count===0&&pendingViewFocus){await nextTick();finishViewFocus()}})

const currentViewComponent = computed(() => {
  switch (store.currentTab) {
    case 'pos':
      return PosView
    case 'menu':
      return MenuView
    case 'addon':
      return AddonView
    case 'stock':
      return StockView
    case 'settings':
      return SettingsView
    case 'dashboard':
    default:
      return DashboardView
  }
})

let handleHashChange = null

onMounted(() => {
  if (store.currentTab) {
    try {
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', `#${store.currentTab}`)
      }
    } catch (e) {}
  }

  handleHashChange = () => {
    const hash = window.location.hash ? window.location.hash.replace('#', '').toLowerCase() : ''
    const validTabs = ['dashboard', 'pos', 'menu', 'addon', 'stock', 'settings']
    if (validTabs.includes(hash) && store.currentTab !== hash) {
      store.switchTab(hash)
    }
  }

  window.addEventListener('hashchange', handleHashChange)
})

onUnmounted(() => {
  if (handleHashChange) {
    window.removeEventListener('hashchange', handleHashChange)
  }
})
</script>
