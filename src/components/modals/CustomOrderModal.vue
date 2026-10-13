<template>
 <DialogFrame :open="store.modals.customOrder.isOpen && Boolean(selectedMenu)" id="CustomOrderModal" title="รายละเอียดสินค้า" presentation="drawer" width="520px" :teleport="false" @request-close="requestClose">
  <div class="product-detail"><div class="product-visual" aria-hidden="true">{{ selectedMenu.emoji }}</div><div class="bowl-heading"><h3>{{ selectedMenu.name }}</h3><p>{{ selectedMenu.description }}</p><strong class="product-base-price font-number">฿{{ basePrice }}</strong></div></div>
  <section v-if="selectedMenu.hasAddons" class="bowl-options" aria-label="ปรับแต่งท็อปปิ้ง">
   <header><div><h4>เลือกท็อปปิ้งเพิ่ม</h4><p>ราคาบน {{ store.currentPlatform.name }}</p></div><span>{{ selectedAddons.length ? 'เลือกแล้ว '+selectedAddons.length+' รายการ' : 'เลือกได้ตามชอบ' }}</span></header>
   <p v-if="!selectedMenu.hasAddons" class="bowl-no-addons">เมนูนี้ไม่อนุญาตให้เลือก Add-on เพิ่มเติม</p>
   <p v-else-if="!activeAddons.length" class="bowl-no-addons">ยังไม่มีท็อปปิ้งเพิ่มเติม เพิ่มชามนี้ลงตะกร้าได้เลย</p>
   <div v-else class="bowl-addon-grid">
    <button v-for="addon in activeAddons" :key="addon.id" type="button" class="bowl-addon" :class="{'is-selected':isAddonSelected(addon.id),'is-unavailable':isAddonOutOfStock(addon)}" :aria-pressed="isAddonSelected(addon.id)" @click="toggleAddon(addon)">
     <span class="bowl-addon-emoji" aria-hidden="true">{{ addon.emoji }}</span>
     <span class="bowl-addon-name"><strong>{{ addon.name }}</strong><small v-if="isAddonOutOfStock(addon)">ของหมด · ยืนยันเลือกต่อได้</small><small v-else-if="addon.recipe?.length">{{ addon.recipe.map(row => `${store.matMap[row.materialId]?.name || row.materialId} ${row.qty} ${getMatUnit(row.materialId)}`).join(' · ') }}</small><small v-else>ท็อปปิ้งสำเร็จรูป</small></span>
     <span class="bowl-addon-price font-number">+฿{{ getAddonPrice(addon) }}</span><span class="bowl-addon-check" aria-hidden="true"><Check v-if="isAddonSelected(addon.id)" :size="15"/><Plus v-else :size="15"/></span>
    </button>
   </div>
  </section>
  <FormField id="product-item-note" label="หมายเหตุรายการนี้" hint="หมายเหตุนี้ใช้กับจำนวนที่เลือกในรายการนี้" class="product-note" v-slot="{controlId,describedBy}"><textarea :id="controlId" v-model="itemNote" :aria-describedby="describedBy" aria-label="หมายเหตุรายการนี้" rows="3" placeholder="เช่น ไม่ใส่น้ำผึ้ง แยกท็อปปิ้ง หรือไม่รับช้อน"/></FormField>
  <template #footer><div class="custom-order-footer">
   <div class="bowl-total"><span>ราคารวมต่อชาม</span><strong class="font-number">฿{{ totalBowlPrice }}</strong></div>
   <div class="custom-order-footer-actions"><div class="bowl-quantity"><IconButton label="ลดจำนวนชาม" :disabled="qty<=1" @click="qty = Math.max(1, qty - 1)"><Minus :size="18" aria-hidden="true"/></IconButton><span class="font-number" aria-label="จำนวนชาม">{{ qty }}</span><IconButton label="เพิ่มจำนวนชาม" @click="qty += 1"><Plus :size="18" aria-hidden="true"/></IconButton></div><Button @click="addToCart"><ShoppingBag :size="18" aria-hidden="true"/>เพิ่มลงตะกร้า · ฿{{ totalBowlPrice * qty }}</Button></div>
  </div></template>
 </DialogFrame>
</template>

<script setup>
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import FormField from '@/components/ui/FormField.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Minus, Plus, Check, ShoppingBag } from 'lucide-vue-next'

const store = usePosStore()

const selectedAddons = ref([])
const qty = ref(1)
const itemNote = ref('')

const selectedMenu = computed(() => {
  const menuId = store.modals.customOrder.menuId
  return menuId ? store.menus.find(m => m.id === menuId) : null
})

const activeAddons = computed(() => store.addons.filter(a => a.isActive !== false))

watch(() => store.modals.customOrder.isOpen, (open) => {
  if (open) {
    selectedAddons.value = []
    qty.value = 1
    itemNote.value = ''
  }
})

function getAddonPrice(addon) {
  const platId = store.currentPlatformId
  return (addon.prices && addon.prices[platId] !== undefined) ? Number(addon.prices[platId]) : 0
}

function getMatUnit(matId) {
  const mat = store.matMap[matId]
  return mat ? mat.unit : 'ไม่ระบุหน่วย'
}

function isAddonOutOfStock(addon) {
  return (addon.recipe || []).some(row => {
    const mat = store.matMap[row.materialId]
    if (!mat || mat.isDeleted || mat.isArchived) return true
    return mat.stock < Number(row.qty) * qty.value
  })
}

function isAddonSelected(addonId) {
  return selectedAddons.value.some(a => a.id === addonId)
}

function toggleAddon(addon) {
  const idx = selectedAddons.value.findIndex(a => a.id === addon.id)
  if (idx >= 0) {
    selectedAddons.value.splice(idx, 1)
  } else {
    selectedAddons.value.push(addon)
  }
}

const basePrice = computed(() => Number(selectedMenu.value?.prices?.[store.currentPlatformId] || 0))
const totalBowlPrice = computed(() => {
  if (!selectedMenu.value) return 0
  const addonTotal = selectedAddons.value.reduce((sum, a) => sum + getAddonPrice(a), 0)
  return basePrice.value + addonTotal
})

function close() {
  store.modals.customOrder.isOpen = false
  store.modals.customOrder.menuId = null
}

async function requestClose() {
  if (selectedAddons.value.length > 0 || qty.value !== 1 || itemNote.value.trim()) {
    const ok = await store.confirmDialog({
      title: 'ยกเลิกชามที่ปรับแต่ง?',
      message: 'จำนวน ท็อปปิ้ง และหมายเหตุที่ปรับไว้จะไม่ถูกเพิ่มลงตะกร้า ต้องการปิดหรือไม่?',
      confirmText: 'ปิดหน้าต่าง',
      cancelText: 'เลือกต่อ',
      type: 'warning'
    })
    if (!ok) return
  }
  close()
}

function addToCart() {
  if (!selectedMenu.value) return
  const success = store.addToCart(selectedMenu.value, selectedAddons.value, qty.value, false, itemNote.value)
  if (success) {
    close()
  }
}
</script>
<style scoped>
.product-detail{display:grid;gap:20px;margin-bottom:28px}.product-visual{display:grid;place-items:center;height:160px;background:var(--bg-soft);border-radius:16px;font-size:72px}.product-detail .bowl-heading{display:block}.product-detail .bowl-heading h3{font-size:1.375rem}.product-base-price{display:block;margin-top:12px;font-size:1.375rem;color:var(--accent-brand)}.product-note{margin-top:28px;padding-top:24px;border-top:1px solid var(--border-subtle)}.product-note textarea{width:100%;padding:14px;border:0;border-radius:12px;resize:vertical;line-height:1.7;font-size:.875rem;min-height:96px}.product-note textarea::placeholder{color:var(--text-muted);opacity:1}.product-detail+.product-note{margin-top:0}
.bowl-heading{display:flex;gap:16px;align-items:center;min-width:0}.bowl-heading>div{min-width:0}.bowl-heading h3{font-size:1.125rem;font-weight:600;line-height:1.5;overflow-wrap:anywhere}.bowl-emoji{display:grid;place-items:center;width:64px;height:64px;flex-shrink:0;border-radius:16px;background:var(--bg-soft);font-size:34px}.bowl-heading p{font-size:.8125rem;color:var(--text-muted);margin-top:6px;line-height:1.7}
.bowl-options{display:grid;gap:20px}.bowl-options>header{display:flex;justify-content:space-between;align-items:center;gap:12px}.bowl-options h4{font-size:.9375rem;font-weight:600}.bowl-options header p,.bowl-options header>span{font-size:.75rem;color:var(--text-muted);margin-top:5px}.bowl-options header>span{flex-shrink:0}.bowl-no-addons{color:var(--text-muted);font-size:.8125rem;padding:24px 0}
.bowl-addon-grid{display:grid;grid-template-columns:1fr;gap:10px}.bowl-addon{display:grid;grid-template-columns:32px minmax(0,1fr) auto 24px;gap:8px;align-items:center;min-width:0;min-height:76px;padding:14px 12px;border:0;border-radius:12px;background:var(--bg-primary);color:var(--text-main);text-align:left;cursor:pointer}.bowl-addon-emoji{font-size:24px}.bowl-addon-name{min-width:0}.bowl-addon-name strong{display:block;font-size:.8125rem;font-weight:500;line-height:1.6;overflow-wrap:anywhere}.bowl-addon-name small{display:block;font-size:.75rem;color:var(--text-muted);line-height:1.6;margin-top:4px;overflow-wrap:anywhere}.bowl-addon-price{font-size:.8125rem;font-weight:600;white-space:nowrap}.bowl-addon-check{display:grid;place-items:center;width:24px;height:24px;border-radius:8px;background:var(--bg-card);color:var(--text-muted)}.bowl-addon.is-unavailable small{color:var(--state-warning)}.bowl-addon.is-selected{background:var(--accent-soft);color:var(--accent-brand)}.bowl-addon.is-selected .bowl-addon-check{background:var(--accent-brand);color:var(--bg-card)}
.custom-order-footer{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;width:100%;align-items:center}.bowl-total>span{display:block;font-size:.75rem;color:var(--text-muted);margin-bottom:4px}.bowl-total strong{font-size:1.5rem;color:var(--accent-brand)}.custom-order-footer-actions{display:contents}.custom-order-footer-actions>.ui-button{grid-column:1/-1;justify-content:center;width:100%;min-height:52px;font-size:.875rem}.bowl-quantity{display:flex;align-items:center;justify-self:end;border-radius:12px;background:var(--bg-card);gap:6px}.bowl-quantity>span{min-width:28px;text-align:center;font-weight:600}
@media(hover:hover){.bowl-addon:hover{background:var(--bg-soft)}.bowl-addon.is-selected:hover{background:var(--accent-soft)}}
@media(max-width:600px){.bowl-addon-grid{grid-template-columns:1fr}.bowl-addon{min-height:76px;padding:14px}.bowl-options>header{align-items:flex-start}.bowl-heading{gap:12px}.bowl-emoji{width:52px;height:52px;font-size:28px}}
</style>

