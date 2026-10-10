<template>
 <div class="dashboard">
  <header class="dashboard-toolbar">
   <div><h2>ภาพรวมร้าน</h2><p>ยอดขาย ต้นทุน และสิ่งที่ควรดูแลวันนี้</p></div>
   <div class="dashboard-date-controls"><div class="dashboard-segments" aria-label="ช่วงเวลารายงาน"><button v-for="p in periods" :key="p.id" type="button" :data-period="p.id" :aria-pressed="period===p.id" @click="selectPeriod(p.id)">{{ p.label }}</button></div><button ref="dateAnchor" type="button" data-dashboard-dates class="dashboard-date-button" aria-haspopup="dialog" :aria-expanded="datesOpen" @click="datesOpen=true"><CalendarDays :size="16" aria-hidden="true" />{{ rangeLabel }}<ChevronDown :size="14" aria-hidden="true" /></button></div>
  </header>
  <Teleport to="body"><FilterDropdown id="dashboard-date-filter" title="ช่วงเวลารายงาน" :open="datesOpen" :anchor="dateAnchor" :values="range" @close="datesOpen=false" @apply="applyRange" /></Teleport>
  <div class="dashboard-summary" aria-label="สรุปยอดขายในช่วงวันที่เลือก">
   <section class="dashboard-sales"><span>ยอดขายรวม</span><strong data-sales-total class="font-number">฿{{ money(metrics.totalSales) }}</strong><p>{{ metrics.orderCount }} บิล <span>เฉลี่ย ฿{{ money(metrics.avgOrderValue) }} / บิล</span></p></section>
   <dl class="dashboard-metrics"><div><dt>ค่าธรรมเนียมช่องทาง</dt><dd class="font-number">฿{{ money(metrics.totalGp) }}</dd><small>{{ percent(metrics.totalGp,metrics.totalSales) }}% ของยอดขาย</small></div><div><dt>ต้นทุนขาย</dt><dd class="font-number">฿{{ money(metrics.totalFoodCost) }}</dd><small>วัตถุดิบและบรรจุภัณฑ์</small></div><div><dt>กำไรขั้นต้น</dt><dd class="font-number" :class="{'is-negative':metrics.grossProfit<0}">฿{{ money(metrics.grossProfit) }}</dd><small>{{ money(metrics.margin) }}% ของรายรับหลัง GP</small></div></dl>
  </div>
  <p class="dashboard-accounting-note">กำไรขั้นต้นตามที่บันทึกในบิล ยังไม่หักค่าเช่า ค่าแรง และค่าใช้จ่ายอื่น</p>
  <nav class="dashboard-view-tabs" aria-label="มุมมองรายงาน"><button v-for="tab in views" :key="tab.id" type="button" :data-view="tab.id" :aria-pressed="view===tab.id" @click="view=tab.id"><component :is="tab.icon" :size="16" aria-hidden="true" />{{ tab.label }}</button></nav>

  <template v-if="view!=='inventory'">
   <section v-if="!report.orders.length" class="dashboard-empty"><ChartNoAxesCombined :size="32" aria-hidden="true"/><h3>ยังไม่มีคำสั่งซื้อในช่วงนี้</h3><p>ลองเลือกช่วงวันที่อื่น หรือเริ่มบันทึกการขายที่หน้าแคชเชียร์</p><button type="button" class="dashboard-primary" @click="store.switchTab('pos')">ไปหน้าแคชเชียร์</button></section>
   <template v-else>
    <section v-if="view==='overview'" class="dashboard-panel"><DashboardTrend :rows="report.trend" :bucket="report.bucket" /></section>
    <div v-if="view==='overview'" class="dashboard-two-columns"><section class="dashboard-panel"><DashboardBreakdown title="ยอดขายตามช่องทาง" subtitle="ช่องทางไหนสร้างยอดขายให้ร้าน" :rows="channelRows" allow-donut /></section><section class="dashboard-panel"><DashboardBreakdown title="เมนูขายดี" subtitle="5 อันดับตามจำนวนขาย ไม่รวม Add-on" :rows="menuRows.slice(0,5)" unit="ชิ้น" /><button type="button" class="dashboard-text-button" @click="view='menus'">ดูเมนูทั้งหมด<ArrowRight :size="14" aria-hidden="true"/></button></section></div>
    <template v-if="view==='channels'">
     <section class="dashboard-panel"><DashboardBreakdown title="สัดส่วนยอดขายตามช่องทาง" subtitle="สลับรูปแบบแท่งหรือวงแหวนเพื่อเปรียบเทียบ" :rows="channelRows" allow-donut /></section>
     <section class="dashboard-panel"><div class="dashboard-section-heading"><div><h3>ต้นทุนและกำไรแต่ละช่องทาง</h3><p>ใช้ค่าธรรมเนียมที่บันทึกไว้ในบิล</p></div></div><div class="dashboard-table-wrap"><table><thead><tr><th>ช่องทาง</th><th>บิล</th><th>ยอดขาย</th><th>GP</th><th>ต้นทุนขาย</th><th>กำไรขั้นต้น</th></tr></thead><tbody><tr v-for="channel in report.channels" :key="channel.id"><th>{{ channel.label }}</th><td>{{ channel.orderCount }}</td><td>฿{{ money(channel.totalSales) }}</td><td>฿{{ money(channel.totalGp) }}</td><td>฿{{ money(channel.totalFoodCost) }}</td><td>฿{{ money(channel.grossProfit) }}</td></tr></tbody></table></div></section>
    </template>
    <template v-if="view==='menus'"><section class="dashboard-panel"><DashboardBreakdown title="อันดับเมนูขายดี" subtitle="จำนวนเมนูที่ขายได้ในช่วงวันที่เลือก ไม่รวม Add-on" :rows="menuRows" unit="ชิ้น" /></section></template>
   </template>
   <section class="dashboard-panel dashboard-orders"><div class="dashboard-section-heading"><div><h3>รายการขายในช่วงนี้</h3><p>{{ report.orders.length }} บิล · เรียงจากล่าสุด</p></div><span v-if="report.orders.length">{{ orderOffset+1 }}–{{ Math.min(orderOffset+8,report.orders.length) }}</span></div><p v-if="!report.orders.length" class="dashboard-empty-small">ยังไม่มีรายการขาย</p><div v-else class="dashboard-table-wrap"><table><thead><tr><th>บิล / วันเวลา</th><th>ช่องทาง / รายการ</th><th>ยอดขาย</th><th>กำไรขั้นต้น</th><th>ใบเสร็จ</th></tr></thead><tbody><tr v-for="order in report.orders.slice(orderOffset,orderOffset+8)" :key="order.orderId"><td><strong>{{ order.orderId }}</strong><small>{{ orderDate(order.createdAt) }}</small></td><td><strong>{{ order.platformName || 'ไม่ระบุช่องทาง' }}</strong><small>{{ (order.items || []).map(i=>`${i.qty} × ${i.menuName}`).join(', ') }}</small><small v-if="order.stockShortages?.length" class="dashboard-shortage">วัตถุดิบขาดค้าง — ดูรายละเอียดในบิล</small></td><td>฿{{ money(order.subtotal) }}</td><td :class="{'is-negative':order.grossProfit<0}">฿{{ money(order.grossProfit) }}</td><td><button type="button" :data-receipt="order.orderId" class="dashboard-receipt" :aria-label="`ดูใบเสร็จ ${order.orderId}`" @click="viewReceipt(order)"><ReceiptText :size="15" aria-hidden="true" />ดูบิล</button></td></tr></tbody></table></div><div v-if="report.orders.length>8" class="dashboard-pagination"><button type="button" :disabled="orderOffset===0" @click="orderOffset-=8">ก่อนหน้า</button><button type="button" :disabled="orderOffset+8>=report.orders.length" @click="orderOffset+=8">ถัดไป</button></div></section>
  </template>
  <template v-else>
   <section class="dashboard-inventory-heading"><div><h3>คลังวัตถุดิบ · ยอดปัจจุบัน</h3><p>มูลค่าคงเหลือตามต้นทุนล่าสุด ไม่เปลี่ยนตามช่วงวันที่รายงานยอดขาย</p></div><button type="button" class="dashboard-primary" @click="store.switchTab('stock')">จัดการคลัง<ArrowRight :size="15" aria-hidden="true" /></button></section>
   <div class="dashboard-inventory-stats"><section><span>มูลค่าคลัง</span><strong class="font-number">฿{{ money(store.totalInventoryValuation) }}</strong><p v-if="store.draftInventoryValuationDiff">หลังยืนยันแบบร่าง ≈ ฿{{ money(store.projectedInventoryValuation) }}</p><p v-else>{{ store.activeMaterials.length }} รายการที่ใช้งาน</p></section><section><span>งบเติมสต็อกแนะนำ</span><strong class="font-number">฿{{ money(store.reorderBudgetNeeded) }}</strong><p>เติมรายการต่ำกว่าเกณฑ์ให้ถึง 2 เท่าของขั้นต่ำ</p></section><section><span>ควรตรวจสอบ</span><strong class="font-number">{{ store.lowStockMaterials.length }} <small>รายการ</small></strong><p>ในจำนวนนี้หมดสต็อก {{ store.outOfStockMaterials.length }} รายการ</p></section></div>
   <section class="dashboard-panel"><DashboardBreakdown title="มูลค่าคลังตามหมวดหมู่" :subtitle="store.stockDraftSnapshot ? 'กราฟรวมแบบร่างที่ยังไม่ยืนยัน' : 'ยอดคงเหลือ × ต้นทุนต่อหน่วยล่าสุด'" :rows="inventoryRows" allow-donut /></section>
  </template>
 </div>
</template>
<script setup>
import {computed,ref,watch,onMounted,onActivated,onUnmounted} from 'vue'
import {CalendarDays,ChevronDown,ChartNoAxesCombined,Store,Utensils,Package,ArrowRight,ReceiptText} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import {buildDashboard,dashboardRange,money,dateLabel} from '@/domain/dashboard'
import {businessDateKey} from '@/domain/businessDate'
import FilterDropdown from '@/components/ui/FilterDropdown.vue'
import DashboardTrend from '@/components/dashboard/DashboardTrend.vue'
import DashboardBreakdown from '@/components/dashboard/DashboardBreakdown.vue'
import '@/assets/dashboard.css'
const store=usePosStore()
const period=ref(store.dashboardPeriod || 'today'),range=ref(dashboardRange(period.value)),view=ref('overview'),datesOpen=ref(false),dateAnchor=ref(null),orderOffset=ref(0)
let lastDay=businessDateKey(),dayTimer
function refreshDay(){
 const today=businessDateKey()
 if(today===lastDay) return
 lastDay=today
 if(period.value!=='custom') range.value=dashboardRange(period.value,today)
}
onMounted(()=>{dayTimer=setInterval(refreshDay,30000)})
onActivated(refreshDay)
onUnmounted(()=>clearInterval(dayTimer))
const periods=[{id:'today',label:'วันนี้'},{id:'week',label:'7 วัน'},{id:'month',label:'30 วัน'},{id:'all',label:'ทั้งหมด'}]
const views=[{id:'overview',label:'ภาพรวม',icon:ChartNoAxesCombined},{id:'channels',label:'ช่องทางขาย',icon:Store},{id:'menus',label:'เมนูขายดี',icon:Utensils},{id:'inventory',label:'คลังวัตถุดิบ',icon:Package}]
const report=computed(()=>buildDashboard(store.orders,range.value)),metrics=computed(()=>report.value.metrics)
const rangeLabel=computed(()=>!range.value.start?'ทุกช่วงเวลา':range.value.start===range.value.end?dateLabel(range.value.start):`${dateLabel(range.value.start)} – ${dateLabel(range.value.end)}`)
const channelRows=computed(()=>report.value.channels.map(c=>({id:c.id,label:c.label,value:c.totalSales})))
const menuRows=computed(()=>report.value.menus.map(m=>({id:m.id,label:m.label,value:m.qty})))
const inventoryRows=computed(()=>store.inventoryValuationByCategory.map(c=>({id:c.category,label:`${c.category} (${c.itemCount})`,value:c.totalValue})))
watch(report,()=>{orderOffset.value=0})
function selectPeriod(id){period.value=id;store.dashboardPeriod=id;range.value=dashboardRange(id)}
function applyRange(value){range.value={start:value.start,end:value.end || value.start};period.value='custom';datesOpen.value=false}
const percent=(part,total)=>total?(part/total*100).toFixed(1):'0'
const orderDate=iso=>new Intl.DateTimeFormat('th-TH',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(iso))
function viewReceipt(order){store.modals.receipt={isOpen:true,order}}
</script>
