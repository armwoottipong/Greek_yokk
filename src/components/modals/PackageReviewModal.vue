<template>
 <DialogFrame :open="store.modals.packageReview.isOpen" id="PackageReviewModal" title="บรรจุภัณฑ์ของออเดอร์" description="การปรับมีผลเฉพาะออเดอร์นี้" presentation="sheet" :teleport="!!store.cloud" initial-focus="#package-add" @request-close="close">
  <fieldset class="package-review" :disabled="!!store.packageLocked">
   <div class="package-add"><FormField id="package-add" label="เพิ่มบรรจุภัณฑ์" v-slot="{controlId}"><AppSelect :id="controlId" v-model="addId" aria-label="เพิ่มบรรจุภัณฑ์"><option value="">เลือกบรรจุภัณฑ์</option><option v-for="item in addable" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option></AppSelect></FormField><Button variant="secondary" :disabled="!addId" @click="addPackage"><Plus :size="16" aria-hidden="true"/>เพิ่ม</Button></div>
   <p v-if="planIssues.length" class="package-error" role="alert">มี Package ที่ใช้ไม่ได้ กรุณาคืนค่ารายการที่มีปัญหาก่อนชำระเงิน</p>
   <p v-if="!rows.length" class="package-empty">ออเดอร์นี้ยังไม่มี Package</p>
   <article v-for="{row,material} in displayRows" :key="row.materialId" class="package-row">
    <button type="button" class="package-row-summary" :data-edit-package="row.materialId" :aria-expanded="expandedId===row.materialId" :aria-controls="`package-edit-${row.materialId}`" @click="toggleRow(row.materialId)">
     <span class="package-image"><EntityImage kind="materials" :entity-id="row.materialId" :image="material?.image" :emoji="material?.emoji || '📦'"/></span>
     <span class="package-identity">
      <strong>{{ row.materialName }}</strong>
      <small>จากสูตร {{ row.baselineQty }} {{ row.unit }}<template v-if="row.adjustmentQty"> · ปรับ {{ signed(row.adjustmentQty) }}</template></small>
     </span>
     <span v-if="!row.invalid" class="package-used">ใช้ <b class="font-number">{{ row.requestedQty }}</b> {{ row.unit }}</span>
     <span v-else class="package-error">ใช้ไม่ได้</span>
     <ChevronDown :size="16" class="package-chevron" aria-hidden="true"/>
    </button>
    <div v-show="expandedId===row.materialId" :id="`package-edit-${row.materialId}`" class="package-row-content">
     <div v-if="!row.invalid" class="package-fields">
      <FormField :id="`package-qty-${row.materialId}`" label="จำนวนที่ใช้" v-slot="{controlId}"><AppQuantityInput :id="controlId" v-model="drafts[row.materialId].requestedQty" :label="`จำนวน${row.materialName}`" :unit="row.unit" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"/></FormField>
      <FormField :id="`package-reason-${row.materialId}`" label="เหตุผลที่ปรับ" v-slot="{controlId}"><AppSelect :id="controlId" v-model="drafts[row.materialId].reason" :aria-label="`เหตุผล${row.materialName}`" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"><option value="">เลือกเหตุผล</option><option v-for="reason in reasons" :key="reason.value" :value="reason.value">{{ reason.label }}</option></AppSelect></FormField>
      <FormField v-if="drafts[row.materialId].reason==='other'" :id="`package-note-${row.materialId}`" label="หมายเหตุ" class="package-note" v-slot="{controlId}"><input :id="controlId" v-model="drafts[row.materialId].note" class="soft-input package-note-input" placeholder="ระบุเหตุผลเพิ่มเติม" :aria-label="`หมายเหตุ${row.materialName}`" :aria-describedby="errors[row.materialId]?`package-error-${row.materialId}`:undefined"></FormField>
     </div>
     <p v-else class="package-error">รายการนี้ถูกเก็บถาวรหรือเปลี่ยนประเภทแล้ว กรุณาคืนค่า</p>
     <p v-if="errors[row.materialId]" :id="`package-error-${row.materialId}`" role="alert" class="package-error">{{ errors[row.materialId] }}</p>
     <div class="package-row-footer">
      <details v-if="row.sources.length" class="package-sources">
       <summary>ดูที่มาจากสูตร</summary>
       <p>{{ row.sources.map(source=>`${source.sourceName} ${source.qty}`).join(', ') }}</p>
      </details>
      <div class="package-row-actions">
       <Button v-if="hasAdjustment(row.materialId)" variant="quiet" size="compact" :data-reset-package="row.materialId" @click="reset(row.materialId)">คืนค่า</Button>
       <Button v-if="!row.invalid" variant="secondary" size="compact" :data-save-package="row.materialId" @click="save(row)">บันทึกการปรับ</Button>
      </div>
     </div>
    </div>
   </article>
  </fieldset>
  <template #footer><Button v-if="store.packageAdjustments.length" variant="quiet" data-reset-all-packages :disabled="!!store.packageLocked" @click="resetAll">คืนค่าทั้งหมด</Button><Button @click="close">เสร็จสิ้น</Button></template>
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
import EntityImage from '@/components/images/EntityImage.vue'
import {ChevronDown,Plus} from 'lucide-vue-next'
const props=defineProps({model:{type:Object,default:null}})
const store=props.model||usePosStore(),addId=ref(''),expandedId=ref(null),drafts=reactive({}),errors=reactive({})
const reasons=[{value:'separate_bag',label:'แยกถุง'},{value:'customer_declined',label:'ลูกค้าไม่รับ'},{value:'combined_packaging',label:'รวมบรรจุภัณฑ์'},{value:'package_unavailable',label:'Package ไม่มี'},{value:'repacked',label:'เปลี่ยนบรรจุ'},{value:'other',label:'อื่น ๆ'}]
const plan=computed(()=>store.cartPackagePlan),planIssues=computed(()=>plan.value.issues||[])
const rows=computed(()=>{const valid=plan.value.items||[],ids=new Set(valid.map(row=>row.materialId));const invalid=store.packageAdjustments.filter(row=>!ids.has(row.materialId)).map(row=>{const material=store.materials.find(item=>item.id===row.materialId);return {materialId:row.materialId,materialName:material?.name||row.materialId,unit:material?.unit||'',baselineQty:0,adjustmentQty:row.deltaQty,requestedQty:0,sources:[],invalid:true}});return [...valid,...invalid]})
const displayRows=computed(()=>rows.value.map(row=>({row,material:store.materials.find(item=>item.id===row.materialId)})))
const addable=computed(()=>store.materials.filter(item=>!item.isDeleted&&item.inventoryType==='packaging'&&!rows.value.some(row=>row.materialId===item.id)))
const savedDrafts=new Map()
const sameDraft=(a,b)=>a&&b&&a.requestedQty===b.requestedQty&&a.reason===b.reason&&a.note===b.note
function sync(resetIds=[],resetAll=false){
 const ids=new Set(rows.value.map(row=>row.materialId))
 for(const id of Object.keys(drafts))if(!ids.has(id)){delete drafts[id];delete errors[id];savedDrafts.delete(id)}
 for(const row of rows.value){
  const id=row.materialId,next={requestedQty:row.requestedQty,reason:row.reason||'',note:row.note||''}
  if(resetAll||resetIds.includes(id)||!drafts[id]||sameDraft(drafts[id],savedDrafts.get(id))){drafts[id]=next;savedDrafts.set(id,{...next});delete errors[id]}
 }
}
watch(()=>store.modals.packageReview.isOpen,open=>{if(open){expandedId.value=null;sync([],true)}})
watch(rows,()=>{if(store.modals.packageReview.isOpen)sync()},{deep:true,immediate:true})
function signed(value){return value>0?`+${value}`:String(value)}
function toggleRow(id){expandedId.value=expandedId.value===id?null:id}
function hasAdjustment(id){return store.packageAdjustments.some(item=>item.materialId===id)}
function save(row){const result=store.savePackageAdjustment({materialId:row.materialId,...drafts[row.materialId]});if(!result.ok)errors[row.materialId]=result.message;else{delete errors[row.materialId];nextTick(()=>sync([row.materialId]))}}
function addPackage(){
 if(!addId.value)return
 const id=addId.value
 const result=store.savePackageAdjustment({materialId:id,requestedQty:1,reason:'separate_bag',note:''})
 if(result.ok)expandedId.value=id
 addId.value=''
 nextTick(()=>sync())
}
function reset(id){store.resetPackageAdjustment(id);nextTick(()=>sync([id]))}
function resetAll(){store.resetPackageAdjustments();nextTick(()=>sync([],true))}
function close(){store.modals.packageReview.isOpen=false}
</script>
<style scoped>
.package-review{display:grid;gap:0;min-width:0}.package-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;padding-bottom:12px;border-bottom:1px solid var(--border-subtle)}.package-review :deep(.app-select){width:100%}.package-review :deep(.app-select-trigger){min-height:48px;border-radius:12px;font-size:.8125rem;padding:12px}.package-add>.ui-button{min-height:48px;padding-inline:14px}
.package-row{border-bottom:1px solid var(--border-subtle);min-width:0}.package-row:last-child{border-bottom:0}
.package-row-summary{width:100%;display:grid;grid-template-columns:38px minmax(0,1fr) auto auto;align-items:center;gap:8px;padding:8px 2px;text-align:start;color:var(--text-main)}
.package-row-summary:enabled{cursor:pointer}.package-row-summary:focus-visible{outline:2px solid var(--accent-brand);outline-offset:-2px;border-radius:8px}
.package-image{width:38px;height:38px;background:var(--bg-soft);border-radius:8px}
.package-identity{min-width:0;overflow-wrap:anywhere}.package-identity strong{display:block;font-size:.875rem;font-weight:650;line-height:1.4}.package-identity small{display:block;font-size:.75rem;color:var(--text-muted);margin-top:2px}
.package-used{font-size:.75rem;white-space:nowrap}.package-used b{font-size:.9375rem}.package-chevron{color:var(--text-muted)}.package-row-summary[aria-expanded=true] .package-chevron{transform:rotate(180deg)}
.package-row-content{display:grid;gap:8px;padding:8px 0 10px}
.package-sources,.package-empty{font-size:.75rem;color:var(--text-muted);line-height:1.7}.package-empty,.package-review>.package-error{padding-block:8px}.package-sources{min-width:0;flex:1}.package-sources summary{cursor:pointer;min-height:44px;display:list-item;align-content:center}.package-sources p{padding:0 8px 6px 0;overflow-wrap:anywhere}
.package-fields{display:grid;grid-template-columns:minmax(168px,.9fr) minmax(0,1.1fr);gap:8px}.package-note{grid-column:1/-1}.package-note-input{width:100%;min-height:48px;padding:12px;border-radius:12px}.package-row-footer{display:flex;align-items:flex-start;gap:8px;min-width:0}.package-row-actions{display:flex;justify-content:flex-end;gap:4px;margin-left:auto;flex-shrink:0}.package-row-actions :deep(.ui-button){padding-inline:10px}.package-error{font-size:.8125rem;color:var(--accent-red);line-height:1.6;margin:0}
@media(max-width:420px){.package-fields{grid-template-columns:1fr}.package-note{grid-column:auto}.package-row-footer{flex-wrap:wrap}}
</style>
