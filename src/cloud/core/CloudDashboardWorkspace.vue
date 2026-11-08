<template>
 <div>
  <p v-if="loading" class="loading-copy" role="status">กำลังโหลดรายงานจาก Firebase…</p>
  <p v-else-if="!ready" class="connection-warning" role="status">เชื่อมต่อเซิร์ฟเวอร์เพื่อยืนยันยอดรายงานล่าสุด</p>
  <div v-else-if="error" class="error" role="alert"><p>{{ error }}</p><Button data-report-retry variant="secondary" @click="load">โหลดรายงานอีกครั้ง</Button></div>
  <DashboardView :report-ready="ready&&loaded&&!loading&&!error" :model="model" @range-change="setRange"/>
  <section v-if="ready&&bookings.orders.length" class="dashboard-preorders" aria-labelledby="dashboard-preorders-title">
   <header>
    <div><h3 id="dashboard-preorders-title">Pre-order รอดำเนินการ</h3><p>{{ bookings.orders.length }} ออเดอร์ · ยอดจอง ฿{{ money(bookings.subtotalCents/100) }}</p></div>
    <Button v-if="!readOnly" variant="secondary" size="compact" @click="emit('navigate','order-entry')">เปิดบันทึกออเดอร์</Button>
   </header>
   <ul><li v-for="row in pickupDays" :key="row.day"><span>{{ row.day }}</span><span>{{ row.count }} ออเดอร์</span><strong>฿{{ money(row.quote/100) }}</strong></li></ul>
  </section>
 </div>
</template>
<script setup>
import {computed,ref,reactive,watch,onUnmounted} from 'vue'
import DashboardView from '@/views/DashboardView.vue'
import Button from '@/components/ui/Button.vue'
import {dashboardRange,money} from '@/domain/dashboard.js'
import {getMaterialKindLabel} from '@/domain/materialClassification.js'
import {projectMaterial} from './productPresentation.js'
import {projectReportOrders} from './reportProjection.js'
import {dayKey,scheduledSummary} from './orderEntry.js'
const props=defineProps({readOnly:Boolean,active:Boolean,ready:Boolean,revision:Number,refreshKey:Number,data:{type:Object,required:true},service:{type:Object,required:true},modals:{type:Object,required:true},inventoryModel:Object})
const emit=defineEmits(['navigate'])
const range=ref(dashboardRange('today')),loading=ref(false),loaded=ref(false),error=ref('')
const bookings=computed(()=>scheduledSummary(props.data.shop?.preorders))
const pickupDays=computed(()=>{
 const days=new Map()
 for(const booking of bookings.value.orders){
  const day=dayKey(booking.pickupDay),row=days.get(day)||{day,count:0,quote:0}
  row.count++;row.quote+=booking.quoteCents;days.set(day,row)
 }
 return [...days.values()]
})
let epoch=0,disposed=false
const model=reactive({get readOnly(){return props.readOnly},dashboardPeriod:'today',orders:[],modals:props.modals,switchTab:id=>emit('navigate',id),
 get activeMaterials(){return props.inventoryModel?.activeMaterials||props.data.materials.map(projectMaterial).filter(m=>!m.isDeleted)},
 get totalInventoryValuation(){return props.inventoryModel?.totalInventoryValuation??this.activeMaterials.reduce((n,m)=>n+Math.max(0,m.stock)*(m.unitCost||0),0)},
 get projectedInventoryValuation(){return props.inventoryModel?.projectedInventoryValuation??this.totalInventoryValuation},
 get draftInventoryValuationDiff(){return props.inventoryModel?.draftInventoryValuationDiff||0},
 get stockDraftSnapshot(){return props.inventoryModel?.hasStockDrafts?props.inventoryModel.stockDraftSnapshot:null},
 get lowStockMaterials(){return this.activeMaterials.filter(m=>m.stock<=m.minAlert)},get outOfStockMaterials(){return this.activeMaterials.filter(m=>m.stock<=0)},
 get reorderBudgetNeeded(){return props.inventoryModel?.reorderBudgetNeeded??this.activeMaterials.reduce((n,m)=>n+Math.max(0,2*(m.minAlert||0)-m.stock)*(m.unitCost||0),0)},
 get inventoryValuationByCategory(){const rows=new Map();for(const m of this.activeMaterials){const category=getMaterialKindLabel(m),r=rows.get(category)||{category,itemCount:0,totalValue:0};r.itemCount++;r.totalValue+=Math.max(0,m.stock)*(m.unitCost||0);rows.set(category,r)}return [...rows.values()].sort((a,b)=>b.totalValue-a.totalValue)}
})
function setRange(value){if(JSON.stringify(range.value)!==JSON.stringify(value))range.value={...value}}
function message(e){
 if(e.code==='REPORT_TOO_LARGE')return 'รายงานช่วงนี้มีข้อมูลมากเกินขอบเขต กรุณาเลือกช่วงวันที่สั้นลง'
 if(e.code==='REPORT_HISTORY_TOO_LARGE')return 'ประวัติเดิมมีข้อมูลเกินขอบเขต จึงยังแสดงยอดรวมครบไม่ได้'
 if(e.code==='REPORT_BUSY')return 'ข้อมูลร้านเปลี่ยนระหว่างอ่านรายงาน กรุณาโหลดรายงานอีกครั้ง'
 if(['REPORT_INCOMPLETE_HISTORY','REPORT_INVALID_DATA'].includes(e.code))return 'ข้อมูลบิลหรือประวัติยังไม่ครบ จึงยังแสดงยอดรวมไม่ได้ กรุณาตรวจข้อมูลก่อนโหลดใหม่'
 return 'โหลดรายงานจาก Firebase ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'
}
async function load(){
 const token=++epoch
 if(!props.active||!props.ready){loading.value=false;return}
 loading.value=true;error.value=''
 try{const result=await props.service.report({...range.value});if(disposed||token!==epoch)return;model.orders=projectReportOrders(result,props.data);loaded.value=true}
 catch(e){if(!disposed&&token===epoch){error.value=message(e);loaded.value=false}}
 finally{if(!disposed&&token===epoch)loading.value=false}
}
watch([()=>props.active,()=>props.ready,()=>props.revision,()=>props.refreshKey,()=>JSON.stringify(range.value)],load,{immediate:true})
onUnmounted(()=>{disposed=true;epoch++})
</script>
<style scoped>
.dashboard-preorders{display:grid;gap:12px;margin-block:16px;padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:12px;font-size:.875rem}
.dashboard-preorders header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.dashboard-preorders h3{font-weight:650}.dashboard-preorders p,.dashboard-preorders li>span:nth-child(2){color:var(--text-muted)}
.dashboard-preorders li{display:grid;grid-template-columns:1fr auto auto;gap:12px;padding:6px 0;border-top:1px solid var(--border-subtle)}
.dashboard-preorders li strong{font-variant-numeric:tabular-nums}
</style>
