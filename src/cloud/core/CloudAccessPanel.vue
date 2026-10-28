<template>
 <section id="settings-access" class="editorial-card access-panel" aria-labelledby="access-title">
  <header><h3 id="access-title">ผู้ใช้งานร้าน</h3><p>อนุญาตให้เข้าร้านด้วยบัญชี Google กำหนดสิทธิ์ตามหน้าที่ของแต่ละบัญชี</p></header>
  <div class="access-current"><span class="access-avatar" aria-hidden="true">{{ account?.slice(0,1).toUpperCase() }}</span><div><small>บัญชีที่กำลังใช้งาน</small><strong>{{ account }}</strong></div></div>
  <form class="access-add-form" @submit.prevent="addEmail" novalidate>
   <label for="shop-add-email">เพิ่มผู้ใช้งาน</label>
   <div class="access-add-controls"><input id="shop-add-email" v-model="newEmail" type="email" autocomplete="off" spellcheck="false" autocapitalize="none" placeholder="name@gmail.com" :disabled="busy||blocked||changed" :aria-invalid="!!error" aria-describedby="access-help access-error" @input="error='';saved=false"><select v-model="newRole" aria-label="สิทธิ์ของผู้ใช้ใหม่" :disabled="busy||blocked||changed"><option v-for="role in ROLES" :key="role" :value="role">{{ ROLE_LABELS[role] }}</option></select><Button type="submit" variant="secondary" :disabled="busy||blocked||changed||!newEmail.trim()||draft.length>=50"><Plus :size="16"/>เพิ่มอีเมล</Button></div>
   <p id="access-help">เมื่อบันทึกรายชื่อ ผู้ใช้เข้าได้ทันทีด้วย Google บัญชีนั้น อีเมลแจ้งสิทธิ์มีลิงก์เข้าระบบ ไม่ต้องกดยอมรับ</p>
  </form>
  <div class="access-list-heading"><h4>อีเมลที่อนุญาต</h4><span>{{ draft.length }} / 50 บัญชี</span></div>
  <div class="access-list-region" role="region" aria-label="รายชื่ออีเมลที่อนุญาต" tabindex="0"><ul class="access-email-list"><li v-for="email in draft" :key="email"><div class="access-email"><Mail :size="18" aria-hidden="true"/><span>{{ email }}</span><small v-if="email===account?.toLowerCase()">คุณ</small><small v-else-if="!baseline[email]">เพิ่มใหม่</small><small v-else-if="invitationStatus(email)">{{ invitationStatus(email) }}</small></div><select v-model="draftRoles[email]" :aria-label="`สิทธิ์ ${email}`" :disabled="busy||blocked||changed||email===OWNER_EMAIL||email===account?.toLowerCase()" @change="saved=false"><option v-for="role in ROLES" :key="role" :value="role">{{ ROLE_LABELS[role] }}</option></select><button type="button" class="access-remove" :aria-label="`นำ ${email} ออก`" :disabled="busy||blocked||changed||(email===OWNER_EMAIL||email===account?.toLowerCase())" :title="email===OWNER_EMAIL?'บัญชีเจ้าของร้าน ไม่สามารถนำออกได้':email===account?.toLowerCase()?'เก็บบัญชีที่กำลังใช้งานไว้เสมอ':'นำออกจากรายชื่อ'" @click="removeEmail(email)"><Trash2 :size="17"/></button></li></ul></div>
  <p class="access-self-note">Viewer ดูได้เฉพาะ Dashboard · Manager ใช้งานได้ยกเว้น Settings · Admin จัดการได้ทั้งหมด บัญชีเจ้าของและบัญชีที่กำลังใช้จะถูกเก็บไว้เสมอ</p>
  <p v-if="changed" role="status">รายชื่อบนเซิร์ฟเวอร์เปลี่ยนแล้ว กรุณาโหลดรายชื่อปัจจุบันก่อนบันทึก</p>
  <p id="access-error" :role="error?'alert':undefined">{{ error }}</p>
  <p v-if="saved" role="status">บันทึกผู้ใช้และสิทธิ์แล้ว · ผู้ใช้เข้าได้ทันที ไม่ต้องรออีเมล บัญชีที่นำออกจะเข้าร้านไม่ได้</p>
  <footer class="access-actions"><span v-if="dirty" class="access-draft-note">มีการแก้ไขที่ยังไม่บันทึก</span><div><Button :loading="busy" :disabled="blocked||busy||changed||!dirty" @click="save">บันทึกรายชื่อ</Button><Button v-if="dirty||changed" variant="secondary" :disabled="busy" @click="reset">{{ changed ? 'โหลดรายชื่อปัจจุบัน' : 'ยกเลิกการแก้ไข' }}</Button></div></footer>
 </section>
</template>
<script setup>
import {ref,watch,computed} from 'vue'
import {Plus,Mail,Trash2} from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import {OWNER_EMAIL,ROLES,ROLE_LABELS,roleMap} from '@/cloud/roles.js'
import {allowedEmailMap} from '@/cloud/shopAccess.js'
const props=defineProps({emails:{type:Object,default:()=>({})},roles:{type:Object,default:()=>({})},invitations:{type:Array,default:()=>[]},account:String,blocked:Boolean,saveEmails:{type:Function,required:true}})
const draft=ref([]),draftRoles=ref({}),baselineRoles=ref({}),newRole=ref('viewer'),newEmail=ref(''),baseline=ref({}),busy=ref(false),error=ref(''),saved=ref(false)
const signature=value=>JSON.stringify(Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b)))
const draftMap=computed(()=>Object.fromEntries(draft.value.map(e=>[e,true])))
function invitationStatus(email){return {pending:'รอส่งอีเมลแจ้งสิทธิ์',processing:'กำลังส่งอีเมลแจ้งสิทธิ์',sent:'ส่งอีเมลแจ้งสิทธิ์แล้ว',unknown:'ต้องตรวจผลการส่ง',cancelled:'ยกเลิกการส่งอีเมล'}[props.invitations.find(row=>row.email===email)?.status]||''}
const dirty=computed(()=>signature(draftMap.value)!==signature(baseline.value)||signature(roleMap(draftMap.value,draftRoles.value))!==signature(roleMap(baseline.value,baselineRoles.value)))
const changed=computed(()=>signature(props.emails)!==signature(baseline.value)||signature(props.roles)!==signature(baselineRoles.value))
function reset(){baseline.value={...props.emails};draft.value=Object.keys(props.emails).sort();baselineRoles.value={...props.roles};draftRoles.value=roleMap(props.emails,props.roles);newEmail.value='';error.value='';saved.value=false}
watch(()=>props.emails,(_,old)=>{if(!old)reset()},{immediate:true})
function addEmail(){
 if(busy.value||props.blocked||changed.value)return
 error.value='';saved.value=false
 const email=newEmail.value.trim().toLowerCase()
 if(draft.value.includes(email)){error.value='อีเมลนี้อยู่ในรายชื่อแล้ว';return}
 try{allowedEmailMap([...draft.value,email])}catch{error.value='กรุณาระบุอีเมล Google ให้ถูกต้อง และไม่เกิน 50 บัญชี';return}
 draft.value=[...draft.value,email].sort();draftRoles.value={...draftRoles.value,[email]:email===OWNER_EMAIL?'admin':newRole.value};newEmail.value=''
}
function removeEmail(email){if(busy.value||props.blocked||changed.value||(email===OWNER_EMAIL||email===props.account?.toLowerCase()))return;draft.value=draft.value.filter(e=>e!==email);saved.value=false;error.value=''}
async function save(){
 if(busy.value||props.blocked||changed.value||!dirty.value)return
 error.value='';saved.value=false
 if(newEmail.value.trim()){error.value='กรุณากดเพิ่มอีเมลที่กรอกไว้ก่อนบันทึกรายชื่อ';return}
 let emails
 try{emails=Object.keys(allowedEmailMap(draft.value));if(!emails.includes(props.account?.toLowerCase()))throw new Error('KEEP_CURRENT_EMAIL')}
 catch(e){error.value=e.message==='KEEP_CURRENT_EMAIL'?'กรุณาเก็บอีเมลที่กำลังใช้อยู่ในรายชื่อ':'กรุณาระบุอีเมลให้ถูกต้อง ไม่ซ้ำกัน และไม่เกิน 50 อีเมล';return}
 busy.value=true
 try{const roles=roleMap(draftMap.value,draftRoles.value);const map=await props.saveEmails(emails,baseline.value,roles,baselineRoles.value);baseline.value={...map};baselineRoles.value={...roles};draftRoles.value={...roles};draft.value=Object.keys(map).sort();saved.value=true}
 catch(e){error.value=e.message==='ACCESS_CONFLICT'?'รายชื่อเปลี่ยนจากเครื่องอื่นแล้ว กรุณาโหลดรายชื่อปัจจุบันและตรวจใหม่':'บันทึกไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'}
 finally{busy.value=false}
}
</script>
<style scoped>
.access-panel{display:grid;gap:16px}.access-panel h3{font-size:20px;font-weight:600}.access-panel p{font-size:14px;line-height:1.75;color:var(--text-muted)}.access-panel header p{margin-top:8px;max-width:70ch}.access-panel [role=alert]{color:var(--accent-red)}.access-panel #access-error:empty{display:none}
.access-current{display:flex;align-items:center;gap:12px;padding:16px 0;border-bottom:1px solid var(--border-subtle)}.access-current>div{display:grid;gap:4px;min-width:0}.access-current strong{font-size:14px;font-weight:500;overflow-wrap:anywhere}.access-current small{font-size:12px;color:var(--text-muted)}.access-avatar{display:grid;place-items:center;width:40px;height:40px;flex-shrink:0;background:var(--accent-soft);color:var(--accent-brand);border-radius:50%;font-weight:600}
.access-add-form{display:grid;gap:10px;padding-block:8px}.access-add-form label{font-size:14px;font-weight:600}.access-add-controls{display:flex;gap:12px;max-width:680px}.access-add-controls input{flex:1;width:100%;padding:12px 14px;border-radius:10px;font-size:14px}.access-add-controls button{flex-shrink:0}.access-panel select{min-width:0;max-width:220px;padding:10px;border:1px solid var(--control-border);border-radius:10px;background:var(--bg-card);font-size:13px}.access-add-controls{max-width:900px}.access-add-controls select{flex:0 1 200px}.access-list-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.access-list-heading h4{font-size:14px;font-weight:600}.access-list-heading>span{font-size:13px;color:var(--text-muted);font-variant-numeric:tabular-nums}.access-list-region{max-height:360px;overflow:auto;scrollbar-color:var(--accent-border) var(--bg-soft);scrollbar-width:thin}.access-list-region:focus-visible{outline:2px solid var(--accent-brand);outline-offset:3px;border-radius:6px}.access-email-list{list-style:none;padding:0}.access-email-list li{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0;border-bottom:1px solid var(--border-subtle)}.access-email{flex:1;display:flex;align-items:center;gap:12px;min-width:0;font-size:14px}.access-email svg{flex-shrink:0;color:var(--text-muted)}.access-email>span{overflow-wrap:anywhere;min-width:0}.access-email small{padding:3px 8px;border-radius:6px;background:var(--bg-soft);color:var(--text-muted);white-space:nowrap;font-size:12px}.access-remove{display:grid;place-items:center;flex-shrink:0;width:44px;height:44px;border-radius:10px;color:var(--accent-brand)}.access-remove:hover:enabled{background:var(--accent-soft)}.access-remove:disabled{opacity:.35}.access-actions{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-top:1px solid var(--border-subtle);padding-top:20px;margin-top:4px}.access-actions>div{display:flex;flex-wrap:wrap;gap:10px;margin-left:auto}.access-draft-note{font-size:13px;color:var(--accent-brand)}
@media(max-width:600px){.access-add-controls{flex-direction:column;gap:8px}.access-actions>div{width:100%;margin:0}.access-actions button{flex:1 1 auto}.access-email{flex-wrap:wrap;gap:6px 8px}.access-email svg{display:none}.access-email>span{flex-basis:100%}.access-add-controls select{flex:auto;max-width:none}.access-email-list li{flex-wrap:wrap}.access-email{flex-basis:calc(100% - 60px)}.access-email-list li>select{order:3;max-width:none;width:100%}}
</style>
