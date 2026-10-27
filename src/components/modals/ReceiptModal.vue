<template>
 <DialogFrame :open="store.modals.receipt.isOpen && Boolean(order)" id="ReceiptModal" title="ใบเสร็จรับเงิน" width="440px" :teleport="teleport" @request-close="close">

  <div class="receipt-paper" id="printable-receipt">
        <div class="text-center pb-4 border-b border-dashed border-stone-300">
          <div class="text-2xl mb-1">🥣</div>
          <div class="font-bold text-sm text-stone-900 font-sans tracking-wide">GREEK YOGG. CAFE</div>
          <div class="text-[10px] text-stone-500">Artisanal Greek Yogurt & Fruit Bar</div>
          <div class="text-[10px] text-stone-400 mt-1">ใบเสร็จรับเงินอย่างย่อ</div>
        </div>

        <div class="py-3 border-b border-dashed border-stone-300 space-y-1">
          <div class="flex justify-between">
            <span class="text-stone-400">Order ID:</span>
            <span class="font-bold">{{ order.orderId }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">วันที่-เวลา:</span>
            <span>{{ formattedDate }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-stone-400">ช่องทางขาย:</span>
            <span class="font-semibold">{{ order.platformName }}</span>
          </div>
          <div v-if="order.paymentMethod" class="flex justify-between">
            <span class="text-stone-400">ชำระโดย:</span>
            <span>{{ order.paymentMethod }}</span>
          </div>
          <div v-if="order.note" class="text-[10px] text-amber-800 bg-amber-50 p-1 rounded mt-1">
            Note: {{ order.note }}
          </div>
        </div>

        <!-- Items -->
        <div class="py-3 border-b border-dashed border-stone-300 space-y-2">
          <div v-for="(item, idx) in order.items" :key="idx" class="space-y-0.5">
            <div class="flex justify-between font-semibold text-stone-900">
              <span class="receipt-item-name">{{ item.qty }}x {{ item.menuName }}</span>
              <span class="font-number shrink-0">฿{{ item.totalPrice }}</span>
            </div>
            <!-- Addons -->
            <p v-if="item.note" class="receipt-item-note">หมายเหตุ: {{ item.note }}</p>
            <div v-if="item.selectedAddons && item.selectedAddons.length > 0" class="pl-3 text-[10px] text-stone-500 space-y-0.5">
              <div v-for="addon in item.selectedAddons" :key="`${addon.groupId || ''}:${addon.id}`" class="flex justify-between">
                <span>+ {{ addon.name }}{{ addon.selectionQty > 1 ? ' ×'+addon.selectionQty : '' }}{{ addon.groupName ? ' · '+addon.groupName : '' }}</span>
                <span class="font-number text-stone-400">{{ addon.price==null?'รวมในยอดสินค้า':`+฿${addon.price * (addon.selectionQty || 1)} (รวมในยอดแล้ว)` }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="order.packagePlan?.length" class="py-3 border-b border-dashed border-stone-300 space-y-1">
          <strong>Package ที่ใช้ในออเดอร์</strong>
          <div v-for="row in order.packagePlan" :key="row.materialId" class="flex justify-between gap-2"><span>{{ row.materialName }} {{ row.fulfilledQty }}/{{ row.requestedQty }} {{ row.unit }}<small v-if="row.adjustmentQty"> · ปรับ {{ row.adjustmentQty>0?'+':'' }}{{ row.adjustmentQty }} ({{ reasonLabel(row.reason) }})</small></span><span>฿{{ row.fulfilledCost }}</span></div>
        </div>
        <div v-if="order.stockShortages?.length" class="py-3 border-b border-dashed border-amber-300 text-amber-900">
          <strong>{{ order.stockShortages.some(x=>x.inventoryType==='packaging') ? 'วัตถุดิบ / บรรจุภัณฑ์ขาด' : 'วัตถุดิบขาดค้าง' }}</strong>
          <div v-for="shortage in order.stockShortages" :key="shortage.materialId">
            {{ shortage.materialName || shortage.materialId }}: {{ shortage.qty }} {{ shortage.unit }}
          </div>
        </div>
        <!-- Totals -->
        <div class="py-3 space-y-1">
          <div class="flex justify-between text-xs font-bold pt-1 border-t border-stone-900">
            <span>ยอดชำระสุทธิ (Total):</span>
            <span class="text-sm font-number">฿{{ order.subtotal }}</span>
          </div>
          <div class="flex justify-between text-[10px] text-stone-400 pt-1">
            <span>หักค่าธรรมเนียม GP ({{ orderGpPercent }}%):</span>
            <span class="font-number">-฿{{ order.gpAmount }}</span>
          </div>
          <div class="flex justify-between text-[10px] text-emerald-800 font-semibold">
            <span>รายรับสุทธิร้าน (Net):</span>
            <span class="font-number">฿{{ order.netRevenue }}</span>
          </div>
          <div class="mt-2 pt-2 border-t border-dashed border-stone-300 space-y-1 text-[10px] text-stone-500"><div class="flex justify-between"><span>ต้นทุนวัตถุดิบ</span><span>฿{{ order.ingredientCost ?? order.foodCost ?? 0 }}</span></div><div class="flex justify-between"><span>ต้นทุนบรรจุภัณฑ์ที่ใช้จริง</span><span>฿{{ order.packagingCost || 0 }}</span></div><div class="flex justify-between font-semibold text-stone-700"><span>ต้นทุนขายรวม</span><span>฿{{ order.foodCost || 0 }}</span></div><div v-if="order.expectedPackagingShortageCost" class="flex justify-between text-amber-800"><span>ต้นทุน Package ที่ขาด (ไม่รวมกำไร)</span><span>฿{{ order.expectedPackagingShortageCost }}</span></div></div>
        </div>

        <div class="text-center pt-4 border-t border-dashed border-stone-300 text-[10px] text-stone-400">
          <div>ขอบคุณที่อุดหนุนกรีกโยเกิร์ตแท้</div>
          <div class="text-[9px] mt-0.5">Have a Healthy & Blissful Day!</div>
        </div>
      </div>
  <template #footer><div class="receipt-actions">
        <button
          @click="close"
          class="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          เสร็จสิ้น
        </button>
        <button
          @click="printReceipt"
          class="px-5 py-2.5 text-xs font-semibold bg-brand-600 hover:bg-brand-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Printer class="w-4 h-4" />
          <span>พิมพ์ใบเสร็จ (Print)</span>
        </button>
      </div></template>
 </DialogFrame>
</template>

<script setup>
import DialogFrame from '@/components/ui/DialogFrame.vue'
import { computed } from 'vue'
import { usePosStore } from '@/stores/posStore'
import { Printer } from 'lucide-vue-next'

const props=defineProps({model:Object,teleport:Boolean})
const store = props.model || usePosStore()

const order = computed(() => store.modals.receipt.order)

const orderGpPercent = computed(() => {
  if (order.value?.gpPercent != null) return order.value.gpPercent
  if (!order.value || !order.value.gpAmount || !order.value.subtotal) return 0
  return Math.round((order.value.gpAmount / order.value.subtotal) * 10000) / 100
})

const formattedDate = computed(() => {
  if (!order.value?.createdAt) return ''
  return new Date(order.value.createdAt).toLocaleString('th-TH', {timeZone:'Asia/Bangkok'})
})
const reasonLabels={separate_bag:'แยกถุง',customer_declined:'ลูกค้าไม่รับ',combined_packaging:'รวมบรรจุภัณฑ์',package_unavailable:'Package ไม่มี',repacked:'เปลี่ยนบรรจุ',other:'อื่น ๆ'}
const reasonLabel=reason=>reasonLabels[reason]||reason||'-'

function close() {
  store.modals.receipt.isOpen = false
  store.modals.receipt.order = null
}

function printReceipt() {
  window.print()
}
</script>
<style scoped>
.receipt-item-note{font-size:.75rem;color:var(--text-muted);white-space:pre-wrap;overflow-wrap:anywhere}
.receipt-paper{font-family:inherit;font-size:.8125rem;line-height:1.8;color:var(--text-main);background:var(--bg-card)}.receipt-paper :deep(.text-\[10px\]),.receipt-paper :deep(.text-\[9px\]){font-size:.75rem}.receipt-paper :deep(.text-stone-400),.receipt-paper :deep(.text-stone-500){color:var(--text-muted)}.receipt-paper :deep(.flex.justify-between){gap:12px;overflow-wrap:anywhere}.receipt-paper :deep(.font-number){font-variant-numeric:tabular-nums;white-space:nowrap}.receipt-item-name{flex:1;min-width:0;overflow-wrap:anywhere}.receipt-actions{display:flex;justify-content:space-between;gap:12px;width:100%}.receipt-actions>button{min-height:48px;font-size:.8125rem;justify-content:center}.receipt-actions>button:last-child{flex:1}
@media print{.receipt-paper{font-size:12px;background:white}.receipt-paper :deep(.text-\[10px\]),.receipt-paper :deep(.text-\[9px\]){font-size:10px}}
</style>
