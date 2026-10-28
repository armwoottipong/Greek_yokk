<template>
 <CoreWorkspace v-if="workspaceState" :key="`${workspaceState.user.uid}:${workspaceState.shop.generation}`" :connection="connection" :state="workspaceState" @sign-out="leave" />
 <CloudEntry v-else :state="state" :copy="copy" :emulator="connection.mode==='emulator'" :signing-out="signingOut" @sign-in="session?.signIn()" @reconnect="connect" @sign-out="leave"/>
</template>

<script setup>
import {computed,onMounted,onUnmounted,ref} from 'vue'
import CloudEntry from '@/cloud/CloudEntry.vue'
import CoreWorkspace from '@/cloud/core/CoreWorkspace.vue'
import {getFirebaseClient} from '@/cloud/firebaseClient.js'
import {createShopSession} from '@/cloud/session.js'
import {finishAppStartup} from '@/composables/appStartup.js'
const props=defineProps({connection:{type:Object,required:true}})
const empty=()=>({phase:'connecting',user:null,shop:null,serverReady:false,message:''})
const state=ref(empty()),signingOut=ref(false)
const lastShop=ref(null),lastUid=ref(null)
const workspaceState=computed(()=>state.value.user&&lastShop.value&&state.value.user.uid===lastUid.value?{...state.value,shop:state.value.shop||lastShop.value}:null)
let session=null,epoch=0
const descriptions={
 connecting:{title:'กำลังเปิดร้าน',description:'กำลังตรวจสอบการเข้าสู่ระบบ'},
 signed_out:{title:'Yoggie',description:'เข้าสู่ระบบเพื่อจัดการร้านของคุณ'},
 signing_in:{title:'เข้าสู่ระบบ',description:'ดำเนินการต่อในหน้าต่าง Google'},
 loading:{title:'กำลังเชื่อมต่อร้าน',description:'รอยืนยันข้อมูลล่าสุดจากเซิร์ฟเวอร์ หากอินเทอร์เน็ตหลุดให้เชื่อมต่อแล้วลองใหม่'},
 ready:{title:'เชื่อมต่อร้านแล้ว',description:'เข้าสู่ระบบสำเร็จและตรวจพบข้อมูลร้านบนเซิร์ฟเวอร์'},
 importing:{title:'กำลังเตรียมข้อมูลร้าน',description:'รอการย้ายข้อมูลเสร็จก่อนเริ่มใช้งาน'},
 maintenance:{title:'พักใช้งานชั่วคราว',description:'ร้านกำลังปรับปรุงข้อมูล กรุณากลับมาเชื่อมต่อใหม่'},
 setup_required:{title:'ยังไม่มีข้อมูลร้าน',description:'ต้องเตรียมข้อมูลร้านก่อนเริ่มขาย'},
 access_denied:{title:'บัญชีนี้ยังเข้าร้านไม่ได้',description:'ออกจากระบบแล้วเลือกบัญชี Google ที่ได้รับอนุญาต'},
 error:{title:'เชื่อมต่อร้านไม่ได้',description:'ตรวจอินเทอร์เน็ตแล้วลองอีกครั้ง หากยังเข้าไม่ได้ให้ตรวจการตั้งค่าการเชื่อมต่อร้าน'}
}
const copy=computed(()=>descriptions[state.value.phase]||descriptions.error)
function connect(){
 const token=++epoch
 session?.dispose();session=null;state.value=empty()
 try{
  const {auth,db}=getFirebaseClient({mode:props.connection.mode,config:props.connection.config})
  session=createShopSession({auth,db,shopId:props.connection.shopId,onState:value=>{
   if(token!==epoch)return
   if(value.user?.uid!==lastUid.value){lastShop.value=null;lastUid.value=value.user?.uid||null}
   if(value.phase==='access_denied')lastShop.value=null
   if(value.serverReady&&value.shop?.catalog&&value.shop?.materialIds)lastShop.value=value.shop
   // Keep an existing workspace/cart mounted during transient cache/offline states.
   // Maintenance/import/generation changes still block all command writes.
   state.value=value
  }})
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
