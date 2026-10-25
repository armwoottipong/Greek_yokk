<template>
 <main class="cloud-entry" aria-labelledby="cloud-title">
  <section class="cloud-entry-panel">
   <img :src="mascot" width="112" height="112" alt="" class="cloud-entry-mascot" />
   <p v-if="connection.mode==='emulator'" class="cloud-entry-environment">ทดสอบบนเครื่องนี้</p>
   <h1 id="cloud-title">{{ copy.title }}</h1>
   <p class="cloud-entry-description" role="status" aria-live="polite">{{ copy.description }}</p>
   <p v-if="state.user" class="cloud-entry-account">{{ state.user.email || state.user.displayName || 'เข้าสู่ระบบแล้ว' }}</p>
   <p v-if="state.message" role="alert" class="cloud-entry-error">{{ state.message }}</p>
   <div class="cloud-entry-actions">
    <Button v-if="!state.user && ['signed_out','signing_in'].includes(state.phase)" data-sign-in :loading="state.phase==='signing_in'" @click="session?.signIn()">เข้าสู่ระบบด้วย Google</Button>
    <Button v-if="['loading','error','setup_required','maintenance','importing'].includes(state.phase)" data-reconnect variant="secondary" @click="connect">ลองเชื่อมต่อใหม่</Button>
    <Button v-if="state.user" data-sign-out variant="secondary" :loading="signingOut" @click="leave">ออกจากระบบ</Button>
   </div>
   <p v-if="state.phase==='ready'" class="cloud-entry-note">ยังไม่เปิดขายระหว่างเตรียมข้อมูลและระบบบันทึกของร้าน</p>
   <p class="cloud-entry-note">ระหว่างทดสอบ คุณยังทำงานในระบบเดิมได้</p>
   <a :href="localUrl" data-local-link class="cloud-local-link">เปิดระบบเดิมบนเครื่องนี้</a>
  </section>
 </main>
</template>

<script setup>
import {computed,onMounted,onUnmounted,ref} from 'vue'
import Button from '@/components/ui/Button.vue'
import {getFirebaseClient} from '@/cloud/firebaseClient.js'
import {createShopSession} from '@/cloud/session.js'
import {finishAppStartup} from '@/composables/appStartup.js'
const props=defineProps({connection:{type:Object,required:true}})
const mascot=`${import.meta.env.BASE_URL}brand/content-mascot.svg`
const localUrl=`${import.meta.env.BASE_URL}local.html`
const empty=()=>({phase:'connecting',user:null,shop:null,serverReady:false,message:''})
const state=ref(empty()),signingOut=ref(false)
let session=null,epoch=0
const descriptions={
 connecting:{title:'กำลังเปิดร้าน',description:'กำลังตรวจสอบการเข้าสู่ระบบ'},
 signed_out:{title:'เข้าร้าน Greek Yogg',description:'เข้าสู่ระบบเพื่อใช้ข้อมูลร้านร่วมกันทุกเครื่อง'},
 signing_in:{title:'เข้าสู่ระบบ',description:'ดำเนินการต่อในหน้าต่าง Google'},
 loading:{title:'กำลังเชื่อมต่อร้าน',description:'รอยืนยันข้อมูลล่าสุดจากเซิร์ฟเวอร์ หากอินเทอร์เน็ตหลุดให้เชื่อมต่อแล้วลองใหม่'},
 ready:{title:'เชื่อมต่อร้านแล้ว',description:'เข้าสู่ระบบสำเร็จและตรวจพบข้อมูลร้านบนเซิร์ฟเวอร์'},
 importing:{title:'กำลังเตรียมข้อมูลร้าน',description:'รอการย้ายข้อมูลเสร็จก่อนเริ่มใช้งาน'},
 maintenance:{title:'พักใช้งานชั่วคราว',description:'ร้านกำลังปรับปรุงข้อมูล กรุณากลับมาเชื่อมต่อใหม่'},
 setup_required:{title:'ยังไม่มีข้อมูลร้าน',description:'ต้องเตรียมข้อมูลร้านก่อนเริ่มขาย'},
 error:{title:'เชื่อมต่อร้านไม่ได้',description:'ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง หากยังเข้าไม่ได้ให้ตรวจการตั้งค่าการเชื่อมต่อร้าน'}
}
const copy=computed(()=>descriptions[state.value.phase]||descriptions.error)
function connect(){
 const token=++epoch
 session?.dispose();session=null;state.value=empty()
 try{
  const {auth,db}=getFirebaseClient({mode:props.connection.mode,config:props.connection.config})
  session=createShopSession({auth,db,shopId:props.connection.shopId,onState:value=>{if(token===epoch)state.value=value}})
  session.start()
 }catch{state.value={...empty(),phase:'error',message:'เปิดการเชื่อมต่อไม่ได้ กรุณาตรวจการตั้งค่าร้านแล้วลองใหม่'}}
}
async function leave(){
 if(signingOut.value)return
 signingOut.value=true
 try{
  const result=await session?.signOut()
  if(result?.ok===false)state.value={...state.value,phase:'error',message:'ออกจากระบบไม่สำเร็จ กรุณาลองเชื่อมต่อใหม่'}
 }finally{signingOut.value=false}
}
onMounted(()=>{connect();finishAppStartup()})
onUnmounted(()=>{epoch++;session?.dispose();session=null})
</script>

<style scoped>
.cloud-entry{width:100%;min-width:0;height:100%;overflow:auto;display:grid;place-items:safe center;padding:32px 20px;background:var(--bg-primary);color:var(--text-main)}
.cloud-entry-panel{width:min(100%,440px);text-align:center}
.cloud-entry-mascot{display:block;object-fit:contain;margin:0 auto 24px}
h1{font-size:clamp(1.5rem,5vw,2rem);font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.cloud-entry-description{margin:12px auto 0;max-width:35ch;color:var(--text-muted);font-size:1rem;line-height:1.8}
.cloud-entry-account{margin-top:16px;font-size:.875rem;overflow-wrap:anywhere}
.cloud-entry-actions{display:grid;gap:12px;margin-top:28px}
.cloud-entry-actions :deep(button){min-height:48px;width:100%}
.cloud-entry-error{margin-top:20px;padding:14px;border:1px solid var(--accent-red);border-radius:12px;color:var(--accent-red);line-height:1.7}
.cloud-entry-note{margin-top:20px;font-size:.875rem;line-height:1.7;color:var(--text-muted)}
.cloud-entry-environment{margin-bottom:12px;font-size:.875rem;color:var(--text-muted)}
.cloud-local-link{display:inline-flex;align-items:center;min-height:44px;margin-top:4px;font-size:.875rem;color:var(--accent-brand);text-decoration:underline;text-underline-offset:3px}
</style>
