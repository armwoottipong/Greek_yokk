<template>
 <section id="settings-recovery" class="editorial-card recovery-panel" aria-label="ตรวจไฟล์และเตรียมกู้คืน">
  <header class="recovery-heading"><RotateCcw :size="24" aria-hidden="true"/><div><h3>กู้คืน / เริ่มร้านใหม่</h3><p>ตรวจไฟล์ที่นี่ แล้วดำเนินการผ่านเครื่องเจ้าของร้าน</p></div></header>
  <ol class="recovery-flow"><li><strong>ตรวจไฟล์สำรอง</strong><p>เลือกไฟล์ JSON เพื่อตรวจรูปแบบและความครบถ้วน ข้อมูลร้านยังไม่เปลี่ยน</p></li><li><strong>ตรวจแผนก่อนนำกลับมาใช้</strong><p>ใช้เครื่องเจ้าของตรวจยอด พักการบันทึกทุกเครื่อง แล้วจึงกู้คืนข้อมูล</p></li></ol>
  <div class="recovery-upload"><FileJson :size="32" aria-hidden="true"/><div><label for="cloud-recovery-file">เลือกไฟล์สำรองข้อมูลร้าน</label><p>ไฟล์ .json จาก Firebase หรือระบบเดิม · ขนาดไม่เกิน 20 MB</p><input id="cloud-recovery-file" type="file" accept=".json,application/json" :disabled="checking||blocked" @change="inspect"></div></div>
  <p v-if="checking" class="recovery-checking" role="status"><LoaderCircle :size="18" class="animate-spin" aria-hidden="true"/>กำลังตรวจไฟล์และ checksum…</p>
  <p v-if="error" role="alert">{{ error }}</p>
  <div v-if="preview" class="recovery-result" role="status">
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
import {RotateCcw,FileJson,LoaderCircle} from 'lucide-vue-next'
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

<style scoped>
.recovery-panel{display:grid;gap:24px}.recovery-heading{display:flex;align-items:flex-start;gap:14px}.recovery-heading>svg{color:var(--accent-brand);flex-shrink:0;margin-top:3px}.recovery-heading h3{font-size:20px;font-weight:600}.recovery-heading p,.recovery-panel p{font-size:14px;line-height:1.8;color:var(--text-muted)}.recovery-heading p{margin-top:6px}.recovery-flow{display:grid;grid-template-columns:1fr 1fr;list-style:decimal;padding:20px 0 20px 24px;gap:28px;border-block:1px solid var(--border-subtle)}.recovery-flow li{padding-left:6px}.recovery-flow li::marker{color:var(--accent-brand);font-weight:600}.recovery-flow strong{font-size:15px;font-weight:600}.recovery-flow p{margin-top:8px;max-width:65ch}.recovery-upload{display:flex;align-items:flex-start;gap:18px;padding:24px 0}.recovery-upload>svg{flex-shrink:0;color:var(--accent-brand);margin-top:4px}.recovery-upload>div{min-width:0}.recovery-upload label{font-size:16px;font-weight:600;display:block;margin-bottom:6px}.recovery-upload input{display:block;width:100%;max-width:100%;margin-top:16px;font-size:14px;color:var(--text-main)}.recovery-upload input::file-selector-button{padding:11px 16px;margin-right:12px;border:1px solid var(--control-border);border-radius:10px;background:var(--bg-card);color:var(--accent-brand);font:inherit;cursor:pointer}.recovery-upload input:disabled{opacity:.5}.recovery-upload input:focus-visible{outline:2px solid var(--accent-brand);outline-offset:4px;border-radius:8px}.recovery-checking{display:flex;gap:8px;align-items:center}.recovery-result{padding:20px;background:var(--bg-soft);border-radius:12px;display:grid;gap:8px;overflow-wrap:anywhere}.recovery-panel [role=alert]{color:var(--accent-red)}.recovery-panel .settings-disclosure{min-width:0}.recovery-panel pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere}.recovery-panel code{overflow-wrap:anywhere}
@media(max-width:760px){.recovery-flow{grid-template-columns:1fr;gap:20px}.recovery-upload{gap:12px;padding:8px 0}.recovery-upload>svg{display:none}.recovery-heading h3{font-size:18px}}
</style>
