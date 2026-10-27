<template>
 <div>
  <p v-if="loading" class="loading-copy" role="status">กำลังโหลดรายงานจาก Firebase…</p>
  <p v-else-if="!ready" class="connection-warning" role="status">เชื่อมต่อเซิร์ฟเวอร์เพื่อยืนยันยอดรายงานล่าสุด</p>
  <div v-else-if="error" class="error" role="alert"><p>{{ error }}</p><Button data-report-retry variant="secondary" @click="load">โหลดรายงานอีกครั้ง</Button></div>
  <DashboardView :report-ready="ready&&loaded&&!loading&&!error" :model="model" @range-change="setRange"/>
 </div>
</template>
<script setup>
import {ref,reactive,watch,onUnmounted} from 'vue'
import DashboardView from '@/views/DashboardView.vue'
import Button from '@/components/ui/Button.vue'
import {dashboardRange} from '@/domain/dashboard.js'
import {getMaterialKindLabel} from '@/domain/materialClassification.js'
import {projectMaterial} from './productPresentation.js'
import {projectReportOrders} from './reportProjection.js'
const props=defineProps({active:Boolean,ready:Boolean,revision:Number,refreshKey:Number,data:{type:Object,required:true},service:{type:Object,required:true},modals:{type:Object,required:true},inventoryModel:Object})
const emit=defineEmits(['navigate'])
const range=ref(dashboardRange('today')),loading=ref(false),loaded=ref(false),error=ref('')
let epoch=0,disposed=false
const model=reactive({dashboardPeriod:'today',orders:[],modals:props.modals,switchTab:id=>emit('navigate',id),
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
