<template>
  <div
    v-if="store.modals.receipt.isOpen && order"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-xs"
  >
    <div class="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
      <!-- Modal Header -->
      <div class="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
        <div class="flex items-center gap-2">
          <span class="text-xl">🧾</span>
          <span class="text-xs font-bold text-stone-900">ใบเสร็จรับเงิน (สำเร็จ)</span>
        </div>
        <button @click="close" class="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg">
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Thermal Receipt Preview (80mm) -->
      <div class="p-6 overflow-y-auto flex-1 font-mono text-[11px] leading-relaxed text-stone-800 bg-[#FCFBF9]" id="printable-receipt">
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
          <div class="flex justify-between">
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
              <span class="flex-1 truncate">{{ item.qty }}x {{ item.menuName }}</span>
              <span class="font-number shrink-0">฿{{ item.totalPrice }}</span>
            </div>
            <!-- Addons -->
            <div v-if="item.selectedAddons && item.selectedAddons.length > 0" class="pl-3 text-[10px] text-stone-500 space-y-0.5">
              <div v-for="addon in item.selectedAddons" :key="addon.id" class="flex justify-between">
                <span>+ {{ addon.name }}</span>
                <span class="font-number text-stone-400">+฿{{ addon.price }} (รวมในยอดแล้ว)</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Totals -->
        <div class="py-3 space-y-1">
          <div class="flex justify-between text-xs font-bold pt-1 border-t border-stone-900">
            <span>ยอดชำระสุทธิ (Total):</span>
            <span class="text-sm font-number">฿{{ order.subtotal }}</span>
          </div>
          <div v-if="order.gpAmount > 0" class="flex justify-between text-[10px] text-stone-400 pt-1">
            <span>หักค่าธรรมเนียม GP ({{ orderGpPercent }}%):</span>
            <span class="font-number">-฿{{ order.gpAmount }}</span>
          </div>
          <div v-if="order.gpAmount > 0" class="flex justify-between text-[10px] text-emerald-800 font-semibold">
            <span>รายรับสุทธิร้าน (Net):</span>
            <span class="font-number">฿{{ order.netRevenue }}</span>
          </div>
        </div>

        <div class="text-center pt-4 border-t border-dashed border-stone-300 text-[10px] text-stone-400">
          <div>ขอบคุณที่อุดหนุนกรีกโยเกิร์ตแท้</div>
          <div class="text-[9px] mt-0.5">Have a Healthy & Blissful Day!</div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="p-4 bg-white border-t border-stone-100 flex items-center justify-between gap-2">
        <button
          @click="close"
          class="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100 transition-colors"
        >
          เสร็จสิ้น
        </button>
        <button
          @click="printReceipt"
          class="px-5 py-2.5 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl shadow-xs transition-all flex items-center gap-1.5"
        >
          <Printer class="w-4 h-4" />
          <span>พิมพ์ใบเสร็จ (Print)</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { usePosStore } from '@/stores/posStore'
import confetti from 'canvas-confetti'
import { X, Printer } from 'lucide-vue-next'

const store = usePosStore()

const order = computed(() => store.modals.receipt.order)

const orderGpPercent = computed(() => {
  if (!order.value || !order.value.gpAmount || !order.value.subtotal) return 0
  const plat = store.platforms.find(p => p.id === order.value.platformId)
  if (plat && plat.gpPercent !== undefined) return plat.gpPercent
  return Math.round((order.value.gpAmount / order.value.subtotal) * 100)
})

const formattedDate = computed(() => {
  if (!order.value?.createdAt) return ''
  return new Date(order.value.createdAt).toLocaleString('th-TH')
})

watch(() => store.modals.receipt.isOpen, (open) => {
  if (open) {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 }
      })
    } catch {
      // Ignored if confetti fails
    }
  }
})

function close() {
  store.modals.receipt.isOpen = false
  store.modals.receipt.order = null
}

function printReceipt() {
  window.print()
}
</script>
