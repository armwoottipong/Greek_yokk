<template>
  <header ref="panelHeader" class="brand-page-header bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0 select-none">
    <button id="mobile-menu-toggle" ref="menuToggle" type="button" class="mobile-menu-toggle" :class="{'is-open':mobileMenuOpen}" :aria-expanded="mobileMenuOpen" aria-controls="main-sidebar" :aria-label="mobileMenuOpen?'ปิดเมนูหลัก':'เปิดเมนูหลัก'" @click="$emit('toggle-menu')"><span></span><span></span><span></span></button>
    <div :inert="mobileMenuOpen" class="min-w-0">
      <h2 class="text-base font-bold text-stone-900 flex items-center gap-2">
        <span>{{ pageTitle.title }}</span>
        <span v-if="pageTitle.badge" class="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-normal">
          {{ pageTitle.badge }}
        </span>
      </h2>
      <p class="text-xs text-stone-400 font-normal">{{ pageTitle.subtitle }}</p>
    </div>

    <div :inert="mobileMenuOpen" class="flex items-center gap-3">
      <!-- Low Stock Alert Pill -->
      <button
        v-if="store.lowStockMaterials.length > 0"
        @click="store.switchTab('stock')"
        class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60 text-xs font-medium hover:bg-rose-100 transition-colors"
        title="คลิกเพื่อดูวัตถุดิบที่ต้องเติม"
      >
        <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
        <span>วัตถุดิบใกล้หมด: {{ store.lowStockMaterials.length }} รายการ</span>
      </button>

      <!-- Activity Log Button -->
      <button
        @click="store.openActivityLog('all')"
        class="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-700 hover:text-stone-900 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        title="ดูประวัติและบันทึกกิจกรรมทั้งหมด"
      >
        <History class="w-3.5 h-3.5 text-stone-500" />
        <span class="hidden sm:inline">ประวัติกิจกรรม</span>
      </button>

      <!-- Clear All Data Button -->
      <button
        @click="confirmClearAll"
        class="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        title="ล้างข้อมูลทั้งหมดออก (เริ่มร้านใหม่)"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">ล้างข้อมูลทั้งหมด</span>
      </button>

      <!-- Refresh Demo Data Button -->
      <button
        @click="confirmResetDemo"
        class="px-3 py-1.5 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
        title="โหลดข้อมูลตัวอย่าง (Demo Data)"
      >
        <RotateCcw class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">โหลด Demo</span>
      </button>

      <!-- Sync Button -->
      <button
        v-if="store.gasApiUrl"
        @click="store.syncWithGas()"
        :disabled="store.isSyncing"
        class="px-3.5 py-1.5 rounded-xl bg-amber-900/10 hover:bg-amber-900/20 text-amber-900 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
      >
        <CloudSync class="w-3.5 h-3.5" :class="{ 'animate-spin': store.isSyncing }" />
        <span class="hidden sm:inline">{{ store.isSyncing ? 'กำลังซิงค์...' : 'Sync Sheets' }}</span>
      </button>
    </div>
  </header>
</template>
<style scoped>
.brand-page-header{min-height:var(--panel-header-height);padding:16px 24px;gap:16px}.brand-page-header h2{letter-spacing:-.3px}.brand-page-header p{margin-top:4px;color:var(--text-muted)}
.mobile-menu-toggle{display:none;background:transparent;border:0;padding:11px;width:44px;height:44px;color:var(--accent-brand);cursor:pointer}
.mobile-menu-toggle span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transform-origin:center}
.mobile-menu-toggle span+span{margin-top:5px}.mobile-menu-toggle.is-open span:first-child{transform:translateY(7px) rotate(45deg)}.mobile-menu-toggle.is-open span:nth-child(2){opacity:0;transform:scaleX(.3)}.mobile-menu-toggle.is-open span:last-child{transform:translateY(-7px) rotate(-45deg)}
.mobile-menu-toggle:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
@media(max-width:767px){.brand-page-header{padding-left:66px}.mobile-menu-toggle{display:block;position:fixed;left:10px;top:12px;z-index:70}.mobile-menu-toggle.is-open{color:var(--bg-card)}}
@media(prefers-reduced-motion:no-preference){.mobile-menu-toggle span{transition:transform 200ms ease,opacity 140ms ease}}
@media(max-width:639px){.brand-page-header{padding:12px 16px;gap:8px;align-items:flex-start;flex-wrap:wrap}.brand-page-header h2{font-size:14px}.brand-page-header p{font-size:10px}.brand-page-header>div:last-child{gap:6px;margin-left:auto}}
@media(max-width:639px){.brand-page-header{padding-left:66px}}
</style>

<script setup>
import { computed, ref, onMounted, onUnmounted,watch,nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { RotateCcw, RefreshCw as CloudSync, Trash2, History } from 'lucide-vue-next'

const store = usePosStore()
const props=defineProps({mobileMenuOpen:Boolean})
defineEmits(['toggle-menu'])
const menuToggle=ref(null)
watch(()=>props.mobileMenuOpen,async(open,previous)=>{if(!open && previous){await nextTick();menuToggle.value?.focus()}})
const panelHeader = ref(null)
let headerObserver
function syncHeaderHeight() {
  const height = panelHeader.value?.getBoundingClientRect().height
  if (height > 0) document.documentElement.style.setProperty('--sidebar-header-height', `${height}px`)
}
onMounted(() => {
  syncHeaderHeight()
  if (typeof ResizeObserver !== 'undefined') {
    headerObserver = new ResizeObserver(syncHeaderHeight)
    headerObserver.observe(panelHeader.value)
  }
})
onUnmounted(() => {
  headerObserver?.disconnect()
  document.documentElement.style.removeProperty('--sidebar-header-height')
})

async function confirmClearAll() {
  const ok = await store.confirmDialog({
    title: 'ยืนยันล้างข้อมูลทั้งหมดออก?',
    message: 'เมนู, วัตถุดิบ, สต็อก, Add-on และประวัติคำสั่งซื้อทั้งหมดจะถูกล้าง\n\n(คุณสามารถกด "โหลด Demo" เพื่อนำชุดข้อมูลตัวอย่างกลับมาได้ทุกเมื่อ)',
    confirmText: 'ล้างข้อมูลทั้งหมด',
    cancelText: 'ยกเลิก',
    type: 'danger'
  })
  if (ok) {
    store.clearAllData()
  }
}

async function confirmResetDemo() {
  const ok = await store.confirmDialog({
    title: 'โหลดชุดข้อมูลตัวอย่าง Demo?',
    message: 'ข้อมูลออเดอร์, ยอดสต็อก และเมนูจะถูกแทนที่ด้วยชุดข้อมูลตัวอย่างสำหรับร้านกรีกโยเกิร์ต\n\nต้องการดำเนินการต่อหรือไม่?',
    confirmText: 'โหลดข้อมูล Demo',
    cancelText: 'ยกเลิก',
    type: 'warning'
  })
  if (ok) {
    store.resetDemoData()
  }
}

const pageTitle = computed(() => {
  switch (store.currentTab) {
    case 'dashboard':
      return {
        title: 'ภาพรวมยอดขาย & งบต้นทุน',
        subtitle: 'รายงานรายได้ ค่า GP สัดส่วนกำไร และมูลค่าวัตถุดิบคงคลังรวม'
      }
    case 'pos':
      return {
        title: 'หน้าแคชเชียร์ขายหน้าร้าน (POS)',
        subtitle: 'สร้างออเดอร์ เลือกลงชาม และคำนวณหักสต็อกอัตโนมัติ'
      }
    case 'menu':
      return {
        title: 'จัดการเมนู & สูตรวัตถุดิบ (Menu BOM)',
        subtitle: 'ตั้งราคาแยก Platform สูตรตัดเบส และบรรจุภัณฑ์ที่ตัดสต็อก'
      }
    case 'addon':
      return {
        title: 'จัดการ Add-on & ท็อปปิ้ง',
        subtitle: 'รายการท็อปปิ้งเสริม ราคาบวกเพิ่ม และการผูกตัดวัตถุดิบ'
      }
    case 'stock':
      return {
        title: 'คลังวัตถุดิบ & บรรจุภัณฑ์ (Raw Materials & BOM)',
        subtitle: 'ตรวจสอบสต็อกคงเหลือ รับเข้า ปรับยอด และงบประมาณเติมของ'
      }
    case 'settings':
      return {
        title: 'ตั้งค่าระบบ',
        subtitle: 'จัดการข้อมูลร้าน หมวดหมู่ และการสำรองข้อมูล'
      }
    default:
      return { title: 'Greek Yogg.', subtitle: 'ระบบจัดการร้านกรีกโยเกิร์ต' }
  }
})
</script>
