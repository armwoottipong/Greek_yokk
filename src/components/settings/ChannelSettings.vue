<template>
 <section class="channel-settings" aria-labelledby="channel-settings-title">
  <header class="channel-header">
   <div>
    <h3 id="channel-settings-title">ช่องทางขายและค่าธรรมเนียม</h3>
    <p>จัดการช่องทางที่แสดงใน POS และกำหนด GP ของแต่ละช่องทาง</p>
   </div>
   <Button :disabled="blocked || model.platforms.length >= 4" @click="openEdit()"><Plus :size="17" aria-hidden="true"/>เพิ่มช่องทาง</Button>
  </header>

  <div class="channel-capacity" aria-live="polite">
   <span><strong>{{ model.platforms.length }} / 4</strong> ช่องทาง</span>
   <span>{{ active.length }} เปิดขาย · {{ model.platforms.length - active.length }} พักขาย</span>
  </div>
  <p v-if="model.platforms.length === 4" class="channel-help">ครบ 4 ช่องทางแล้ว นำช่องทางที่ไม่ใช้ออกเพื่อเพิ่มช่องทางใหม่</p>

  <ul class="channel-list" role="list">
   <li v-for="channel in model.platforms" :key="channel.id" class="channel-row">
    <span class="channel-icon" aria-hidden="true"><Store :size="19"/></span>
    <div class="channel-identity">
     <h4>{{ channel.name }}</h4>
     <span class="channel-state" :data-active="channel.isActive !== false">{{ channel.isActive === false ? 'พักขาย' : 'เปิดขาย' }}</span>
    </div>
    <dl class="channel-gp"><dt>GP</dt><dd>{{ formatGp(channel.gpPercent) }}%</dd></dl>
    <div class="channel-actions">
     <IconButton :label="`แก้ไข ${channel.name}`" :disabled="blocked" @click="openEdit(channel)"><Pencil :size="17" aria-hidden="true"/></IconButton>
     <IconButton :label="`นำ ${channel.name} ออก`" :disabled="blocked || isLastActive(channel)" @click="openRemove(channel)"><Trash2 :size="17" aria-hidden="true"/></IconButton>
    </div>
   </li>
  </ul>
  <p class="channel-help">ต้องมีช่องทางเปิดขายอย่างน้อย 1 ช่องทาง การเปลี่ยน GP มีผลกับบิลใหม่</p>

  <DialogFrame id="channel-editor" :open="!!draft" :busy="saving" :title="draft?.id ? 'แก้ไขค่าธรรมเนียม' : 'เพิ่มช่องทางขาย'"
   :description="draft?.id ? draft.name : 'ตั้งชื่อและเลือกราคาตั้งต้น'" presentation="side-drawer" width="440px"
   :initial-focus="draft?.id ? '#channel-gp' : '#channel-name'" @request-close="close">
   <form v-if="draft" id="channel-editor-form" class="channel-form" novalidate @submit.prevent="save">
    <FormField v-if="!draft.id" id="channel-name" label="ชื่อช่องทาง" required v-slot="{controlId}">
     <AppInput :id="controlId" v-model="draft.name" maxlength="80" :disabled="saving" placeholder="เช่น สั่งล่วงหน้า"/>
    </FormField>
    <FormField id="channel-gp" label="ค่าธรรมเนียม GP" required hint="0–99.99% ทศนิยมไม่เกิน 2 ตำแหน่ง" v-slot="{controlId,describedBy}">
     <AppInput :id="controlId" v-model="draft.gp" type="number" min="0" max="99.99" step="0.01" :aria-describedby="describedBy" :disabled="saving"><template #suffix>%</template></AppInput>
    </FormField>
    <template v-if="!draft.id">
     <FormField id="channel-source" label="คัดลอกราคาจาก" required v-slot="{controlId}">
      <AppSelect :id="controlId" v-model="draft.sourceId" aria-label="คัดลอกราคาจาก" :disabled="saving">
       <option v-for="channel in active" :key="channel.id" :value="channel.id">{{ channel.name }}</option>
      </AppSelect>
     </FormField>
     <p class="channel-help">คัดลอกราคาเมนูและตัวเลือก ช่องทางใหม่จะพักขายไว้เพื่อให้ตรวจราคาก่อนเปิด</p>
    </template>
    <AppCheckbox v-else v-model="draft.enabled" variant="switch" label="เปิดขายผ่านช่องทางนี้" :disabled="saving || isLastActive(current)">เปิดขายใน POS</AppCheckbox>
    <p v-if="conflict" role="alert" class="channel-error">ข้อมูลร้านเปลี่ยนแล้ว กรุณาปิดหน้าต่างและเปิดใหม่เพื่อตรวจค่าล่าสุด</p>
    <p v-else-if="error" role="alert" class="channel-error">{{ error }}</p>
   </form>
   <template #footer>
    <Button variant="quiet" :disabled="saving" @click="close">ยกเลิก</Button>
    <Button type="submit" form="channel-editor-form" :loading="saving" :disabled="blocked || conflict || !validDraft">{{ draft?.id ? 'บันทึกช่องทางนี้' : 'เพิ่มช่องทาง' }}</Button>
   </template>
  </DialogFrame>

  <DialogFrame id="channel-remove" :open="!!removing" :busy="saving" title="นำช่องทางออก" :description="removing?.name" width="440px" @request-close="close">
   <p>ช่องทางนี้จะออกจาก POS และการตั้งราคาเมนู บิลเดิมยังเก็บชื่อและยอดที่บันทึกไว้</p>
   <p v-if="conflict || error" role="alert" class="channel-error">{{ conflict ? 'ข้อมูลร้านเปลี่ยนแล้ว กรุณาปิดหน้าต่างและตรวจรายการล่าสุด' : error }}</p>
   <template #footer><Button variant="quiet" :disabled="saving" @click="close">ยกเลิก</Button><Button variant="danger" :loading="saving" :disabled="blocked || conflict" @click="remove">นำช่องทางออก</Button></template>
  </DialogFrame>
 </section>
</template>

<script setup>
import {computed,ref} from 'vue'
import {Pencil,Plus,Store,Trash2} from 'lucide-vue-next'
import AppCheckbox from '@/components/ui/AppCheckbox.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppSelect from '@/components/ui/AppSelect.vue'
import Button from '@/components/ui/Button.vue'
import DialogFrame from '@/components/ui/DialogFrame.vue'
import FormField from '@/components/ui/FormField.vue'
import IconButton from '@/components/ui/IconButton.vue'
import {isValidGp} from '@/domain/pricing'

const props=defineProps({model:{type:Object,required:true}})
const draft=ref(null),removing=ref(null),saving=ref(false),error=ref(''),revision=ref(null)
const active=computed(()=>props.model.platforms.filter(row=>row.isActive!==false))
const current=computed(()=>props.model.platforms.find(row=>row.id===draft.value?.id))
const blocked=computed(()=>saving.value||props.model.settingsBlocked)
const conflict=computed(()=>!saving.value&&(draft.value||removing.value)&&props.model.revision!==revision.value)
const formatGp=new Intl.NumberFormat('th-TH',{maximumFractionDigits:2}).format
const gpPoints=value=>Math.round(Number(value)*100)
const validDraft=computed(()=>{
 const row=draft.value
 return !!row&&isValidGp(row.gp)&&Math.abs(Number(row.gp)*100-gpPoints(row.gp))<0.000001&&
  (row.id ? !!current.value&&(row.enabled||!isLastActive(current.value)) : !!row.name.trim()&&active.value.some(p=>p.id===row.sourceId))
})
function isLastActive(row){return !!row&&row.isActive!==false&&active.value.length===1}
function openEdit(row){
 if(blocked.value||!row&&props.model.platforms.length>=4)return
 revision.value=props.model.revision;error.value=''
 draft.value=row ? {id:row.id,name:row.name,gp:row.gpPercent,enabled:row.isActive!==false} : {name:'',gp:0,sourceId:active.value[0]?.id}
}
function openRemove(row){
 if(blocked.value||isLastActive(row))return
 revision.value=props.model.revision;error.value='';removing.value=row
}
function close(){if(!saving.value){draft.value=null;removing.value=null;error.value=''}}
async function submit(action){
 if(blocked.value||conflict.value)return
 saving.value=true;error.value=''
 try{
  const result=await action()
  if(result?.ok){draft.value=null;removing.value=null}
  else error.value=result?.message||'ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจคำสั่งเดิมก่อนลองใหม่'
 }catch{error.value='ยังยืนยันการบันทึกไม่ได้ กรุณาตรวจคำสั่งเดิมก่อนลองใหม่'}
 finally{saving.value=false}
}
function save(){
 if(!validDraft.value)return
 const {id,name,gp,enabled,sourceId}=draft.value
 if(!id)return submit(()=>props.model.changeChannel({id:`CHANNEL-${crypto.randomUUID()}`,name:name.trim(),gpBasisPoints:gpPoints(gp),sourceId},revision.value))
 const rates=Object.fromEntries(props.model.platforms.map(row=>[row.id,row.id===id?Number(gp):row.gpPercent]))
 const flags=Object.fromEntries(props.model.platforms.map(row=>[row.id,row.id===id?enabled:row.isActive!==false]))
 return submit(()=>props.model.savePlatformGpRates(rates,revision.value,flags))
}
function remove(){
 if(!removing.value||isLastActive(removing.value))return
 return submit(()=>props.model.changeChannel({id:removing.value.id},revision.value))
}
</script>

<style scoped>
.channel-settings{min-width:0;display:grid;gap:14px}
.channel-header{display:flex;justify-content:space-between;align-items:start;gap:14px;flex-wrap:wrap}
.channel-header h3{font-size:1.125rem;font-weight:650;color:var(--text-main)}
.channel-header p,.channel-help,.channel-error{font-size:.8125rem;line-height:1.65;color:var(--text-muted)}
.channel-header p{margin-top:4px}
.channel-capacity{display:flex;justify-content:space-between;gap:8px 16px;flex-wrap:wrap;padding:10px 12px;background:var(--bg-soft);border-radius:8px;font-size:.8125rem;color:var(--text-muted)}
.channel-capacity strong{font-weight:650;color:var(--accent-brand);font-variant-numeric:tabular-nums}
.channel-list{list-style:none;padding:0;margin:0;border-block:1px solid var(--border-subtle)}
.channel-row{display:grid;grid-template-columns:auto minmax(0,1fr) minmax(4rem,auto) auto;gap:12px;align-items:center;padding:12px 0;min-width:0}
.channel-row + .channel-row{border-top:1px solid var(--border-subtle)}
.channel-icon{width:38px;height:38px;display:grid;place-items:center;background:var(--bg-soft);color:var(--accent-brand);border-radius:9px}
.channel-identity h4{font-size:.9375rem;font-weight:600;overflow-wrap:anywhere}
.channel-state{font-size:.75rem;color:var(--text-muted);display:inline-flex;align-items:center;gap:6px}
.channel-state::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
.channel-state[data-active=true]{color:var(--state-success)}
.channel-gp{font-variant-numeric:tabular-nums;text-align:end;margin:0}
.channel-gp dt{font-size:.6875rem;color:var(--text-muted)}
.channel-gp dd{font-weight:650}
.channel-actions{display:flex;gap:2px}
.channel-actions :deep(button){width:40px;height:40px}
.channel-form{display:grid;gap:18px}
.channel-error{color:var(--state-danger)}
@media(max-width:420px){.channel-row{gap:7px;grid-template-columns:auto minmax(0,1fr) auto auto}.channel-icon{width:30px;height:30px}.channel-actions :deep(button){width:36px;height:40px}.channel-gp dd{font-size:.875rem}}
</style>
