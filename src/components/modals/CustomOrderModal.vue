<template>
 <DialogFrame :open="store.modals.customOrder.isOpen && Boolean(selectedMenu)" id="CustomOrderModal" title="รายละเอียดสินค้า" presentation="drawer" width="520px" :teleport="false" @request-close="requestClose">
  <div class="product-detail"><div class="product-visual" aria-hidden="true"><EntityImage kind="menus" :entity-id="selectedMenu.id" :image="selectedMenu.image" :emoji="selectedMenu.emoji"/></div><div class="bowl-heading"><h3>{{ selectedMenu.name }}</h3><p>{{ selectedMenu.description }}</p><strong class="product-base-price font-number">฿{{ basePrice }}</strong></div></div>
  <div v-if="groups.length" class="bowl-groups">
   <section v-for="group in groups" :key="group.id" class="bowl-options" :aria-label="group.name">
    <header><div><h4>{{ group.name }}</h4><p>{{ groupRule(group) }} · {{ group.pricingMode === 'included' ? 'รวมในราคาเมนู' : 'คิดเงินเพิ่ม' }}</p></div><span aria-live="polite">{{ groupCount(group.id) }}/{{ group.maxSelections }} {{ group.allowRepeat ? 'ที่' : 'ชนิด' }}</span></header>
    <div class="bowl-addon-grid">
     <div v-for="addon in groupOptions(group)" :key="addon.id" class="bowl-group-option">
      <button type="button" class="bowl-addon" :data-group-option="group.id" :class="{'is-selected':isGroupSelected(group.id,addon.id),'is-unavailable':addon.availability !== 'ready'}" :aria-pressed="isGroupSelected(group.id,addon.id)" :disabled="!isGroupSelected(group.id,addon.id) && (groupCount(group.id)>=group.maxSelections || ['paused','out'].includes(addon.availability))" @click="toggleGroupAddon(group,addon)">
       <span class="bowl-addon-emoji" aria-hidden="true"><EntityImage kind="addons" :entity-id="addon.id" :image="addon.image" :emoji="addon.emoji"/></span><span class="bowl-addon-name"><strong>{{ addon.name }}</strong><small v-if="addon.availability !== 'ready'">{{ optionAvailabilityLabel[addon.availability] }}</small></span><span class="bowl-addon-price font-number">{{ getAddonPrice(addon) === 0 ? 'รวมในราคา' : '+฿'+getAddonPrice(addon) }}</span><span class="bowl-addon-check" aria-hidden="true"><Check v-if="isGroupSelected(group.id,addon.id)" :size="15"/><Plus v-else :size="15"/></span>
      </button>
      <div v-if="group.allowRepeat && isGroupSelected(group.id,addon.id)" class="bowl-option-quantity"><span>จำนวน {{ addon.name }}</span><IconButton :label="`ลด ${group.name} ${addon.name}`" @click="adjustGroupQty(group,addon,-1)"><Minus :size="16" aria-hidden="true"/></IconButton><span class="font-number">{{ groupSelection(group.id,addon.id)?.selectionQty }}</span><IconButton :label="`เพิ่ม ${group.name} ${addon.name}`" :disabled="groupCount(group.id)>=group.maxSelections" @click="adjustGroupQty(group,addon,1)"><Plus :size="16" aria-hidden="true"/></IconButton></div>
     </div>
    </div>
    <p v-if="!groupOptions(group).length" class="bowl-no-addons">ยังไม่มีตัวเลือกที่เปิดขาย กรุณาตรวจรายการตัวเลือกเสริม</p>
    <p v-else-if="groupCount(group.id)>=group.maxSelections" class="bowl-group-hint">เลือกครบจำนวนสูงสุดแล้ว ยกเลิกตัวเลือกเดิมเพื่อเปลี่ยนได้</p>
   </section>
   <p v-if="!selectionCheck.ok" class="bowl-group-hint" role="status">{{ selectionCheck.message }}</p>
  </div>
  <details class="selection-financial"><summary>ต้นทุนและกำไรจากตัวเลือกจริง · {{ qty }} ชาม</summary><p>ใช้สูตรที่เลือกและต้นทุนวัตถุดิบปัจจุบัน รวมบรรจุภัณฑ์ตามสูตร ยอดในตะกร้าอาจเปลี่ยนเมื่อปรับ Package</p><dl><div><dt>รายรับหลังหัก GP</dt><dd>{{ financialMoney(selectionFinancial.netRevenue) }}</dd></div><div data-pos-selection-cost><dt>ต้นทุนตามรายการที่เลือก</dt><dd>{{ financialMoney(selectionFinancial.cost) }}</dd></div><div data-pos-selection-profit><dt>กำไรขั้นต้นหลังหัก GP</dt><dd>{{ financialMoney(selectionFinancial.profit) }}</dd></div></dl><p v-if="!selectionCheck.ok">เลือกตัวเลือกให้ครบก่อน ยอดนี้ยังไม่ใช่รายการที่พร้อมขาย</p></details>
  <FormField id="product-item-note" label="หมายเหตุรายการนี้" hint="หมายเหตุนี้ใช้กับจำนวนที่เลือกในรายการนี้" class="product-note" v-slot="{controlId,describedBy}"><textarea :id="controlId" v-model="itemNote" :aria-describedby="describedBy" aria-label="หมายเหตุรายการนี้" rows="3" placeholder="เช่น ไม่ใส่น้ำผึ้ง แยกท็อปปิ้ง หรือไม่รับช้อน"/></FormField>
  <template #footer><div class="custom-order-footer">
   <div class="bowl-total"><span>ราคารวมต่อชาม</span><strong class="font-number">฿{{ totalBowlPrice }}</strong></div>
   <div class="custom-order-footer-actions"><div class="bowl-quantity"><IconButton label="ลดจำนวนชาม" :disabled="qty<=1" @click="qty = Math.max(1, qty - 1)"><Minus :size="18" aria-hidden="true"/></IconButton><span class="font-number" aria-label="จำนวนชาม">{{ qty }}</span><IconButton label="เพิ่มจำนวนชาม" @click="qty += 1"><Plus :size="18" aria-hidden="true"/></IconButton></div><Button :disabled="!selectionCheck.ok" @click="addToCart"><ShoppingBag :size="18" aria-hidden="true"/>เพิ่มลงตะกร้า · ฿{{ totalBowlPrice * qty }}</Button></div>
  </div></template>
 </DialogFrame>
</template>

<script setup>
import EntityImage from '@/components/images/EntityImage.vue'
import { selectedItemCosts } from '@/domain/menuCosts'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import FormField from '@/components/ui/FormField.vue'
import { ref, computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Minus, Plus, Check, ShoppingBag } from 'lucide-vue-next'
import { menuGroups, optionPrices, resolveSelections, selectionPrice, optionAvailability, optionAvailabilityLabel } from '@/domain/addonGroups'

const store = usePosStore()

const selectedAddons = ref([])
const qty = ref(1)
const itemNote = ref('')

const selectedMenu = computed(() => {
  const menuId = store.modals.customOrder.menuId
  return menuId ? store.menus.find(m => m.id === menuId) : null
})

const activeAddons = computed(() => store.addons.filter(a => a.isActive !== false))
const groups = computed(() => menuGroups(selectedMenu.value, store.addonGroups))
const selectionCheck = computed(() => selectedMenu.value ? resolveSelections(selectedMenu.value, selectedAddons.value, store.addonGroups, store.addons, store.materials, qty.value) : { ok: false })
const groupSelection = (groupId, addonId) => selectedAddons.value.find(a => a.groupId === groupId && a.id === addonId)
const isGroupSelected = (groupId, addonId) => Boolean(groupSelection(groupId, addonId))
const groupCount = groupId => selectedAddons.value.filter(a => a.groupId === groupId).reduce((sum, a) => sum + a.selectionQty, 0)
function groupOptions(group) {
  return group.options.flatMap(option => {
    const addon = activeAddons.value.find(a => a.id === option.addonId)
    return addon ? [{ ...addon, prices: optionPrices(group, option, addon), availability: optionAvailability(group, option, addon, store.materials, qty.value) }] : []
  })
}
function groupRule(group) {
  const unit = group.allowRepeat ? 'ที่' : 'ชนิด'
  if (group.minSelections === group.maxSelections) return `เลือกให้ครบ ${group.maxSelections} ${unit}`
  return group.minSelections === 0 ? `ไม่บังคับ · เลือกได้สูงสุด ${group.maxSelections} ${unit}` : `เลือก ${group.minSelections}–${group.maxSelections} ${unit}`
}
function toggleGroupAddon(group, addon) {
  const index = selectedAddons.value.findIndex(a => a.groupId === group.id && a.id === addon.id)
  if (index >= 0) selectedAddons.value.splice(index, 1)
  else if (groupCount(group.id) < group.maxSelections) selectedAddons.value.push({ ...addon, groupId: group.id, selectionQty: 1 })
}
function adjustGroupQty(group, addon, delta) {
  const selection = groupSelection(group.id, addon.id)
  if (!selection || (delta > 0 && groupCount(group.id) >= group.maxSelections)) return
  if (selection.selectionQty + delta <= 0) toggleGroupAddon(group, addon)
  else selection.selectionQty += delta
}

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

const financialMoney = value => value === null ? 'ยังคำนวณไม่ได้' : `${value < 0 ? '-' : ''}฿${Math.abs(value).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2})}`
const selectionFinancial = computed(() => selectedItemCosts(selectedMenu.value || {}, selectedAddons.value.map(a => ({...a,prices:a.groupId ? store.selectionPrices(a) : a.prices})), qty.value, store.stockDraftSnapshot || store.materials, store.currentPlatform))
const basePrice = computed(() => Number(selectedMenu.value?.prices?.[store.currentPlatformId] || 0))
const totalBowlPrice = computed(() => {
  if (!selectedMenu.value) return 0
  const addonTotal = selectedAddons.value.reduce((sum, a) => sum + selectionPrice({ ...a, prices: a.groupId ? store.selectionPrices(a) : a.prices }, store.currentPlatformId), 0)
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
<style scoped src="@/components/pos/productSelection.css"></style>

