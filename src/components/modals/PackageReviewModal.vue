<template>
 <DialogFrame :open="store.modals.packageReview.isOpen" id="PackageReviewModal" title="ตรวจและปรับ Package" description="ค่าเริ่มต้นมาจากสูตรเมนูและ Add-on การแก้ไขมีผลเฉพาะออเดอร์นี้" presentation="sheet" :teleport="false" initial-focus="#package-add" @request-close="close">
  <div class="package-review">
   <div class="package-add"><label for="package-add">เพิ่มบรรจุภัณฑ์</label><select id="package-add" v-model="addId" aria-label="เพิ่มบรรจุภัณฑ์"><option value="">เลือก Package</option><option v-for="item in addable" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option></select><Button variant="secondary" size="compact" :disabled="!addId" @click="addPackage">เพิ่ม</Button></div>
   <p v-if="!rows.length" class="package-empty">ออเดอร์นี้ยังไม่มี Package</p>
   <article v-for="row in rows" :key="row.materialId" class="package-row">
    <header><div><strong>{{ row.materialName }}</strong><small>จากสูตร {{ row.baselineQty }} {{ row.unit }} · ปรับ {{ signed(row.adjustmentQty) }} · ใช้ {{ row.requestedQty }} {{ row.unit }}</small></div><Button v-if="hasAdjustment(row.materialId)" variant="quiet" size="compact" :data-reset-package="row.materialId" @click="reset(row.materialId)">คืนค่า</Button></header>
    <p v-if="row.sources.length" class="package-sources">ที่มา: {{ row.sources.map(source=>`${source.sourceName} ${source.qty}`).join(', ') }}</p>
    <div class="package-fields"><label>จำนวน<input v-model.number="drafts[row.materialId].requestedQty" type="number" min="0" step="any" :aria-label="`จำนวน${row.materialName}`"></label><label>เหตุผล<select v-model="drafts[row.materialId].reason" :aria-label="`เหตุผล${row.materialName}`"><option value="">เลือกเหตุผล</option><option v-for="reason in reasons" :key="reason.value" :value="reason.value">{{ reason.label }}</option></select></label><label v-if="drafts[row.materialId].reason==='other'">หมายเหตุ<input v-model="drafts[row.materialId].note" :aria-label="`หมายเหตุ${row.materialName}`"></label></div>
    <p v-if="errors[row.materialId]" role="alert" class="package-error">{{ errors[row.materialId] }}</p>
    <Button size="compact" :data-save-package="row.materialId" @click="save(row)">บันทึกการปรับ</Button>
   </article>
  </div>
  <template #footer><Button v-if="store.packageAdjustments.length" variant="quiet" data-reset-all-packages @click="resetAll">คืนค่าทั้งหมด</Button><Button @click="close">เสร็จสิ้น</Button></template>
 </DialogFrame>
</template>
<script setup>
import {computed,reactive,ref,watch,nextTick} from 'vue'
import {usePosStore} from '@/stores/posStore'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import Button from '@/components/ui/Button.vue'
const store=usePosStore(),addId=ref(''),drafts=reactive({}),errors=reactive({})
const reasons=[{value:'separate_bag',label:'แยกถุง'},{value:'customer_declined',label:'ลูกค้าไม่รับ'},{value:'combined_packaging',label:'รวมบรรจุภัณฑ์'},{value:'package_unavailable',label:'Package ไม่มี'},{value:'repacked',label:'เปลี่ยนบรรจุ'},{value:'other',label:'อื่น ๆ'}]
const rows=computed(()=>store.cartPackagePlan.items||[])
const addable=computed(()=>store.materials.filter(item=>!item.isDeleted&&item.inventoryType==='packaging'&&!rows.value.some(row=>row.materialId===item.id)))
function sync(){for(const row of rows.value){drafts[row.materialId]={requestedQty:row.requestedQty,reason:row.reason||'',note:row.note||''};delete errors[row.materialId]}}
watch(()=>store.modals.packageReview.isOpen,open=>{if(open)sync()})
watch(rows,()=>{if(store.modals.packageReview.isOpen)sync()},{deep:true,immediate:true})
function signed(value){return value>0?`+${value}`:String(value)}
function hasAdjustment(id){return store.packageAdjustments.some(item=>item.materialId===id)}
function save(row){const result=store.savePackageAdjustment({materialId:row.materialId,...drafts[row.materialId]});if(!result.ok)errors[row.materialId]=result.message;else{delete errors[row.materialId];nextTick(sync)}}
function addPackage(){if(!addId.value)return;const material=store.materials.find(item=>item.id===addId.value);store.savePackageAdjustment({materialId:addId.value,requestedQty:1,reason:'separate_bag',note:''});addId.value='';nextTick(sync)}
function reset(id){store.resetPackageAdjustment(id);nextTick(sync)}
function resetAll(){store.resetPackageAdjustments();nextTick(sync)}
function close(){store.modals.packageReview.isOpen=false}
</script>
<style scoped>
.package-review{display:grid;gap:14px;min-width:0}.package-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end}.package-add label{grid-column:1/-1;font-size:.75rem;color:var(--text-muted)}select,input{width:100%;min-width:0;padding:9px 10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--bg-card)}.package-row{display:grid;gap:10px;padding:14px;border:1px solid var(--border-subtle);border-radius:14px;min-width:0}.package-row header{display:flex;justify-content:space-between;gap:8px}.package-row strong,.package-row small{display:block}.package-row small,.package-sources,.package-empty{font-size:.75rem;color:var(--text-muted);margin-top:3px}.package-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.package-fields label{font-size:.75rem;color:var(--text-muted)}.package-error{font-size:.75rem;color:var(--accent-red)}@media(max-width:600px){.package-fields{grid-template-columns:1fr}.package-add{grid-template-columns:1fr}.package-add label{grid-column:auto}}
</style>
