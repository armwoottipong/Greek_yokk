<template>
 <DialogFrame :open="store.modals.packageReview.isOpen" id="PackageReviewModal" title="บรรจุภัณฑ์ของออเดอร์" description="ตรวจและปรับ Package จากสูตรเมนูและ Add-on การแก้ไขมีผลเฉพาะออเดอร์นี้" presentation="sheet" :teleport="false" initial-focus="#package-add" @request-close="close">
  <div class="package-review">
   <div class="package-add"><FormField id="package-add" label="เพิ่มบรรจุภัณฑ์" v-slot="{controlId}"><AppSelect :id="controlId" v-model="addId" aria-label="เพิ่มบรรจุภัณฑ์"><option value="">เลือกบรรจุภัณฑ์</option><option v-for="item in addable" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option></AppSelect></FormField><Button variant="secondary" :disabled="!addId" @click="addPackage"><Plus :size="16" aria-hidden="true"/>เพิ่ม</Button></div>
   <p v-if="planIssues.length" class="package-error" role="alert">มี Package ที่ใช้ไม่ได้ กรุณาคืนค่ารายการที่มีปัญหาก่อนชำระเงิน</p>
   <p v-if="!rows.length" class="package-empty">ออเดอร์นี้ยังไม่มี Package</p>
   <article v-for="row in rows" :key="row.materialId" class="package-row">
    <header><div><strong>{{ row.materialName }}</strong><small>จากสูตร {{ row.baselineQty }} {{ row.unit }}<template v-if="row.adjustmentQty"> · ปรับ {{ signed(row.adjustmentQty) }}</template></small></div><StatusBadge v-if="!row.invalid" :label="`ใช้ ${row.requestedQty} ${row.unit}`" :tone="row.adjustmentQty?'warning':'neutral'"/></header>
    <details v-if="row.sources.length" class="package-sources"><summary>ดูที่มาจากสูตร</summary><p>{{ row.sources.map(source=>`${source.sourceName} ${source.qty}`).join(', ') }}</p></details>
    <div v-if="!row.invalid" class="package-fields">
     <FormField :id="`package-qty-${row.materialId}`" label="จำนวนที่ใช้" v-slot="{controlId}"><AppQuantityInput :id="controlId" v-model="drafts[row.materialId].requestedQty" :label="`จำนวน${row.materialName}`" :unit="row.unit" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"/></FormField>
     <FormField :id="`package-reason-${row.materialId}`" label="เหตุผลที่ปรับ" v-slot="{controlId}"><AppSelect :id="controlId" v-model="drafts[row.materialId].reason" :aria-label="`เหตุผล${row.materialName}`" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"><option value="">เลือกเหตุผล</option><option v-for="reason in reasons" :key="reason.value" :value="reason.value">{{ reason.label }}</option></AppSelect></FormField>
     <FormField v-if="drafts[row.materialId].reason==='other'" :id="`package-note-${row.materialId}`" label="หมายเหตุ" class="package-note" v-slot="{controlId}"><input :id="controlId" v-model="drafts[row.materialId].note" class="soft-input package-note-input" placeholder="ระบุเหตุผลเพิ่มเติม" :aria-label="`หมายเหตุ${row.materialName}`" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"></FormField>
    </div>
    <p v-else class="package-error">รายการนี้ถูกเก็บถาวรหรือเปลี่ยนประเภทแล้ว กรุณาคืนค่า</p>
    <p v-if="errors[row.materialId]" :id="`package-error-${row.materialId}`" role="alert" class="package-error">{{ errors[row.materialId] }}</p>
    <div class="package-row-actions"><Button v-if="hasAdjustment(row.materialId)" variant="quiet" size="compact" :data-reset-package="row.materialId" @click="reset(row.materialId)">คืนค่า</Button><Button v-if="!row.invalid" variant="secondary" size="compact" :data-save-package="row.materialId" @click="save(row)">บันทึกการปรับ</Button></div>
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
import AppSelect from '@/components/ui/AppSelect.vue'
import AppQuantityInput from '@/components/ui/AppQuantityInput.vue'
import FormField from '@/components/ui/FormField.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import {Plus} from 'lucide-vue-next'
const store=usePosStore(),addId=ref(''),drafts=reactive({}),errors=reactive({})
const reasons=[{value:'separate_bag',label:'แยกถุง'},{value:'customer_declined',label:'ลูกค้าไม่รับ'},{value:'combined_packaging',label:'รวมบรรจุภัณฑ์'},{value:'package_unavailable',label:'Package ไม่มี'},{value:'repacked',label:'เปลี่ยนบรรจุ'},{value:'other',label:'อื่น ๆ'}]
const plan=computed(()=>store.cartPackagePlan),planIssues=computed(()=>plan.value.issues||[])
const rows=computed(()=>{const valid=plan.value.items||[],ids=new Set(valid.map(row=>row.materialId));const invalid=store.packageAdjustments.filter(row=>!ids.has(row.materialId)).map(row=>{const material=store.materials.find(item=>item.id===row.materialId);return {materialId:row.materialId,materialName:material?.name||row.materialId,unit:material?.unit||'',baselineQty:0,adjustmentQty:row.deltaQty,requestedQty:0,sources:[],invalid:true}});return [...valid,...invalid]})
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
.package-review{display:grid;gap:24px;min-width:0}.package-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:end;padding-bottom:24px;border-bottom:1px solid var(--border-subtle)}.package-review :deep(.app-select){width:100%}.package-review :deep(.app-select-trigger){min-height:48px;border-radius:12px;font-size:.8125rem;padding:12px 14px}.package-add>.ui-button{min-height:48px;padding-inline:14px}
.package-row{display:grid;gap:16px;padding:0 0 24px;border-bottom:1px solid var(--border-subtle);min-width:0}.package-row:last-child{border-bottom:0;padding-bottom:0}.package-row header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.package-row header>div{min-width:0}.package-row header>.ui-status{flex-shrink:0}.package-row strong{display:block;font-size:.9375rem;font-weight:600;line-height:1.6}.package-row small{display:block;font-size:.75rem;color:var(--text-muted);margin-top:4px}.package-sources,.package-empty{font-size:.75rem;color:var(--text-muted);line-height:1.7}.package-sources summary{cursor:pointer;min-height:32px;display:list-item;align-content:center}.package-sources p{padding-top:6px;overflow-wrap:anywhere}
.package-fields{display:grid;grid-template-columns:minmax(180px,.9fr) minmax(0,1.1fr);gap:12px}.package-note{grid-column:1/-1}.package-note-input{width:100%;min-height:48px;padding:12px 14px;border-radius:12px}.package-row-actions{display:flex;justify-content:flex-end;gap:8px}.package-error{font-size:.8125rem;color:var(--accent-red);line-height:1.6}@media(max-width:520px){.package-fields{grid-template-columns:1fr}.package-note{grid-column:auto}}
</style>
