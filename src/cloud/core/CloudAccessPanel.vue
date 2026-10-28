<template>
 <section id="settings-access" class="editorial-card access-panel" aria-labelledby="access-title">
  <h3 id="access-title">อีเมลที่อนุญาตให้เข้าร้าน</h3>
  <p>เข้าสู่ระบบด้วย Google ได้เฉพาะอีเมลในรายชื่อนี้ ทุกบัญชีที่ได้รับอนุญาตใช้งานและแก้ไขการตั้งค่าได้เท่ากัน</p>
  <div class="access-current"><span class="access-avatar" aria-hidden="true">{{ account?.slice(0,1).toUpperCase() }}</span><div><small>บัญชีที่กำลังใช้งาน</small><strong>{{ account }}</strong></div></div>
  <div class="access-list-heading"><h4>รายชื่อที่บันทึกแล้ว</h4><span>{{ Object.keys(emails).length }} / 50 บัญชี</span></div>
  <div class="access-list-region" role="region" aria-label="รายชื่ออีเมลที่บันทึกแล้ว" tabindex="0"><ul class="access-email-list"><li v-for="email in Object.keys(emails).sort()" :key="email"><span>{{ email }}</span><small v-if="email===account?.toLowerCase()">คุณ</small></li></ul></div>
  <form @submit.prevent="save" @input="saved=false">
   <label for="shop-allowed-emails">แก้ไขรายชื่ออีเมล Google</label>
   <textarea id="shop-allowed-emails" v-model="draft" class="soft-input" rows="3" spellcheck="false" autocapitalize="none" :disabled="busy||blocked" :aria-invalid="!!error" :aria-describedby="error?'access-error':'access-help'"/>
   <p id="access-help">เพิ่มหรือลบอีเมลในช่องนี้ หนึ่งอีเมลต่อบรรทัด · ต้องเก็บบัญชีที่กำลังใช้งานไว้</p>
   <p v-if="changed" role="status">รายชื่อบนเซิร์ฟเวอร์เปลี่ยนแล้ว กรุณาโหลดรายชื่อปัจจุบันก่อนบันทึก</p>
   <div class="access-actions"><Button type="submit" :loading="busy" :disabled="blocked||busy||changed">บันทึกอีเมลที่อนุญาต</Button><Button v-if="dirty||changed" variant="secondary" :disabled="busy" @click="reset">{{ changed ? 'โหลดรายชื่อปัจจุบัน' : 'ยกเลิกการแก้ไข' }}</Button></div>
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
const dirty=computed(()=>draft.value!==Object.keys(baseline.value).sort().join('\n'))
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
.access-panel{padding:28px;display:grid;gap:16px}.access-panel h3{font-size:20px;font-weight:600}.access-panel p{font-size:14px;line-height:1.75;color:var(--text-muted)}.access-panel form{display:grid;gap:12px;margin-top:8px}.access-panel label{font-size:14px;font-weight:600}.access-panel textarea{width:100%;padding:12px;line-height:1.8;font-size:14px;resize:vertical;min-height:104px;caret-color:var(--accent-brand)}.access-actions{display:flex;flex-wrap:wrap;gap:10px;padding-top:8px}.access-panel [role=alert]{color:var(--accent-red)}
.access-current{display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid var(--border-subtle)}.access-current>div{display:grid;gap:4px;min-width:0}.access-current strong{font-size:14px;font-weight:500;overflow-wrap:anywhere}.access-current small{font-size:12px;color:var(--text-muted)}.access-avatar{display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;background:var(--accent-soft);color:var(--accent-brand);border-radius:50%;font-weight:600}.access-list-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:8px}.access-list-heading h4{font-size:14px;font-weight:600}.access-list-heading>span{font-size:12px;color:var(--text-muted);font-variant-numeric:tabular-nums}.access-list-region{max-height:240px;overflow:auto;scrollbar-color:var(--accent-border) var(--bg-soft);scrollbar-width:thin}.access-list-region:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px;border-radius:6px}.access-email-list{display:grid;list-style:none;padding:0}.access-email-list li{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--border-subtle);font-size:14px;overflow-wrap:anywhere}.access-email-list li>span{min-width:0}.access-email-list small{align-self:start;padding:2px 8px;border-radius:6px;background:var(--bg-soft);color:var(--text-muted);white-space:nowrap}
@media(max-width:767px){.access-panel{padding:20px}.access-panel h3{font-size:18px}.access-actions>*{flex:1 1 auto}}
</style>
