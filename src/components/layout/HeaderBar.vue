<template>
 <header ref="panelHeader" class="brand-page-header">
  <button id="mobile-menu-toggle" ref="menuToggle" type="button" class="mobile-menu-toggle" :class="{'is-open':mobileMenuOpen}" :aria-expanded="mobileMenuOpen" aria-controls="main-sidebar" :aria-label="mobileMenuOpen?'ปิดเมนูหลัก':'เปิดเมนูหลัก'" @click="$emit('toggle-menu')"><span></span><span></span><span></span></button>
  <div :inert="mobileMenuOpen ? true : undefined" class="header-page-title"><h2>{{ pageTitle.title }}<small v-if="pageTitle.badge">{{ pageTitle.badge }}</small></h2><p>{{ pageTitle.subtitle }}</p></div>
  <div :inert="mobileMenuOpen ? true : undefined" class="header-quick-actions">
   <Button v-if="store.lowStockMaterials.length" size="compact" variant="quiet" :aria-label="'วัตถุดิบใกล้หมด '+store.lowStockMaterials.length+' รายการ'" @click="store.switchTab('stock')"><Package :size="16" aria-hidden="true"/><span>{{ store.lowStockMaterials.length }}</span></Button>
   <Button size="compact" variant="quiet" aria-label="ประวัติกิจกรรม" @click="store.openActivityLog('all')"><History :size="17" aria-hidden="true"/><span class="header-action-label">ประวัติ</span></Button>
   <Button v-if="store.gasApiUrl" size="compact" variant="quiet" :loading="store.isSyncing" aria-label="สำรองข้อมูลไป Google Sheets" @click="store.syncWithGas()"><CloudSync :size="17" aria-hidden="true"/><span class="header-action-label">สำรองข้อมูล</span></Button>
   <button ref="moreButton" data-header-more class="header-more" type="button" aria-label="คำสั่งระบบเพิ่มเติม" aria-haspopup="dialog" :aria-expanded="actionsOpen" aria-controls="header-system-actions" @click="openActions"><MoreHorizontal :size="21" aria-hidden="true"/></button>
  </div>
 </header>
 <DialogFrame :open="actionsOpen" id="header-system-actions" title="คำสั่งระบบ" description="สำรองข้อมูล หรือเริ่มต้นข้อมูลร้านใหม่" presentation="sheet" @request-close="actionsOpen=false">
  <div class="header-system-actions">
   <Button variant="secondary" :disabled="!store.gasApiUrl||store.isSyncing" @click="runSystemAction('sync')"><CloudSync :size="18" aria-hidden="true"/>สำรองไป Google Sheets</Button>
   <p v-if="!store.gasApiUrl">เชื่อมต่อ Google Sheets ที่หน้าตั้งค่าก่อนสำรองออนไลน์</p>
   <Button variant="secondary" @click="store.switchTab('settings');actionsOpen=false">เปิดหน้าตั้งค่าและสำรองไฟล์</Button>
   <div class="header-action-divider"></div>
   <Button variant="quiet" @click="runSystemAction('demo')"><RotateCcw :size="18" aria-hidden="true"/>โหลดข้อมูลตัวอย่าง</Button>
   <Button variant="danger" @click="runSystemAction('clear')"><Trash2 :size="18" aria-hidden="true"/>ล้างข้อมูลทั้งหมด</Button>
   <p>การเริ่มข้อมูลใหม่จะแทนที่ข้อมูลปัจจุบัน และมีขั้นตอนยืนยันก่อนดำเนินการ</p>
  </div>
 </DialogFrame>
</template>
<style scoped>
.brand-page-header{min-height:var(--panel-header-height);display:flex;align-items:center;justify-content:space-between;padding:16px 24px;gap:16px;border-bottom:1px solid var(--border-subtle);background:var(--bg-card);flex-shrink:0}
.header-page-title{min-width:0}.header-page-title h2{font-size:1rem;font-weight:600;line-height:1.5;letter-spacing:-.3px}.header-page-title p{font-size:.75rem;line-height:1.6;color:var(--text-muted);margin-top:3px}.header-page-title small{margin-left:8px}
.header-quick-actions{display:flex;align-items:center;gap:6px;flex-shrink:0}.header-more{display:grid;place-items:center;width:44px;height:44px;border-radius:10px;color:var(--accent-brand);background:transparent}.header-more:hover{background:var(--bg-soft)}
.header-system-actions{display:grid;gap:12px}.header-system-actions>.ui-button{justify-content:flex-start;text-align:left}.header-system-actions p{font-size:.75rem;color:var(--text-muted);line-height:1.7}.header-action-divider{height:1px;background:var(--border-subtle);margin:8px 0}
.mobile-menu-toggle{display:none;background:transparent;border:0;padding:11px;width:44px;height:44px;color:var(--accent-brand);cursor:pointer}
.mobile-menu-toggle span{display:block;width:22px;height:2px;background:currentColor;border-radius:2px;transform-origin:center}.mobile-menu-toggle span+span{margin-top:5px}
.mobile-menu-toggle.is-open span:first-child{transform:translateY(7px) rotate(45deg)}.mobile-menu-toggle.is-open span:nth-child(2){opacity:0;transform:scaleX(.3)}.mobile-menu-toggle.is-open span:last-child{transform:translateY(-7px) rotate(-45deg)}
.mobile-menu-toggle:focus-visible{outline:2px solid var(--accent-brand);outline-offset:2px}
@media(max-width:1199px){.brand-page-header{padding-left:66px}.mobile-menu-toggle{display:block;position:fixed;left:82px;top:12px;z-index:70}.mobile-menu-toggle.is-open{left:10px;color:var(--bg-card)}.header-action-label{display:none}}
@media(max-width:767px){.mobile-menu-toggle{left:10px}.brand-page-header{padding:12px 12px 12px 66px;gap:8px;align-items:center}.header-page-title h2{font-size:.875rem}.header-page-title p{display:none}.header-quick-actions{gap:0}.header-quick-actions>.ui-button{padding:10px;min-width:44px}}
@media(prefers-reduced-motion:no-preference){.mobile-menu-toggle span{transition:transform 200ms ease,opacity 140ms ease}}
</style>
<script setup>
import { computed, ref, onMounted, onUnmounted,watch,nextTick } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { RotateCcw, RefreshCw as CloudSync, Trash2, History,MoreHorizontal,Package } from 'lucide-vue-next'

import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'

const store = usePosStore()
const props=defineProps({mobileMenuOpen:Boolean})
const emit=defineEmits(['toggle-menu','request-close-navigation'])
const actionsOpen=ref(false),moreButton=ref(null)
function openActions(){emit('request-close-navigation');actionsOpen.value=true}
async function runSystemAction(kind){actionsOpen.value=false;try{if(kind==='clear')await confirmClearAll();else if(kind==='demo')await confirmResetDemo();else await store.syncWithGas()}finally{await nextTick();moreButton.value?.focus()}}
const menuToggle=ref(null)
watch(()=>props.mobileMenuOpen,async(open,previous)=>{if(open)actionsOpen.value=false;if(!open&&previous){await nextTick();if(menuToggle.value&&getComputedStyle(menuToggle.value).display!=='none')menuToggle.value.focus();else document.querySelector('.brand-nav-item[aria-current="page"]')?.focus()}})
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
        title: 'ภาพรวมร้าน',
        subtitle: 'รายงานรายได้ ค่า GP สัดส่วนกำไร และมูลค่าวัตถุดิบคงคลังรวม'
      }
    case 'pos':
      return {
        title: 'ขายหน้าร้าน',
        subtitle: 'สร้างออเดอร์ เลือกลงชาม และคำนวณหักสต็อกอัตโนมัติ'
      }
    case 'menu':
      return {
        title: 'เมนูและสูตร',
        subtitle: 'ตั้งราคาแยก Platform สูตรตัดเบส และบรรจุภัณฑ์ที่ตัดสต็อก'
      }
    case 'addon':
      return {
        title: 'ท็อปปิ้ง',
        subtitle: 'รายการท็อปปิ้งเสริม ราคาบวกเพิ่ม และการผูกตัดวัตถุดิบ'
      }
    case 'stock':
      return {
        title: 'คลังวัตถุดิบ',
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

