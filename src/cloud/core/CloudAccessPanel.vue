<template>
 <section class="editorial-card access-panel" aria-labelledby="access-title">
  <h3 id="access-title">อีเมลที่อนุญาตให้เข้าร้าน</h3>
  <p>เข้าสู่ระบบด้วย Google ได้เฉพาะอีเมลในรายชื่อนี้ ทุกบัญชีที่ได้รับอนุญาตใช้งานและแก้ไขการตั้งค่าได้เท่ากัน</p>
  <form @submit.prevent="save">
   <label for="shop-allowed-emails">อีเมล Google หนึ่งอีเมลต่อบรรทัด</label>
   <textarea id="shop-allowed-emails" v-model="draft" class="soft-input" rows="6" spellcheck="false" autocapitalize="none" :disabled="busy||blocked" :aria-invalid="!!error" :aria-describedby="error?'access-error':'access-help'"/>
   <p id="access-help">สูงสุด 50 อีเมล · เก็บอีเมลที่กำลังใช้อยู่ในรายชื่อเสมอเพื่อป้องกันเข้าร้านไม่ได้</p>
   <p v-if="changed" role="status">รายชื่อบนเซิร์ฟเวอร์เปลี่ยนแล้ว กรุณาโหลดรายชื่อปัจจุบันก่อนบันทึก</p>
   <div class="access-actions"><Button type="submit" :loading="busy" :disabled="blocked||busy||changed">บันทึกอีเมลที่อนุญาต</Button><Button v-if="changed" variant="secondary" :disabled="busy" @click="reset">โหลดรายชื่อปัจจุบัน</Button></div>
  </form>
  <p v-if="error" id="access-error" role="alert">{{ error }}</p>
  <p v-if="saved" role="status">บันทึกรายชื่อแล้ว บัญชีที่ถูกนำออกจะไม่สามารถอ่านหรือบันทึกข้อมูลร้านต่อได้</p>
 </section>
</template>
<script setup>
import {ref,watch,computed} from 'vue'
import Button from '@/components/ui/Button.vue'
import {allowedEmailMap} from '@/cloud/shopAccess.js'
const props=defineProps({emails:{type:Object,default:()=>({})},account:String,blocked:Boolean,saveEmails:{type:Function,required:true}})
const draft=ref(''),baseline=ref({}),busy=ref(false),error=ref(''),saved=ref(false)
const signature=value=>JSON.stringify(Object.keys(value||{}).sort())
const changed=computed(()=>signature(props.emails)!==signature(baseline.value))
function reset(){baseline.value={...props.emails};draft.value=Object.keys(props.emails).sort().join('\n');error.value='';saved.value=false}
watch(()=>props.emails,()=>{if(!draft.value&&!busy.value)reset()},{immediate:true})
async function save(){
 if(busy.value||props.blocked||changed.value)return
 error.value='';saved.value=false
 let emails
 try{emails=Object.keys(allowedEmailMap(draft.value.split(/[\n,;]+/).filter(v=>v.trim())));if(!emails.includes(props.account?.toLowerCase()))throw new Error('KEEP_CURRENT_EMAIL')}
 catch(e){error.value=e.message==='KEEP_CURRENT_EMAIL'?'กรุณาเก็บอีเมลที่กำลังใช้อยู่ในรายชื่อ':'กรุณาระบุอีเมลให้ถูกต้อง ไม่ซ้ำกัน และไม่เกิน 50 อีเมล';return}
 busy.value=true
 try{const map=await props.saveEmails(emails,baseline.value);baseline.value={...map};draft.value=Object.keys(map).sort().join('\n');saved.value=true}
 catch(e){error.value=e.message==='ACCESS_CONFLICT'?'รายชื่อเปลี่ยนจากเครื่องอื่นแล้ว กรุณาโหลดรายชื่อปัจจุบันและตรวจใหม่':'บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'}
 finally{busy.value=false}
}
</script>
<style scoped>
.access-panel{padding:24px;display:grid;gap:16px}.access-panel h3{font-size:1rem;font-weight:600}.access-panel p{font-size:.875rem;line-height:1.7;color:var(--text-muted)}.access-panel form{display:grid;gap:10px}.access-panel label{font-size:.875rem;font-weight:500}.access-panel textarea{width:100%;padding:12px;line-height:1.8;font-size:.875rem;resize:vertical;min-height:144px}.access-actions{display:flex;flex-wrap:wrap;gap:10px}.access-panel [role=alert]{color:var(--accent-red)}
@media(max-width:767px){.access-panel{padding:16px}}
</style>
