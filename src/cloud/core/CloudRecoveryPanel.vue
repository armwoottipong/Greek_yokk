<template>
 <section id="settings-recovery" class="editorial-card p-4 sm:p-6 space-y-4" aria-label="ตรวจไฟล์และเตรียมกู้คืน">
  <h3>กู้คืน / เริ่มร้านใหม่ผ่านเครื่องเจ้าของ</h3>
  <p>เลือกไฟล์เพื่อตรวจข้อมูลก่อนสร้างแผน การตรวจในหน้านี้ยังไม่เปลี่ยนข้อมูลร้าน</p>
  <label for="cloud-recovery-file">ไฟล์สำรอง JSON</label>
  <input id="cloud-recovery-file" type="file" accept=".json,application/json" :disabled="checking||blocked" @change="inspect">
  <p v-if="checking" role="status">กำลังตรวจไฟล์และ checksum…</p>
  <p v-if="error" role="alert">{{ error }}</p>
  <div v-if="preview" role="status">
   <strong>{{ preview.ready?'ไฟล์ผ่านการตรวจเบื้องต้น':'ไฟล์ระบบเดิม · ต้องตรวจสูตร ล็อต และหลักฐานบิลด้วยเครื่องมือเจ้าของ' }}</strong>
   <p v-if="preview.source">ร้าน {{ preview.source.shopId }} · revision {{ preview.source.revision }} · {{ preview.source.date||'ไม่ระบุวันที่' }}</p>
   <p>{{ Object.entries(preview.counts||{}).map(([k,v])=>`${k}: ${v}`).join(' · ') }}</p>
   <p v-if="preview.checksum">SHA-256: <span class="break-all">{{ preview.checksum }}</span></p>
  </div>
  <details class="settings-disclosure"><summary>ขั้นตอนและคำสั่งสำหรับเครื่องเจ้าของร้าน</summary>
  <p>เครื่องเจ้าของต้องอัปเดตโค้ดล่าสุดและล็อกอิน Firebase CLI ด้วยบัญชีเจ้าของโปรเจกต์ก่อน คำสั่งแรกตรวจและสร้างแผนเท่านั้น จากนั้นตรวจยอดและพักทุกเครื่องก่อน stage/activate</p>
  <pre class="overflow-x-auto text-xs">{{ command }}</pre>
  <p>ล้างร้านใช้ <code>--reset</code> แทนไฟล์ · โหลดตัวอย่างใช้ <code>--demo</code> · การแปลงบิลเก่าต้องมีหลักฐานล็อตครบ ใช้ <code>--migrate-legacy</code> กับไฟล์ Firebase หรือ <code>--legacy</code> กับไฟล์เดิม</p>
  <p>เครื่องมือเก็บ generation เดิมไว้ และปฏิเสธการสลับหากร้านเปลี่ยนหลังเตรียมแผน ย้อนกลับอัตโนมัติได้เฉพาะก่อนเริ่มบันทึกธุรกิจใน generation ใหม่ รายละเอียดอยู่ใน <code>docs/owner-recovery.md</code></p>
  </details>
 </section>
</template>
<script setup>
import {computed,ref,onUnmounted} from 'vue'
import {inspectOwnerBackup} from '../../../scripts/recovery-plan.js'
import {MAX_BACKUP_BYTES} from './businessBackup.js'
const props=defineProps({projectId:String,shopId:String,blocked:Boolean})
const checking=ref(false),error=ref(''),preview=ref(null),isLegacy=ref(false)
let epoch=0,closed=false
const command=computed(()=>`node scripts/owner-recovery.mjs --project ${props.projectId||'PROJECT_ID'} --shop ${props.shopId||'SHOP_ID'} --account OWNER_GOOGLE_EMAIL --generation g_restore_REVIEWED_UNIQUE_ID --backup "C:/path/to/backup.json"${isLegacy.value?' --legacy':''} --out "C:/path/to/reviewed-plan.json"`)
async function inspect(event){
 const file=event.target.files?.[0],token=++epoch;preview.value=null;error.value=''
 if(!file)return
 if(file.size>MAX_BACKUP_BYTES){error.value='ไฟล์เกิน 20 MB กรุณาตรวจด้วยเครื่องมือเจ้าของ';event.target.value='';return}
 checking.value=true
 try{
  const text=await file.text();let raw;try{raw=JSON.parse(text)}catch{throw new Error('ไฟล์ JSON ไม่ถูกต้อง')}
  const native=raw?.format==='greek-yogg.firebase-business-backup'
  const result=native?await inspectOwnerBackup(text):raw&&Array.isArray(raw.materials)&&Array.isArray(raw.menus)&&Array.isArray(raw.platforms)?{ready:false,counts:Object.fromEntries(['materials','menus','addons','orders','activityLogs'].map(k=>[k,raw[k]?.length||0])),issues:[]}:null
  if(closed||token!==epoch)return
  if(!result||native&&!result.ready)throw new Error('ไฟล์ไม่ผ่านการตรวจรูปแบบ checksum หรือความครบของข้อมูล กรุณาตรวจต้นฉบับก่อน')
  isLegacy.value=!native;preview.value=result
 }catch(e){if(!closed&&token===epoch)error.value=e.message||'ตรวจไฟล์ไม่สำเร็จ'}finally{if(!closed&&token===epoch)checking.value=false;event.target.value=''}
}
onUnmounted(()=>{closed=true;epoch++})
</script>
