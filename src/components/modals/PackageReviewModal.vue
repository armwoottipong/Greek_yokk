<template>
 <DialogFrame :open="store.modals.packageReview.isOpen" id="PackageReviewModal" title="บรรจุภัณฑ์ของออเดอร์" description="การปรับมีผลเฉพาะออเดอร์นี้" presentation="sheet" :teleport="!!store.cloud" initial-focus="#package-add" @request-close="close">
  <fieldset class="package-review" :disabled="!!store.packageLocked">
   <div class="package-add">
    <FormField id="package-add" label="เพิ่มบรรจุภัณฑ์" v-slot="{controlId}">
     <AppSelect :id="controlId" v-model="addId" aria-label="เพิ่มบรรจุภัณฑ์">
      <option value="">เลือกบรรจุภัณฑ์</option>
      <option v-for="item in addable" :key="item.id" :value="item.id">{{ item.name }} ({{ item.unit }})</option>
     </AppSelect>
    </FormField>
    <Button variant="secondary" data-add-package :disabled="!addId" @click="addPackage"><Plus :size="16" aria-hidden="true"/>เพิ่ม</Button>
   </div>
   <p v-if="planIssues.length" class="package-error">ตรวจบรรจุภัณฑ์ที่ใช้ไม่ได้ก่อนชำระเงิน</p>
   <p v-if="!rows.length" class="package-empty">ออเดอร์นี้ยังไม่มีบรรจุภัณฑ์</p>
   <article v-for="row in rows" :key="row.materialId" class="package-row">
    <span class="package-image"><EntityImage kind="materials" :entity-id="row.materialId" :image="row.material?.image" :emoji="row.material?.emoji || '📦'"/></span>
    <div class="package-identity">
     <strong>{{ row.materialName }}</strong>
     <small v-if="row.invalid" class="package-error">ใช้ไม่ได้</small>
     <small v-else>จากสูตร {{ row.baselineQty }} {{ row.unit }}</small>
    </div>
    <Button v-if="row.invalid" variant="quiet" size="compact" :aria-label="'คืนค่า '+row.materialName" @click="reset(row.materialId)">คืนค่า</Button>
    <div v-else class="package-stepper" :aria-label="'จำนวนที่ใช้ '+row.materialName" role="group">
     <IconButton :label="'ลดจำนวน'+row.materialName" :disabled="quantity(row)<=0" @click="step(row,-1)"><Minus :size="16" aria-hidden="true"/></IconButton>
     <div class="package-count"><output class="font-number">{{ quantity(row) }}</output><small>{{ row.unit }}</small></div>
     <IconButton :label="'เพิ่มจำนวน'+row.materialName" @click="step(row,1)"><Plus :size="16" aria-hidden="true"/></IconButton>
    </div>
   </article>
   <div class="package-reason">
    <FormField id="package-reason" label="เหตุผลที่ปรับบรรจุภัณฑ์" hint="ใช้เหตุผลเดียวกับทุกจำนวนที่ปรับในครั้งนี้" v-slot="{controlId,describedBy}">
     <AppSelect :id="controlId" v-model="reason" :aria-describedby="describedBy">
      <option value="">เลือกเหตุผล</option>
      <option v-for="option in reasons" :key="option.value" :value="option.value">{{ option.label }}</option>
     </AppSelect>
    </FormField>
    <FormField v-if="reason==='other'" id="package-note" label="ระบุเหตุผลเพิ่มเติม" v-slot="{controlId}">
     <AppInput :id="controlId" v-model="note" maxlength="1000"/>
    </FormField>
    <p v-if="error" role="alert" class="package-error">{{ error }}</p>
   </div>
  </fieldset>
  <template #footer>
   <Button v-if="store.packageAdjustments.length" variant="quiet" data-reset-all-packages :disabled="!!store.packageLocked" @click="resetAll">คืนค่าทั้งหมด</Button>
   <Button v-if="changes.size" data-save-packages :disabled="!!store.packageLocked" @click="save">บันทึกการปรับ</Button>
   <Button v-else @click="close">เสร็จสิ้น</Button>
  </template>
 </DialogFrame>
</template>

<script setup>
import {computed,reactive,ref,watch} from 'vue'
import {Minus,Plus} from 'lucide-vue-next'
import {usePosStore} from '@/stores/posStore'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import FormField from '@/components/ui/FormField.vue'
import IconButton from '@/components/ui/IconButton.vue'
import EntityImage from '@/components/images/EntityImage.vue'

const props=defineProps({model:{type:Object,default:null}})
const store=props.model||usePosStore()
const addId=ref(''),reason=ref(''),note=ref(''),error=ref('')
const changes=reactive(new Map())
const reasons=[{value:'separate_bag',label:'แยกถุง'},{value:'customer_declined',label:'ลูกค้าไม่รับ'},{value:'combined_packaging',label:'รวมบรรจุภัณฑ์'},{value:'package_unavailable',label:'บรรจุภัณฑ์หมด'},{value:'repacked',label:'เปลี่ยนบรรจุภัณฑ์'},{value:'other',label:'อื่น ๆ'}]

const planIssues=computed(()=>store.cartPackagePlan.issues||[])
const materialById=computed(()=>new Map(store.materials.map(material=>[material.id,material])))
const savedRows=computed(()=>new Map(store.cartPackagePlan.items.map(row=>[row.materialId,row])))
const rows=computed(()=>{
 const ids=new Set([...savedRows.value.keys(),...store.packageAdjustments.map(row=>row.materialId),...changes.keys()])
 return [...ids].map(materialId=>{
  const material=materialById.value.get(materialId)
  const row=savedRows.value.get(materialId)
  return row
   ? {...row,material}
   : {materialId,material,materialName:material?.name||materialId,unit:material?.unit,baselineQty:0,requestedQty:0,
    invalid:store.packageAdjustments.some(item=>item.materialId===materialId)}
 })
})
const addable=computed(()=>store.materials.filter(item=>!item.isDeleted&&item.inventoryType==='packaging'&&!rows.value.some(row=>row.materialId===item.id)))

watch(()=>store.modals.packageReview.isOpen,open=>{if(open)clearDraft()})

function clearDraft(){
 changes.clear()
 addId.value='';reason.value='';note.value='';error.value=''
}
function quantity(row){return changes.get(row.materialId)?.requestedQty??row.requestedQty}
function step(row,direction){
 const {materialId,requestedQty:previousQty}=row
 const requestedQty=Math.max(0,Math.round((quantity(row)+direction)*100)/100)
 if(requestedQty===previousQty)changes.delete(materialId)
 else changes.set(materialId,{materialId,requestedQty,previousQty:changes.get(materialId)?.previousQty??previousQty})
 error.value=''
}
function addPackage(){
 if(!addId.value)return
 step({materialId:addId.value,requestedQty:0},1)
 addId.value=''
}
function save(){
 if(store.packageLocked||!changes.size)return
 const current=[...changes.values()]
 if(current.some(({materialId,previousQty})=>(savedRows.value.get(materialId)?.requestedQty??0)!==previousQty)){
  error.value='จำนวนบรรจุภัณฑ์ในออเดอร์เปลี่ยนแล้ว กรุณาปิดและเปิดใหม่เพื่อตรวจจำนวนล่าสุด'
  return
 }
 const quantities=current.map(({materialId,requestedQty})=>({materialId,requestedQty}))
 const result=store.savePackageAdjustments({changes:quantities,reason:reason.value,note:reason.value==='other'?note.value:''})
 if(!result.ok){error.value=result.message;return}
 clearDraft()
 close()
}
function reset(id){
 store.resetPackageAdjustment(id)
 changes.delete(id)
 error.value=''
}
function resetAll(){
 store.resetPackageAdjustments()
 clearDraft()
}
function close(){store.modals.packageReview.isOpen=false}
</script>

<style scoped>
.package-review{display:grid;min-width:0}
.package-add{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:end;padding-bottom:12px}
.package-review :deep(.app-select){width:100%}
.package-review :deep(.app-select-trigger),.package-add>.ui-button{min-height:44px}
.package-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 0;border-top:1px solid var(--border-subtle);min-width:0}
.package-image{width:38px;height:38px;background:var(--bg-soft);border-radius:8px}
.package-identity{min-width:0;overflow-wrap:anywhere}
.package-identity strong{display:block;font-size:.875rem;font-weight:650;line-height:1.4}
.package-identity small,.package-empty,.package-count small{font-size:.75rem;color:var(--text-muted)}
.package-identity .package-error,.package-error{color:var(--accent-red)}
.package-review>p{margin:8px 0}
.package-stepper{display:grid;grid-template-columns:44px minmax(28px,auto) 44px;align-items:center;background:var(--bg-soft);border-radius:10px}
.package-stepper :deep(.ui-icon-button){width:44px;min-height:44px}
.package-count{display:grid;justify-items:center;max-width:5rem;padding:0 2px;text-align:center;overflow-wrap:anywhere;line-height:1.25}
.package-count output{font-size:.875rem;font-weight:650}
.package-reason{display:grid;gap:8px;padding-top:12px;border-top:1px solid var(--border-subtle)}
.package-error{font-size:.8125rem;line-height:1.5}
</style>
