<template>
  <div class="space-y-6">
    <!-- Period Selector Header -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h3 class="text-sm font-bold text-stone-900">สรุปผลการดำเนินงาน</h3>
        <p class="text-xs text-stone-400">ข้อมูลยอดขาย กำไร และมูลค่าสต็อกวัตถุดิบ ณ ปัจจุบัน</p>
      </div>

      <div class="flex items-center gap-1.5 p-1 bg-stone-100 rounded-xl text-xs font-medium">
        <button
          v-for="p in periods"
          :key="p.id"
          @click="store.dashboardPeriod = p.id"
          :class="[
            'px-3 py-1.5 rounded-lg transition-all',
            store.dashboardPeriod === p.id
              ? 'bg-white text-stone-900 shadow-xs font-semibold'
              : 'text-stone-500 hover:text-stone-900'
          ]"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <!-- KPI Metric Cards (Sales & Profit) -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="editorial-card p-5 bg-white">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>ยอดขายรวม (Gross)</span>
          <span class="p-1.5 rounded-lg bg-stone-100 text-stone-600">฿</span>
        </div>
        <div class="text-2xl font-bold font-number text-stone-900">
          ฿{{ metrics.totalSales.toLocaleString() }}
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          {{ metrics.orderCount }} คำสั่งซื้อ (เฉลี่ย ฿{{ Math.round(metrics.avgOrderValue) }}/บิล)
        </div>
      </div>

      <div class="editorial-card p-5 bg-white">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>หักค่าธรรมเนียม GP</span>
          <span class="p-1.5 rounded-lg bg-amber-50 text-amber-700">🛵</span>
        </div>
        <div class="text-2xl font-bold font-number text-amber-800">
          -฿{{ Math.round(metrics.totalGp).toLocaleString() }}
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          คิดเป็น {{ metrics.totalSales > 0 ? Math.round((metrics.totalGp / metrics.totalSales) * 100) : 0 }}% ของยอดขาย
        </div>
      </div>

      <div class="editorial-card p-5 bg-white">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>ต้นทุนวัตถุดิบขาย (COGS)</span>
          <span class="p-1.5 rounded-lg bg-rose-50 text-rose-700">🥣</span>
        </div>
        <div class="text-2xl font-bold font-number text-rose-800">
          ฿{{ Math.round(metrics.totalFoodCost).toLocaleString() }}
        </div>
        <div class="text-[11px] text-stone-400 mt-1">
          Cost Ratio: {{ metrics.foodCostRatio.toFixed(1) }}% ของยอดขาย
        </div>
      </div>

      <div class="editorial-card p-5 bg-white border-l-4 border-l-emerald-600">
        <div class="flex items-center justify-between text-xs text-stone-400 mb-2">
          <span>กำไรขั้นต้นสุทธิ (Gross Profit)</span>
          <span class="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">📈</span>
        </div>
        <div class="text-2xl font-bold font-number text-emerald-800">
          ฿{{ Math.round(metrics.grossProfit).toLocaleString() }}
        </div>
        <div class="text-[11px] text-emerald-600 font-medium mt-1">
          Margin: {{ metrics.netRevenue > 0 ? ((metrics.grossProfit / metrics.netRevenue) * 100).toFixed(1) : 0 }}%
        </div>
      </div>
    </div>

    <!-- ========================================================================= -->
    <!-- USER REQUESTED: งบต้นทุนโดยรวมของวัตถุดิบและมูลค่าคลัง (RAW MATERIAL VALUATION)  -->
    <!-- ========================================================================= -->
    <div class="editorial-card p-6 bg-white space-y-5">
      <div class="flex items-center justify-between flex-wrap gap-3 border-b border-stone-100 pb-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="p-2 rounded-xl bg-amber-900/10 text-amber-900 text-lg">💰</span>
            <h3 class="text-base font-bold text-stone-900">งบต้นทุนโดยรวมของวัตถุดิบ & มูลค่าคลังสินค้า (Raw Material Valuation)</h3>
          </div>
          <p class="text-xs text-stone-400 mt-1">
            คำนวณจากยอดสต็อกคงเหลือ x ต้นทุนต่อหน่วยล่าสุด แยกหมวดหมู่เบสกรีกโยเกิร์ต ผลไม้ ท็อปปิ้ง และบรรจุภัณฑ์
          </p>
        </div>

        <div class="flex items-center gap-3">
          <div class="text-right">
            <span class="text-[11px] text-stone-400 block">มูลค่าสต็อกคงเหลือรวม</span>
            <span class="text-xl font-bold font-number text-amber-950">
              ฿{{ Math.round(store.totalInventoryValuation).toLocaleString() }}
            </span>
          </div>
          <button
            @click="store.switchTab('stock')"
            class="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            จัดการคลัง
          </button>
        </div>
      </div>

      <!-- Inventory Highlights Grid -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Card 1: Valuation breakdown -->
        <div class="p-4 rounded-xl bg-[#FAF9F6] border border-stone-100 space-y-3">
          <span class="text-xs font-bold text-stone-800 block">สัดส่วนมูลค่าตามหมวดหมู่</span>
          <div class="space-y-2 text-xs">
            <div v-if="store.inventoryValuationByCategory.length === 0" class="text-stone-400 py-3 text-center italic">
              ยังไม่มีข้อมูลวัตถุดิบในคลัง
            </div>
            <div
              v-for="cat in store.inventoryValuationByCategory"
              :key="cat.category"
              class="flex items-center justify-between"
            >
              <span class="text-stone-600 truncate">{{ cat.category }} ({{ cat.itemCount }} รายการ)</span>
              <span class="font-number font-semibold text-stone-900">฿{{ Math.round(cat.totalValue).toLocaleString() }}</span>
            </div>
          </div>
        </div>

        <!-- Card 2: Reorder budget needed -->
        <div class="p-4 rounded-xl bg-amber-50/60 border border-amber-200/50 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-amber-950">งบประมาณเติมสต็อกที่แนะนำ</span>
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 font-medium">Reorder Budget</span>
          </div>
          <div class="text-2xl font-bold font-number text-amber-950">
            ฿{{ Math.round(store.reorderBudgetNeeded).toLocaleString() }}
          </div>
          <p class="text-[11px] text-amber-800/80 leading-relaxed">
            งบประมาณที่ต้องเตรียมเพื่อสั่งซื้อวัตถุดิบและบรรจุภัณฑ์ที่ต่ำกว่าเกณฑ์ความปลอดภัยกลับมาที่ระดับปลอดภัย (Buffer x2)
          </p>
        </div>

        <!-- Card 3: Items alert status -->
        <div class="p-4 rounded-xl bg-stone-50 border border-stone-100 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-stone-800">สถานะสต็อกภาพรวม</span>
            <span class="text-[10px] text-stone-400 font-number">{{ store.activeMaterials.length }} รายการทั้งหมด</span>
          </div>
          <div class="space-y-1.5 text-xs">
            <div class="flex justify-between items-center text-stone-600">
              <span>วัตถุดิบพร้อมใช้งานปกติ:</span>
              <span class="font-bold text-emerald-700 font-number">
                {{ store.activeMaterials.length - store.lowStockMaterials.length }} รายการ
              </span>
            </div>
            <div class="flex justify-between items-center text-stone-600">
              <span>วัตถุดิบเตือนใกล้หมด:</span>
              <span class="font-bold text-amber-700 font-number">
                {{ store.lowStockMaterials.length }} รายการ
              </span>
            </div>
            <div class="flex justify-between items-center text-stone-600">
              <span>วัตถุดิบที่หมดสต็อกแล้ว:</span>
              <span class="font-bold text-rose-700 font-number">
                {{ store.outOfStockMaterials.length }} รายการ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Orders Table -->
    <div class="editorial-card overflow-hidden">
      <div class="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/40">
        <div>
          <h3 class="text-sm font-bold text-stone-900">ประวัติคำสั่งซื้อล่าสุด</h3>
          <p class="text-xs text-stone-400">รายการขาย ช่องทาง และกำไรสุทธิต่อบิล</p>
        </div>
        <span class="text-xs font-number text-stone-500 font-semibold">{{ store.filteredOrders.length }} บิล</span>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs text-stone-700">
          <thead class="bg-stone-50 text-stone-400 font-medium border-b border-stone-100">
            <tr>
              <th class="py-3 px-4">Order ID</th>
              <th class="py-3 px-4">เวลา</th>
              <th class="py-3 px-4">ช่องทาง</th>
              <th class="py-3 px-4">รายการ</th>
              <th class="py-3 px-4 text-right">ยอดชำระ</th>
              <th class="py-3 px-4 text-right">GP หัก</th>
              <th class="py-3 px-4 text-right">กำไรสุทธิ</th>
              <th class="py-3 px-4 text-center">ใบเสร็จ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-stone-100">
            <tr v-if="store.filteredOrders.length === 0">
              <td colspan="8" class="py-8 text-center text-stone-400 italic">
                ยังไม่มีข้อมูลคำสั่งซื้อในรอบเวลานี้
              </td>
            </tr>
            <tr
              v-for="order in store.filteredOrders.slice(0, 8)"
              :key="order.orderId"
              @click="viewReceipt(order)"
              class="hover:bg-stone-50/80 transition-colors cursor-pointer group"
            >
              <td class="py-3.5 px-4 font-mono font-semibold text-stone-900 group-hover:text-amber-900">{{ order.orderId }}</td>
              <td class="py-3.5 px-4 text-stone-400">{{ formatTime(order.createdAt) }}</td>
              <td class="py-3.5 px-4">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-800">
                  {{ order.platformName }}
                </span>
              </td>
              <td class="py-3.5 px-4">
                <div class="truncate max-w-xs text-stone-900 font-medium">
                  {{ order.items.map(i => `${i.qty}x ${i.menuName}`).join(', ') }}
                </div>
              </td>
              <td class="py-3.5 px-4 text-right font-number font-bold text-stone-900">
                ฿{{ order.subtotal }}
              </td>
              <td class="py-3.5 px-4 text-right font-number text-amber-800">
                {{ order.gpAmount > 0 ? `-฿${order.gpAmount}` : '-' }}
              </td>
              <td class="py-3.5 px-4 text-right font-number font-bold text-emerald-800">
                ฿{{ order.grossProfit }}
              </td>
              <td class="py-3.5 px-4 text-center" @click.stop>
                <button
                  type="button"
                  @click="viewReceipt(order)"
                  class="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium text-[11px] inline-flex items-center gap-1 transition-colors"
                  title="ดูใบเสร็จ"
                >
                  🧾 <span>บิล</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePosStore } from '@/stores/posStore'

const store = usePosStore()

const periods = [
  { id: 'today', label: 'วันนี้' },
  { id: 'week', label: '7 วันล่าสุด' },
  { id: 'month', label: '30 วันล่าสุด' },
  { id: 'all', label: 'ทั้งหมด' }
]

const metrics = computed(() => store.dashboardMetrics)

function formatTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

function viewReceipt(order) {
  store.modals.receipt = {
    isOpen: true,
    order
  }
}
</script>
