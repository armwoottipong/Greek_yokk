<template>
  <div class="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[#FBF5EA] font-sans antialiased text-stone-900">
    <!-- Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Layout -->
    <div class="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <!-- Dynamic Header -->
      <HeaderBar />

      <div v-if="store.storageError" role="alert" class="mx-4 mt-3 rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
        {{ store.storageError.message || store.storageError }}
      </div>

      <!-- Active View Content -->
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <KeepAlive>
          <component :is="currentViewComponent" />
        </KeepAlive>
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
      <EmojiPickerPopover />
      <ConfirmModal />
      <LotDepletionModal />
      <ToastContainer />
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, defineAsyncComponent } from 'vue'
import { usePosStore } from '@/stores/posStore'

import Sidebar from '@/components/layout/Sidebar.vue'
import HeaderBar from '@/components/layout/HeaderBar.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'

// Views
const DashboardView = defineAsyncComponent(() => import('@/views/DashboardView.vue'))
const PosView = defineAsyncComponent(() => import('@/views/PosView.vue'))
const MenuView = defineAsyncComponent(() => import('@/views/MenuView.vue'))
const AddonView = defineAsyncComponent(() => import('@/views/AddonView.vue'))
const StockView = defineAsyncComponent(() => import('@/views/StockView.vue'))
const SettingsView = defineAsyncComponent(() => import('@/views/SettingsView.vue'))

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
import EmojiPickerPopover from '@/components/modals/EmojiPickerPopover.vue'
import ConfirmModal from '@/components/modals/ConfirmModal.vue'
import LotDepletionModal from '@/components/modals/LotDepletionModal.vue'

const store = usePosStore()

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
