<template>
  <header class="h-16 bg-white border-b border-stone-200/80 px-6 flex items-center justify-between shrink-0 select-none">
    <div>
      <h2 class="text-base font-bold text-stone-900 flex items-center gap-2">
        <span>{{ pageTitle.title }}</span>
        <span v-if="pageTitle.badge" class="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-normal">
          {{ pageTitle.badge }}
        </span>
      </h2>
      <p class="text-xs text-stone-400 font-normal">{{ pageTitle.subtitle }}</p>
    </div>

    <div class="flex items-center gap-3">
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

<script setup>
import { computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { RotateCcw, RefreshCw as CloudSync, Trash2 } from 'lucide-vue-next'

const store = usePosStore()

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
        title: 'การตั้งค่าระบบ & Google Sheets API',
        subtitle: 'เชื่อมต่อ Google Apps Script สำหรับสำรองและดึงข้อมูล Realtime'
      }
    default:
      return { title: 'Greek Yogg.', subtitle: 'ระบบจัดการร้านกรีกโยเกิร์ต' }
  }
})
</script>
