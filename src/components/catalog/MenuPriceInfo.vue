<template>
 <span ref="root" class="menu-price-info" @focusout="leave">
  <button ref="trigger" type="button" class="menu-price-info-trigger" :aria-label="`รายละเอียดราคา ${platform.name}`"
   :aria-expanded="open" :aria-controls="open ? panelId : undefined" @click="$emit('toggle')">
   <Info :size="17" aria-hidden="true" />
  </button>
  <span v-if="open" :id="panelId" ref="panel" role="region" :aria-label="`รายละเอียดราคา ${platform.name}`" class="menu-price-info-panel" :style="position">
   <strong class="menu-price-info-heading">{{ platform.name }}</strong>
   <span>GP {{ platform.gpPercent ?? 0 }}%</span>
   <span :data-net-revenue="platform.id">หลังหัก GP ได้รับ <strong>{{ formatPrice(netAfterGp(sellingPrice, platform.gpPercent ?? 0)) }}</strong> บาท</span>
   <span v-if="platform.id !== 'PLAT01'" :data-price-recommendation="platform.id" class="menu-price-info-suggestion">
    <span v-if="suggestion !== null">ราคาแนะนำ <strong>฿{{ formatPrice(suggestion) }}</strong></span>
    <span v-else>{{ hasStorefront ? 'กรอกราคาหน้าร้านและตรวจ GP เพื่อดูราคาแนะนำ' : 'ไม่พบช่องทางหน้าร้านสำหรับคำนวณ' }}</span>
    <Button variant="secondary" size="compact" :disabled="suggestion === null" :aria-label="`ใช้ราคาแนะนำ ${platform.name}`" @click="$emit('apply', suggestion)">ใช้ราคาแนะนำ</Button>
    <span class="menu-price-info-formula">ราคาแนะนำ = ราคาหน้าร้าน ÷ (1 − GP / 100) ปัดขึ้นเป็นสตางค์ · คิดเฉพาะ GP ที่ตั้งไว้</span>
   </span>
  </span>
 </span>
</template>
<script setup>
import { ref, computed, watch, nextTick, onUnmounted, useId } from 'vue'
import { Info } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { recommendedPrice, netAfterGp } from '@/domain/pricing'
import { topOverlayLayer } from '@/composables/overlayState'

const props = defineProps({
 open: Boolean,
 platform: { type: Object, required: true },
 sellingPrice: { type: [Number, String], default: '' },
 storefrontPrice: { type: [Number, String], default: '' },
 hasStorefront: Boolean
})
const emit = defineEmits(['toggle', 'close', 'apply'])
const root = ref(null), trigger = ref(null), panel = ref(null), position = ref({})
const panelId = `menu-price-info-${useId()}`
const suggestion = computed(() => recommendedPrice(props.hasStorefront ? props.storefrontPrice : undefined, props.platform.gpPercent ?? 0))
const formatPrice = value => value === null ? '—' : value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function place() {
 if (!props.open || !trigger.value || !panel.value) return
 const anchor = trigger.value.getBoundingClientRect(), margin = 12
 const width = Math.min(300, window.innerWidth - margin * 2)
 const height = Math.min(panel.value.getBoundingClientRect().height, window.innerHeight - margin * 2)
 const below = anchor.bottom + 8
 const preferredTop = below + height <= window.innerHeight - margin ? below : anchor.top - height - 8
 const top = Math.max(margin, Math.min(preferredTop, window.innerHeight - height - margin))
 position.value = { zIndex: topOverlayLayer() + 10, width: `${width}px`, left: `${Math.max(margin, Math.min(anchor.right - width, window.innerWidth - width - margin))}px`, top: `${top}px`, maxHeight: `${window.innerHeight - margin * 2}px` }
}
function outside(event) { if (!root.value?.contains(event.target)) emit('close') }
function leave(event) { if (event.relatedTarget && !root.value?.contains(event.relatedTarget)) emit('close') }
function escape(event) {
 if (event.key !== 'Escape') return
 event.preventDefault(); event.stopPropagation()
 emit('close'); trigger.value?.focus()
}
function detach() {
 document.removeEventListener('pointerdown', outside, true)
 document.removeEventListener('keydown', escape, true)
 window.removeEventListener('resize', place)
 window.removeEventListener('scroll', place, true)
}
watch(() => props.open, async open => {
 detach()
 if (!open) return
 document.addEventListener('pointerdown', outside, true)
 document.addEventListener('keydown', escape, true)
 window.addEventListener('resize', place)
 window.addEventListener('scroll', place, true)
 await nextTick(); place()
})
watch(suggestion, async () => { await nextTick(); place() })
onUnmounted(detach)
</script>
<style scoped>
.menu-price-info{display:inline-flex;flex-shrink:0;color:var(--text-muted)}
.menu-price-info-trigger{display:grid;place-items:center;width:44px;height:44px;margin-inline-end:-10px;border-radius:10px;color:var(--text-muted);cursor:pointer}
.menu-price-info-trigger:hover,.menu-price-info-trigger[aria-expanded=true]{background:var(--accent-soft);color:var(--accent-brand)}
.menu-price-info-trigger:focus-visible{outline:2px solid var(--accent-brand);outline-offset:1px}
.menu-price-info-panel{position:fixed;display:grid;gap:10px;width:min(300px,calc(100vw - 24px));max-height:calc(100vh - 24px);padding:16px;background:var(--bg-card);color:var(--text-muted);box-shadow:var(--shadow-popup);border-radius:14px;font-size:.8125rem;line-height:1.7;text-align:left;overflow:auto;overscroll-behavior:contain;overflow-wrap:anywhere}
.menu-price-info-panel strong{font-weight:500;color:var(--text-main);font-variant-numeric:tabular-nums}
.menu-price-info-heading{font-size:.875rem}
.menu-price-info-suggestion{display:grid;gap:12px;padding-top:12px;border-top:1px solid var(--border-subtle)}
.menu-price-info-suggestion>.ui-button{justify-self:start;min-height:44px}
.menu-price-info-formula{font-size:.75rem;line-height:1.7}
</style>
